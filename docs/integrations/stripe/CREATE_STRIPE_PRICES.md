# Create Missing Stripe Prices

## Current Status
Your Stripe account only has **ONE price**: `price_1SqLxTHpAukE92igGNCdfVdI` ($5/month)

The Price IDs you provided don't exist in this account. You need to create prices for your products.

## How to Create Prices in Stripe

### Step 1: Go to Your Products
1. Go to https://dashboard.stripe.com/test/products
2. Make sure you're in **TEST MODE** (top right)

### Step 2: For Each Product, Add a Price

#### For "Weaver Basic" Product:
1. Click on the "Weaver Basic" product
2. Scroll to the "Pricing" section
3. Click **"Add another price"** or **"Set up pricing"**
4. Enter:
   - **Price**: `4.99`
   - **Currency**: `USD`
   - **Billing period**: `Monthly` (recurring)
5. Click **"Save"**
6. **Copy the Price ID** (starts with `price_...`)

#### For "Weaver Pro" Product:
1. Click on the "Weaver Pro" product
2. Scroll to the "Pricing" section
3. Click **"Add another price"** or **"Set up pricing"**
4. Enter:
   - **Price**: `9.99`
   - **Currency**: `USD`
   - **Billing period**: `Monthly` (recurring)
5. Click **"Save"**
6. **Copy the Price ID**

#### For "Weaver Pro Yearly" Product:
1. Click on the "Weaver Pro Yearly" product
2. Scroll to the "Pricing" section
3. Click **"Add another price"** or **"Set up pricing"**
4. Enter:
   - **Price**: `99.99`
   - **Currency**: `USD`
   - **Billing period**: `Yearly` or `Every 12 months` (recurring)
5. Click **"Save"**
6. **Copy the Price ID**

### Step 3: Share the Price IDs
Once you have all three Price IDs, share them with me and I'll update the code.

## Quick Check
After creating prices, verify they exist:
- Go to https://dashboard.stripe.com/test/products
- Click on each product
- You should see a Price ID in the pricing section
- Copy each Price ID (they start with `price_...`)

## Note
I've temporarily set all buttons to use the existing price (`price_1SqLxTHpAukE92igGNCdfVdI`) so you can test the checkout flow. Once you create the proper prices, I'll update the code with the correct Price IDs.
