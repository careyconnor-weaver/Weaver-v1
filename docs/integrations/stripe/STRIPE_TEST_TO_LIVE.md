# Switching Stripe from Test Mode to Live Mode

## Current Status: Test Mode ✅

You're currently using **test mode**, which is perfect for testing! Your current price IDs are:
- **Basic**: `price_1SsVn4HpAukE92igebIXTVzG`
- **Pro**: `price_1SsVnFHpAukE92igFXERJoTh`
- **Yearly**: `price_1SsVnWHpAukE92ig2276JC6I`

## Test Mode vs Live Mode

### Test Mode (Current)
- ✅ **Perfect for testing** - No real charges
- ✅ Use test cards (4242 4242 4242 4242)
- ✅ Safe to test payment flows
- ✅ Test API keys: `sk_test_...` and `pk_test_...`
- ❌ **No real payments processed**

### Live Mode (For Real Payments)
- ✅ **Accepts real credit cards**
- ✅ Real money transactions
- ✅ Live API keys: `sk_live_...` and `pk_live_...`
- ⚠️ **Must be ready for production**

## Recommendation: Test First!

**Before switching to live mode:**

1. ✅ Test the payment flow in test mode
2. ✅ Verify database migrations work
3. ✅ Test webhook handling
4. ✅ Verify success/cancel redirects work
5. ✅ Test subscription management

**Then switch to live mode when ready for real customers.**

## How to Switch to Live Mode

### Step 1: Activate Your Stripe Account

1. Go to https://dashboard.stripe.com/account
2. Complete account activation:
   - Add business information
   - Add bank account for payouts
   - Complete identity verification
   - Accept terms of service

### Step 2: Get Live API Keys

1. Go to https://dashboard.stripe.com/apikeys
2. **Toggle from "Test mode" to "Live mode"** (top right)
3. Copy your **Live Publishable key** (`pk_live_...`)
4. Copy your **Live Secret key** (`sk_live_...`) - Click "Reveal live key"

### Step 3: Create Products/Prices in Live Mode

1. Go to https://dashboard.stripe.com/products (make sure you're in **Live mode**)
2. Create the same three products:
   - **Weaver Basic** - $4.99/month
   - **Weaver Pro** - $9.99/month
   - **Weaver Pro Yearly** - $99.99/year
3. **Copy the NEW Live Price IDs** (they'll be different from test IDs)

### Step 4: Update Code with Live Price IDs

Once you have the live price IDs, I'll update `index.html` with the new IDs.

### Step 5: Update Environment Variables on Render

Update these in Render dashboard (Settings → Environment Variables):

1. **STRIPE_SECRET_KEY**
   - Change from: `sk_test_...`
   - Change to: `sk_live_...` (your live secret key)

2. **STRIPE_WEBHOOK_SECRET** (if using webhooks)
   - Create a new webhook endpoint in **Live mode**
   - Point to: `https://weaver-kuwd.onrender.com/api/stripe/webhook`
   - Copy the new webhook signing secret (`whsec_...`)

3. **WEAVER_URL** (should already be set)
   - `https://weaver-kuwd.onrender.com` (or your custom domain)

### Step 6: Redeploy

After updating environment variables:
1. Push code changes (if price IDs changed)
2. Render will automatically redeploy
3. Test with a real card (start with a small amount!)

## Testing Checklist

### Test Mode Testing (Do This First!)
- [ ] Payment flow works
- [ ] Database saves subscription info
- [ ] Success page redirects correctly
- [ ] Cancel page redirects correctly
- [ ] Webhooks receive events (check Stripe dashboard)

### Live Mode Testing (After Switching)
- [ ] Test with a real card (use a small test amount)
- [ ] Verify payment appears in Stripe dashboard
- [ ] Verify database updates correctly
- [ ] Test subscription cancellation
- [ ] Monitor for any errors

## Important Notes

⚠️ **Test Mode vs Live Mode Price IDs are Different**
- Test price IDs: `price_1SsVn4HpAukE92igebIXTVzG` (test)
- Live price IDs: `price_1XXXXX...` (will be different!)

⚠️ **You Can't Use Test Price IDs with Live Keys**
- If you use live keys with test price IDs, Stripe will return an error
- Always match: Test keys → Test prices, Live keys → Live prices

⚠️ **Webhooks Must Match Mode**
- Test webhooks only work with test keys
- Live webhooks only work with live keys
- Create separate webhook endpoints for each mode

## Quick Reference

| Item | Test Mode | Live Mode |
|------|-----------|-----------|
| API Keys | `sk_test_...` / `pk_test_...` | `sk_live_...` / `pk_live_...` |
| Price IDs | `price_1SsVn4HpAukE92ig...` | `price_1XXXXX...` (different!) |
| Cards | Test cards (4242...) | Real credit cards |
| Payments | No real charges | Real money |
| Dashboard | https://dashboard.stripe.com/test | https://dashboard.stripe.com |

## When You're Ready

When you're ready to switch to live mode:

1. **Complete Stripe account activation** (Step 1)
2. **Get live price IDs** (Step 3)
3. **Share the live price IDs with me** and I'll update the code
4. **Update environment variables** on Render (Step 5)
5. **Test with a real card** (small amount first!)

## Need Help?

If you need help with any step, let me know! I can:
- Update the code with live price IDs
- Help troubleshoot any issues
- Guide you through testing
