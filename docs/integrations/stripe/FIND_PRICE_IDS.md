# How to Find Your Stripe Price IDs

## Important: Product ID vs Price ID

You provided **Product IDs** (`prod_...`), but we need **Price IDs** (`price_...`) for checkout.

## How to Find Price IDs

1. Go to https://dashboard.stripe.com/test/products
2. Click on each product:
   - **Weaver Basic** → Click on it → Look for "Price ID" (starts with `price_...`)
   - **Weaver Pro** → Click on it → Look for "Price ID" (starts with `price_...`)
   - **Weaver Pro Yearly** → Click on it → Look for "Price ID" (starts with `price_...`)

3. Each product will show its Price ID in the product details page
4. Copy each Price ID (they look like: `price_1SqLxTHpAukE92igGNCdfVdI`)

## What You'll Need

- **Weaver Basic**: Price ID for $4.99/month
- **Weaver Pro**: Price ID for $9.99/month  
- **Weaver Pro Yearly**: Price ID for $99.99/year

Once you have the Price IDs, I'll update the code to use all three tiers!
