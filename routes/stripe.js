const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_not_configured');
const dbAPI = require('../db/api');

// All Stripe routes except /pricing and /webhook require a signed-in user (server.js);
// they always act for req.user, never for an id sent by the browser.

function appUrl() { return process.env.WEAVER_URL || 'http://localhost:3000'; }
function configured() { return !!process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('not_configured') && !process.env.STRIPE_SECRET_KEY.includes('demo_placeholder'); }

// Pro prices. The browser sends a plan key; only these prices can be bought.
// (Previously any price id from the browser was accepted, so a cheaper price in the
// same Stripe account could be used to unlock Pro.)
const PRO_PRICES = {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_1StXttQZZ2GMzWg9cj6s4DXD',
    quarterly: process.env.STRIPE_PRICE_PRO_QUARTERLY || null,
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL || 'price_1StXtnQZZ2GMzWg9YeTAGbIq',
};
// Older clients sent these ids directly; map them to plan keys.
const LEGACY_IDS = { price_1StXttQZZ2GMzWg9cj6s4DXD: 'monthly', price_1StXtnQZZ2GMzWg9YeTAGbIq: 'annual' };

function planFromRequest(body) {
    const b = body || {};
    if (PRO_PRICES[b.plan]) return b.plan;
    if (b.priceId && LEGACY_IDS[b.priceId]) return LEGACY_IDS[b.priceId];
    return null;
}

router.post('/create-checkout-session', express.json(), async (req, res) => {
    try {
        if (!configured()) return res.status(503).json({ error: 'Payments are not set up on this server.' });
        const plan = planFromRequest(req.body);
        if (!plan) return res.status(400).json({ error: 'Choose monthly, quarterly or annual.' });
        const user = await dbAPI.getUserById(req.user.id);
        let customerId = user.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create({ email: user.email, metadata: { userId: user.id } });
            customerId = customer.id;
            await dbAPI.updateUserStripeCustomerId(user.id, customerId);
        }
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            allow_promotion_codes: true,
            line_items: [{ price: PRO_PRICES[plan], quantity: 1 }],
            subscription_data: { metadata: { userId: user.id, plan } },
            success_url: `${appUrl()}/?checkout=success#settings`,
            cancel_url: `${appUrl()}/?checkout=canceled#settings`,
            metadata: { userId: user.id, plan },
        });
        res.json({ url: session.url });
    } catch (error) {
        console.error('Stripe checkout error:', error.message);
        res.status(500).json({ error: 'Could not start checkout. Try again.' });
    }
});

router.post('/create-portal-session', express.json(), async (req, res) => {
    try {
        const user = await dbAPI.getUserById(req.user.id);
        if (!user || !user.stripeCustomerId) return res.status(404).json({ error: 'You don’t have a billing account yet.' });
        const session = await stripe.billingPortal.sessions.create({ customer: user.stripeCustomerId, return_url: `${appUrl()}/#settings` });
        res.json({ url: session.url });
    } catch (error) {
        console.error('Stripe portal error:', error.message);
        res.status(500).json({ error: 'Could not open billing. Try again.' });
    }
});

// ============ CLUB / CAREER-CENTER BILLING (per active member) ============
// One Stripe subscription per organization on a per-seat price (CLUB_SEAT_PRICE_ID,
// monthly, per unit). The seat quantity tracks members who were active in the
// trailing 30 days; a daily job (server.js) re-syncs it without proration.

const ACTIVE_WINDOW_DAYS = 30;
function activeSince() { return new Date(Date.now() - ACTIVE_WINDOW_DAYS * 86400000); }

async function requireOrgAdmin(userId, orgId) {
    const orgs = await dbAPI.getOrgsForUser(String(userId));
    const org = orgs.find(o => o.id === orgId);
    if (!org) return { error: 'Club not found.', status: 404 };
    if (org.role !== 'owner' && org.role !== 'admin') return { error: 'Only club owners and admins can manage billing.', status: 403 };
    return { org };
}

function describePrice(p) {
    if (!p) return null;
    return { amount: p.unit_amount, currency: p.currency, interval: p.recurring ? p.recurring.interval : null, intervalCount: p.recurring ? p.recurring.interval_count : 1 };
}

let pricingCache = { at: 0, data: null };

// Public pricing for the landing page and plan picker (cached for 10 minutes).
router.get('/pricing', async (req, res) => {
    if (pricingCache.data && Date.now() - pricingCache.at < 600000) return res.json(pricingCache.data);
    const out = { pro: { monthly: null, quarterly: null, annual: null }, clubSeat: null, activeWindowDays: ACTIVE_WINDOW_DAYS };
    if (configured()) {
        const jobs = Object.entries(PRO_PRICES).map(async ([k, id]) => {
            if (!id) return;
            try { out.pro[k] = describePrice(await stripe.prices.retrieve(id)); } catch (e) { console.warn(`Pricing lookup failed for ${k}:`, e.message); }
        });
        if (process.env.CLUB_SEAT_PRICE_ID) {
            jobs.push(stripe.prices.retrieve(process.env.CLUB_SEAT_PRICE_ID).then((p) => { out.clubSeat = describePrice(p); }).catch((e) => console.warn('Club seat lookup failed:', e.message)));
        }
        await Promise.all(jobs);
    }
    pricingCache = { at: Date.now(), data: out };
    res.json(out);
});

