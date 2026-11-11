# Stripe Test Mode Setup - Create Products in TEST MODE

## Important: Use TEST MODE for Development

You should **always** create products in **TEST MODE** during development. Live mode is only for production when you're ready to accept real payments.

## Current Situation
- ✅ You have test API keys (`sk_test_...`) - correct for development
- ❌ Some products are in LIVE MODE - need to move to TEST MODE
- ✅ One product exists in test mode: `price_1SqLxTHpAukE92igGNCdfVdI`

## Step-by-Step: Create Products in TEST MODE

### Step 1: Switch to Test Mode
1. Go to https://dashboard.stripe.com
2. Look at the top right corner
3. Make sure it says **"TEST MODE"** (not "LIVE MODE")
4. If it says "LIVE MODE", click it to switch to test mode

### Step 2: Create Products in Test Mode

#### Create "Weaver Basic" Product:
1. Go to https://dashboard.stripe.com/test/products
2. Click **"+ Add product"**
3. Fill in:
   - **Name**: `Weaver Basic`
   - **Description**: `Basic subscription plan for Weaver`
   - **Pricing model**: Select **"Recurring"**
   - **Price**: `4.99`
   - **Currency**: `USD`
   - **Billing period**: `Monthly`
4. Click **"Save product"**
5. **Copy the Price ID** (starts with `price_...`) - NOT the Product ID!

#### Create "Weaver Pro" Product:
1. Click **"+ Add product"** again
2. Fill in:
   - **Name**: `Weaver Pro`
   - **Description**: `Pro subscription plan for Weaver`
   - **Pricing model**: Select **"Recurring"**
   - **Price**: `9.99`
   - **Currency**: `USD`
   - **Billing period**: `Monthly`
3. Click **"Save product"**
4. **Copy the Price ID**

#### Create "Weaver Pro Yearly" Product:
1. Click **"+ Add product"** again
2. Fill in:
   - **Name**: `Weaver Pro Yearly`
   - **Description**: `Annual Pro subscription plan for Weaver`
   - **Pricing model**: Select **"Recurring"**
   - **Price**: `99.99`
   - **Currency**: `USD`
   - **Billing period**: `Yearly` or `Every 12 months`
3. Click **"Save product"**
4. **Copy the Price ID**

### Step 3: Verify All Products Are in Test Mode
1. Go to https://dashboard.stripe.com/test/products
2. You should see all three products listed
3. Each should have a Price ID (starts with `price_...`)
4. Make sure you're viewing the **TEST MODE** tab

### Step 4: Share the Price IDs
Once you have all three Price IDs from TEST MODE, share them with me and I'll update the code.

## Important Notes

### Test Mode vs Live Mode
- **Test Mode**: For development, uses `sk_test_...` keys, no real charges
- **Live Mode**: For production, uses `sk_live_...` keys, real charges

### Your Current Setup
- ✅ API Keys: Test mode (`sk_test_...`) - correct!
- ✅ Environment: Development - correct!
- ❌ Products: Some in live mode - need to create in test mode

### When to Switch to Live Mode
Only switch to live mode when:
- ✅ You've thoroughly tested everything
- ✅ You're ready to accept real payments
- ✅ You've updated your API keys to live keys
- ✅ You've updated environment variables in production

## Quick Checklist
- [ ] Switch to TEST MODE in Stripe Dashboard
- [ ] Create "Weaver Basic" product with $4.99/month price
- [ ] Create "Weaver Pro" product with $9.99/month price
- [ ] Create "Weaver Pro Yearly" product with $99.99/year price
- [ ] Copy all three Price IDs (starts with `price_...`)
- [ ] Share Price IDs with me to update the code
