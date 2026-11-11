# Stripe Integration Guide for Weaver

This guide walks you through integrating Stripe payments into your Weaver application. We'll set up subscriptions and one-time payments.

## Overview

We'll integrate Stripe to handle:
- **Subscription payments** (monthly/yearly plans)
- **One-time payments** (if needed)
- **Payment webhooks** (for handling subscription updates)
- **Customer portal** (for managing subscriptions)

## Step 1: Create Stripe Account & Get API Keys

### 1.1 Create Stripe Account
1. Go to https://dashboard.stripe.com/register
2. Sign up for a Stripe account
3. Complete account verification

### 1.2 Get API Keys
1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy your **Publishable key** (starts with `pk_test_...`)
3. Copy your **Secret key** (starts with `sk_test_...`) - Click "Reveal test key"
4. Save these - you'll need them for environment variables

### 1.3 Get Webhook Secret (for production)
1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. Enter your webhook URL: `https://weaver-kuwd.onrender.com/api/stripe/webhook`
4. Select events to listen to:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Webhook signing secret** (starts with `whsec_...`)

## Step 2: Install Stripe SDK

Run this command in your project directory:

```bash
npm install stripe
```

## Step 3: Update Environment Variables

Add these to your `.env` file:

```env
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_...your_key_here
STRIPE_SECRET_KEY=sk_test_...your_key_here
STRIPE_WEBHOOK_SECRET=whsec_...your_webhook_secret_here
```

**For Render (Production):**
1. Go to Render Dashboard → Your service → Environment
2. Add these environment variables:
   - `STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`

## Step 4: Update Database Schema

We need to add subscription fields to the users table.

### 4.1 Update `db/schema.js`

Add these fields to the `users` table:

```javascript
stripeCustomerId: text('stripe_customer_id'), // Stripe customer ID
stripeSubscriptionId: text('stripe_subscription_id'), // Stripe subscription ID
subscriptionStatus: text('subscription_status').default('free'), // free, active, canceled, past_due
subscriptionPlan: text('subscription_plan'), // monthly, yearly, etc.
subscriptionCurrentPeriodEnd: timestamp('subscription_current_period_end'),
```

### 4.2 Run Database Migration

```bash
npm run db:generate
npm run db:push
```

Or update your existing migration.

## Step 5: Create Stripe Backend Routes

### 5.1 Create `routes/stripe.js`

Create a new file `routes/stripe.js`:

```javascript
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const dbAPI = require('../db/api');

// Create checkout session for subscription
router.post('/create-checkout-session', async (req, res) => {
    try {
        const { userId, priceId } = req.body;
        
        // Get user email
        const user = await dbAPI.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Create or get Stripe customer
        let customerId = user.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { userId: userId }
            });
            customerId = customer.id;
            // Save customer ID to database
            // You'll need to add this function to db/api.js
            // await dbAPI.updateUserStripeCustomerId(userId, customerId);
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId, // e.g., 'price_1234' - create in Stripe dashboard
                    quantity: 1,
                },
            ],
            success_url: `${process.env.WEAVER_URL || 'https://weaver-kuwd.onrender.com'}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.WEAVER_URL || 'https://weaver-kuwd.onrender.com'}/cancel`,
            metadata: {
                userId: userId
            }
        });

        res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
        console.error('Stripe checkout error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create customer portal session (for managing subscriptions)
router.post('/create-portal-session', async (req, res) => {
    try {
        const { userId } = req.body;
        
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
    switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
            const subscription = event.data.object;
            // Update user subscription in database
            // await dbAPI.updateUserSubscription(subscription.customer, subscription);
            break;
            
        case 'customer.subscription.deleted':
            // Handle subscription cancellation
            // await dbAPI.cancelUserSubscription(subscription.customer);
            break;
            
        case 'invoice.payment_succeeded':
            // Handle successful payment
            break;
            
        case 'invoice.payment_failed':
            // Handle failed payment
            break;
            
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
});

module.exports = router;
```

### 5.2 Update `server.js`

Add the Stripe routes:

```javascript
// At the top with other requires
const stripeRoutes = require('./routes/stripe');

// After other middleware
app.use('/api/stripe', stripeRoutes);
```

## Step 6: Create Products & Prices in Stripe Dashboard