// Start a club subscription (owner/admin only)
router.post('/club-checkout', express.json(), async (req, res) => {
    try {
        const { orgId, billingEmail } = req.body || {};
        if (!orgId) return res.status(400).json({ error: 'Choose a club.' });
        if (!configured() || !process.env.CLUB_SEAT_PRICE_ID) {
            return res.status(503).json({ error: 'Club billing isn’t set up yet. Contact us to start a club plan.' });
        }
        const check = await requireOrgAdmin(req.user.id, orgId);
        if (check.error) return res.status(check.status).json({ error: check.error });
        const org = await dbAPI.getOrganizationById(orgId);
        if (!org.verified) return res.status(400).json({ error: 'Your club needs to be verified before starting a plan. We’ll email you once it is.' });

        let customerId = org.stripeCustomerId;
        if (!customerId) {
            const email = String(billingEmail || req.user.email || '').trim().slice(0, 200) || undefined;
            const customer = await stripe.customers.create({ email, name: org.name, metadata: { orgId: org.id, type: 'organization' } });
            customerId = customer.id;
            await dbAPI.setOrgBilling(org.id, { stripeCustomerId: customerId, billingEmail: email || null });
        }

        const { active } = await dbAPI.getOrgActiveMemberCount(org.id, activeSince());
        const seats = Math.max(1, active);
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            allow_promotion_codes: true,
            line_items: [{ price: process.env.CLUB_SEAT_PRICE_ID, quantity: seats }],
            subscription_data: { metadata: { orgId: org.id, type: 'organization' } },
            metadata: { orgId: org.id, type: 'organization' },
            success_url: `${appUrl()}/?club_billing=success&org_id=${encodeURIComponent(org.id)}#console`,
            cancel_url: `${appUrl()}/?club_billing=canceled&org_id=${encodeURIComponent(org.id)}#console`,
        });
        res.json({ url: session.url, seats });
    } catch (error) {
        console.error('Club checkout error:', error.message);
        res.status(500).json({ error: 'Could not start club checkout. Try again.' });
    }
});

// Stripe billing portal for the club (invoices, payment method, cancel)
router.post('/club-portal', express.json(), async (req, res) => {
    try {
        const { orgId } = req.body || {};
        const check = await requireOrgAdmin(req.user.id, orgId);
        if (check.error) return res.status(check.status).json({ error: check.error });
        const org = await dbAPI.getOrganizationById(orgId);
        if (!org || !org.stripeCustomerId) return res.status(404).json({ error: 'This club has no billing account yet.' });
        const session = await stripe.billingPortal.sessions.create({ customer: org.stripeCustomerId, return_url: `${appUrl()}/#console` });
        res.json({ url: session.url });
    } catch (error) {
        console.error('Club portal error:', error.message);
        res.status(500).json({ error: 'Could not open billing. Try again.' });
    }
});

// Re-sync a club's plan status straight from Stripe (after checkout, in case the webhook is late)
router.post('/club-refresh', express.json(), async (req, res) => {
    try {
        const { orgId } = req.body || {};
        const check = await requireOrgAdmin(req.user.id, orgId);
        if (check.error) return res.status(check.status).json({ error: check.error });
        const org = await dbAPI.getOrganizationById(orgId);
        if (!org.stripeCustomerId || !configured()) return res.json({ planStatus: org.planStatus || 'none' });
        const subs = await stripe.subscriptions.list({ customer: org.stripeCustomerId, status: 'all', limit: 5 });
        const live = (subs.data || []).find(s => ['active', 'trialing', 'past_due'].includes(s.status)) || subs.data?.[0];
        if (live) await applyOrgSubscription(org.id, live);
        const updated = await dbAPI.getOrganizationById(org.id);
        res.json({ planStatus: updated.planStatus || 'none' });
    } catch (error) {
        console.error('Club refresh error:', error.message);
        res.status(500).json({ error: 'Could not refresh billing.' });
    }
});

async function applyOrgSubscription(orgId, sub) {
    const deleted = sub.status === 'canceled' || sub.status === 'incomplete_expired';
    await dbAPI.setOrgBilling(orgId, {
        planStatus: deleted ? 'canceled' : sub.status,
        stripeSubscriptionId: deleted ? null : sub.id,
        lastBilledSeats: sub.items?.data?.[0]?.quantity ?? null,
    });
}

// Is this subscription an organization's? (metadata first, then customer lookup)
async function orgIdForSubscription(sub) {
    if (sub.metadata?.orgId) return sub.metadata.orgId;
    const org = await dbAPI.getOrgByStripeCustomerId(sub.customer);
    return org ? org.id : null;
}

// Webhook endpoint (for handling subscription events)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send('Webhook signature verification failed');
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                const orgId = await orgIdForSubscription(subscription);
                if (orgId) {
                    // Club / career-center subscription
                    await applyOrgSubscription(orgId, subscription);
                    console.log(`Org subscription ${subscription.id} ${event.type} for org ${orgId}`);
                } else {
                    // Individual Pro subscription
                    await dbAPI.updateUserSubscription(subscription.customer, subscription);
                    console.log(`Subscription ${subscription.id} ${event.type} for customer ${subscription.customer}`);
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const deletedSubscription = event.data.object;
                const orgId = await orgIdForSubscription(deletedSubscription);
                if (orgId) {
                    await dbAPI.setOrgBilling(orgId, { planStatus: 'canceled', stripeSubscriptionId: null });
                    console.log(`Org subscription ${deletedSubscription.id} canceled for org ${orgId}`);
                } else {
                    await dbAPI.cancelUserSubscription(deletedSubscription.customer);
                    console.log(`Subscription ${deletedSubscription.id} deleted for customer ${deletedSubscription.customer}`);
                }
                break;
            }
                
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
