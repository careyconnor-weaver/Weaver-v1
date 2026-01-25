# Stripe Product Setup Guide

## Step-by-Step: Create Products in Stripe Dashboard

### Step 1: Go to Stripe Dashboard
1. Go to https://dashboard.stripe.com/test/products
2. Make sure you're in **Test mode** (toggle in top right)

### Step 2: Create Monthly Subscription Product

1. Click **"+ Add product"** button (top right)
2. Fill in the product details:
   - **Name**: `Weaver Pro Monthly`
   - **Description**: `Monthly subscription to Weaver Pro - AI-powered networking tools`
   - **Pricing model**: Select **"Recurring"**
   - **Price**: `$5.00`
   - **Billing period**: Select **"Monthly"**
   - **Currency**: `USD`
3. Click **"Save product"**
4. **IMPORTANT**: Copy the **Price ID** (starts with `price_...`) - you'll need this!
   - It will look like: `price_1SqLxTHpAukE92igGNCdfVdI` (you already have this one)

### Step 3: Create Yearly Subscription Product (Optional)

1. Click **"+ Add product"** again
2. Fill in the product details:
   - **Name**: `Weaver Pro Yearly`
   - **Description**: `Annual subscription to Weaver Pro - Save 17%`
   - **Pricing model**: Select **"Recurring"**
   - **Price**: `$50.00` (or whatever yearly price you want)
   - **Billing period**: Select **"Yearly"** or **"Every 12 months"**
   - **Currency**: `USD`
3. Click **"Save product"**
4. **Copy the Price ID** for the yearly plan

### Step 4: Update Your Code

Once you have the Price IDs:
1. Monthly Price ID: `price_1SqLxTHpAukE92igGNCdfVdI` ✅ (already set)
2. Yearly Price ID: `price_XXXXX` (update when you create it)

## Current Status

✅ **Monthly subscription is already configured** with Price ID: `price_1SqLxTHpAukE92igGNCdfVdI`

The code I created is **better** than the Stripe example because:
- ✅ Uses Price IDs directly (simpler than lookup_keys)
- ✅ Already integrated with your user system
- ✅ Handles webhooks properly
- ✅ Works with your existing authentication

## What You DON'T Need

You **don't need** the Stripe example code because:
- ❌ It's Ruby/Sinatra (you're using Node.js)
- ❌ Uses lookup_keys (we use Price IDs directly - simpler)
- ❌ Doesn't integrate with your user system
- ✅ **Your current code is already better!**

## Next Steps

1. **Create the monthly product** in Stripe (if not already done)
2. **Create the yearly product** (optional)
3. **Test the checkout** at http://localhost:3000
4. **Add yearly Price ID** to code when ready

Your integration is ready to go! Just create the products in Stripe Dashboard.
