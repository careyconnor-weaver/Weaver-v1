# Stripe Payment Fix - Production Deployment Guide

## Issues Fixed

1. **Database Migration Not Run**: The production database on Render didn't have the Stripe columns (`stripe_customer_id`, `stripe_subscription_id`, etc.) because migrations weren't running automatically.

2. **userId Type Safety**: Ensured userId is always converted to string before database queries to prevent type mismatch errors.

3. **Better Error Handling**: Added clearer error messages that identify database schema issues.

## Changes Made

### 1. Updated `routes/stripe.js`
- Convert userId to string before database queries
- Added specific error handling for database schema errors
- Better error messages for troubleshooting

### 2. Created `migrate-db.js`
- Standalone migration script that can be run manually or during build
- Checks for DATABASE_URL before running
- Provides clear success/failure messages

### 3. Updated `package.json`
- Added `migrate` script: `npm run migrate`

### 4. Updated `render.yaml`
- Modified build command to run migrations: `npm install && npm run migrate`
- This ensures the database schema is up-to-date on every deployment

### 5. Updated `db/api.js`
- Added error handling in `getUserById` to detect schema issues
- Converts userId to string for consistency

## What You Need to Do

### Step 1: Set Environment Variables on Render

Make sure these environment variables are set in your Render dashboard:

1. **STRIPE_SECRET_KEY** (Required)
   - Get from: https://dashboard.stripe.com/apikeys
   - **For testing**: Use `sk_test_...` (test mode key)
   - **For real payments**: Use `sk_live_...` (live mode key) - See STRIPE_TEST_TO_LIVE.md
   - Add in Render: Settings → Environment Variables

2. **STRIPE_WEBHOOK_SECRET** (Required for webhooks)
   - Get from: https://dashboard.stripe.com/webhooks
   - Create a webhook endpoint pointing to: `https://your-domain.com/api/stripe/webhook`
   - Copy the webhook signing secret
   - Add in Render: Settings → Environment Variables

3. **WEAVER_URL** (Required)
   - Set to your production URL: `https://weaver-kuwd.onrender.com` (or your custom domain)
   - This is used for Stripe redirect URLs
   - Add in Render: Settings → Environment Variables

### Step 2: Push Changes to GitHub

The changes are ready. Push them:

```bash
git add .
git commit -m "Fix Stripe payment integration for production"
git push origin main
```

### Step 3: Deploy on Render

1. Render will automatically detect the push and start building
2. The build will now run migrations automatically (`npm install && npm run migrate`)
3. Watch the build logs to ensure migrations succeed

### Step 4: Verify Database Schema

After deployment, you can verify the schema is correct by:

1. Check Render build logs - should see "✅ Database migration completed successfully!"
2. Try making a test payment - should work without errors

### Step 5: Test Payment Flow

1. Go to your live website
2. Click "View Pricing"
3. Select a plan and click "Subscribe"
4. Complete the Stripe checkout
5. Verify redirect to success page works

## Manual Migration (If Needed)

If migrations don't run automatically, you can run them manually:

1. SSH into your Render instance (if available)
2. Or use Render's shell/console feature
3. Run: `npm run migrate`

## Troubleshooting

### Error: "Database schema error"
- **Cause**: Migrations didn't run or failed
- **Fix**: Check Render build logs, ensure DATABASE_URL is set correctly

### Error: "Stripe is not configured"
- **Cause**: STRIPE_SECRET_KEY not set
- **Fix**: Add STRIPE_SECRET_KEY in Render environment variables

### Error: "Invalid Price ID"
- **Cause**: Using test mode price IDs in production (or vice versa)
- **Fix**: Ensure you're using the correct Stripe keys and price IDs for your environment

### Error: "User not found"
- **Cause**: User ID mismatch or user doesn't exist in database
- **Fix**: Ensure users are being created properly, check database

## Testing Checklist

- [ ] Environment variables set on Render
- [ ] Code pushed to GitHub
- [ ] Render deployment successful
- [ ] Migration logs show success
- [ ] Test payment flow works
- [ ] Success page redirects correctly
- [ ] Webhook receives events (check Stripe dashboard)

## Next Steps

After confirming payments work:

1. Set up Stripe webhooks for production
2. Test subscription cancellation flow
3. Test subscription renewal flow
4. Monitor Stripe dashboard for successful payments
