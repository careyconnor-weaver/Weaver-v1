# Verify Your Stripe Price IDs

## The Error
"No such price: 'price_1SsV2TQZZ2GMzWg9iluqebta'"

This means the Price ID doesn't exist in your Stripe account, or you're using the wrong mode (test vs live).

## How to Fix

### Step 1: Check You're in Test Mode
1. Go to https://dashboard.stripe.com/test/products
2. Make sure you see "TEST MODE" in the top right
3. If you see "LIVE MODE", click it to switch to test mode

### Step 2: Verify Your Price IDs
1. Go to https://dashboard.stripe.com/test/products
2. Click on each product:
   - **Weaver Basic** → Click on it → Look at the "Pricing" section
   - **Weaver Pro** → Click on it → Look at the "Pricing" section  
   - **Weaver Pro Yearly** → Click on it → Look at the "Pricing" section

3. For each product, you'll see a Price ID that looks like: `price_1XXXXX...`
4. **Copy the exact Price ID** (it's different from the Product ID!)

### Step 3: Update Your Code
Once you have the correct Price IDs, I'll update the code with the correct values.

## Common Issues

### Issue 1: Using Product ID instead of Price ID
- ❌ Product ID: `prod_XXXXX` (wrong - this is the product)
- ✅ Price ID: `price_XXXXX` (correct - this is what you need)

### Issue 2: Test vs Live Mode Mismatch
- Your `.env` has: `sk_test_...` (test mode key)
- Your Price IDs must be from **test mode** products
- Make sure you're looking at test mode in Stripe Dashboard

### Issue 3: Price ID Doesn't Exist
- The Price ID might have been deleted
- Or it's from a different Stripe account
- Create a new product/price if needed

## Quick Check
1. Go to https://dashboard.stripe.com/test/products
2. Click on "Weaver Pro" product
3. In the pricing section, you should see a Price ID
4. Copy that exact Price ID and share it with me