### 6.1 Create Products
1. Go to https://dashboard.stripe.com/test/products
2. Click "Add product"
3. Create products (e.g., "Weaver Pro Monthly", "Weaver Pro Yearly")
4. Note the **Price IDs** (start with `price_...`) - you'll need these

### 6.2 Example Products:
- **Weaver Pro Monthly**: $9.99/month
- **Weaver Pro Yearly**: $99.99/year (save ~17%)

## Step 7: Update Database API Functions

Add these functions to `db/api.js`:

```javascript
// Update user's Stripe customer ID
async function updateUserStripeCustomerId(userId, customerId) {
    await db.update(users)
        .set({ stripeCustomerId: customerId })
        .where(eq(users.id, userId));
}

// Update user subscription
async function updateUserSubscription(userId, subscriptionData) {
    await db.update(users)
        .set({
            stripeSubscriptionId: subscriptionData.id,
            subscriptionStatus: subscriptionData.status,
            subscriptionPlan: subscriptionData.items.data[0].price.nickname || 'monthly',
            subscriptionCurrentPeriodEnd: new Date(subscriptionData.current_period_end * 1000)
        })
        .where(eq(users.id, userId));
}

// Cancel user subscription
async function cancelUserSubscription(userId) {
    await db.update(users)
        .set({
            subscriptionStatus: 'canceled',
            stripeSubscriptionId: null
        })
        .where(eq(users.id, userId));
}
```

## Step 8: Frontend Integration

### 8.1 Add Stripe.js to HTML

Add to `index.html` in the `<head>`:

```html
<script src="https://js.stripe.com/v3/"></script>
```

### 8.2 Create Payment UI

Add subscription button/modal to your HTML (e.g., in the profile menu or a pricing section).

### 8.3 Create Payment Handler in `script.js`

```javascript
// Initialize Stripe
const stripe = Stripe('pk_test_...your_publishable_key'); // Or use env variable

// Handle subscription checkout
async function handleSubscription(priceId) {
    try {
        const user = getCurrentUser();
        if (!user) {
            alert('Please log in to subscribe');
            return;
        }

        // Create checkout session
        const response = await fetch('/api/stripe/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user.id,
                priceId: priceId
            })
        });

        const { url } = await response.json();
        
        // Redirect to Stripe Checkout
        window.location.href = url;
    } catch (error) {
        console.error('Payment error:', error);
        alert('Error processing payment. Please try again.');
    }
}

// Handle customer portal (manage subscription)
async function openCustomerPortal() {
    try {
        const user = getCurrentUser();
        if (!user) {
            alert('Please log in');
            return;
        }

        const response = await fetch('/api/stripe/create-portal-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id })
        });

        const { url } = await response.json();
        window.location.href = url;
    } catch (error) {
        console.error('Portal error:', error);
        alert('Error opening customer portal. Please try again.');
    }
}
```

## Step 9: Testing

### 9.1 Test Cards (Stripe Test Mode)
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- Use any future expiry date and any 3-digit CVC

### 9.2 Test Webhooks Locally
Use Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Step 10: Production Checklist

- [ ] Switch to **live mode** in Stripe dashboard
- [ ] Update environment variables with **live keys**
- [ ] Update webhook endpoint URL to production URL
- [ ] Test checkout flow end-to-end
- [ ] Test subscription cancellation
- [ ] Test webhook handling
- [ ] Set up email notifications in Stripe dashboard
- [ ] Configure customer portal settings

## Next Steps

1. **Create pricing page** - Display subscription options
2. **Add subscription checks** - Gate features based on subscription status
3. **Handle subscription lifecycle** - Update UI based on subscription status
4. **Add usage limits** - For free vs paid tiers
5. **Email notifications** - Send receipts and subscription updates

## Common Issues

### Webhook Not Working
- Make sure webhook URL is publicly accessible
- Verify webhook secret matches
- Check webhook endpoint is using `express.raw()` middleware

### Customer Portal Not Showing
- Ensure billing portal is configured in Stripe dashboard
- Make sure user has an active subscription

### Checkout Session Fails
- Verify price IDs are correct
- Check API keys are valid
- Ensure user ID is being passed correctly

## Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)

## Need Help?

If you encounter issues, check:
1. Stripe dashboard logs
2. Server console logs
3. Browser console for frontend errors
4. Webhook delivery logs in Stripe dashboard
