const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const dbAPI = require('../db/api');

// Create checkout session for subscription
// This endpoint needs JSON parsing, so we add it here
router.post('/create-checkout-session', express.json(), async (req, res) => {
    try {
        console.log('Received checkout request:', req.body);
        let { userId, priceId } = req.body;
        
        if (!userId || !priceId) {
            console.error('Missing required fields:', { userId: !!userId, priceId: !!priceId });
            return res.status(400).json({ error: 'userId and priceId are required' });
        }
        
        // Ensure userId is a string (important for database queries)
        userId = String(userId);
        
        // Check if Stripe is configured
        if (!process.env.STRIPE_SECRET_KEY) {
            console.error('STRIPE_SECRET_KEY not configured');
            return res.status(500).json({ error: 'Stripe is not configured. Please check server settings.' });
        }
        
        // Get user email
        console.log('Fetching user:', userId, '(type:', typeof userId, ')');
        let user;
        try {
            user = await dbAPI.getUserById(userId);
        } catch (dbError) {
            console.error('Database error fetching user:', dbError);
            // Check if it's a schema/column error
            if (dbError.message && dbError.message.includes('column') && dbError.message.includes('does not exist')) {
                return res.status(500).json({ 
                    error: 'Database schema error. Please run database migrations on the production server.',
                    details: 'The Stripe columns may not exist in the database. Run: npm run db:push'
                });
            }
            throw dbError; // Re-throw other errors
        }
        
        if (!user) {
            console.error('User not found:', userId);
            return res.status(404).json({ error: 'User not found. Please log in and try again.' });
        }
        
        console.log('User found:', user.email);

        // Create or get Stripe customer
        let customerId = user.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { userId: userId }
            });
            customerId = customer.id;
            // Save customer ID to database
            await dbAPI.updateUserStripeCustomerId(userId, customerId);
        }

        // Create checkout session
        console.log('Creating Stripe checkout session with:', { customerId, priceId });
        
        // First verify the price exists
        try {
            const price = await stripe.prices.retrieve(priceId);
            console.log('Price verified:', price.id, '- Amount:', price.unit_amount, price.currency);
        } catch (priceError) {
            console.error('Price verification failed:', priceError.message);
            return res.status(400).json({ 
                error: `Invalid Price ID: ${priceError.message}. Please check that the Price ID exists in your Stripe account (test mode).` 
            });
        }
        
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: `${process.env.WEAVER_URL || 'http://localhost:3000'}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.WEAVER_URL || 'http://localhost:3000'}/cancel.html`,
            metadata: {
                userId: userId
            }
        });

        console.log('Checkout session created successfully:', session.id);
        res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
        console.error('Stripe checkout error:', error);
        console.error('Error details:', {
            message: error.message,
            type: error.type,
            code: error.code,
            statusCode: error.statusCode
        });
        res.status(500).json({ 
            error: error.message || 'Failed to create checkout session',
            details: error.type || 'Unknown error'
        });
    }
});

// Create customer portal session (for managing subscriptions)
// This endpoint needs JSON parsing
router.post('/create-portal-session', express.json(), async (req, res) => {
    try {
        let { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        
        // Ensure userId is a string
        userId = String(userId);
        
        const user = await dbAPI.getUserById(userId);
        if (!user || !user.stripeCustomerId) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${process.env.WEAVER_URL || 'https://weaver-kuwd.onrender.com'}/settings`,
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Stripe portal error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Webhook endpoint (for handling subscription events)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                const subscription = event.data.object;
                // Update user subscription in database
                await dbAPI.updateUserSubscription(subscription.customer, subscription);
                console.log(`Subscription ${subscription.id} ${event.type} for customer ${subscription.customer}`);
                break;
                
            case 'customer.subscription.deleted':
                const deletedSubscription = event.data.object;
                // Handle subscription cancellation
                await dbAPI.cancelUserSubscription(deletedSubscription.customer);
                console.log(`Subscription ${deletedSubscription.id} deleted for customer ${deletedSubscription.customer}`);
                break;
                
            case 'invoice.payment_succeeded':
                const invoice = event.data.object;
                console.log(`Payment succeeded for invoice ${invoice.id}`);
                // You can add additional logic here, like sending confirmation emails
                break;
                
            case 'invoice.payment_failed':
                const failedInvoice = event.data.object;
                console.log(`Payment failed for invoice ${failedInvoice.id}`);
                // You can add logic here to notify the user or update their account
                break;
                
            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Error processing webhook event:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

module.exports = router;
