# Club billing + Weaver Assistant setup

Clubs and career centers pay **per active member, per month**. A member is
*active* if, in the last 30 days, they logged an email, logged a call/coffee chat
note, or added a contact. Everyone on the roster gets Pro while the club's plan is
active; only active members are billed.

## 1. Create the seat price in Stripe

1. Stripe Dashboard → **Product catalog → Add product** → name it "Weaver Club Plan".
2. Pricing model: **Standard pricing**, **Recurring**, **Monthly**, price **per unit**
   (the amount you charge per active member, e.g. $6.00).
3. Save, then copy the **Price ID** (`price_...`).

## 2. Set environment variables (Render → Environment)

| Variable | Required | Purpose |
| --- | --- | --- |
| `CLUB_SEAT_PRICE_ID` | Yes, for club billing | The per-seat price from step 1. Without it, "Start club plan" shows a clear "not configured" message and the landing page shows "Per active member" with no amount. |
| `OPENAI_API_KEY` | Yes, for the assistant | Already used for call notes. |
| `OPENAI_ASSISTANT_MODEL` | No | Model for the assistant. Default `gpt-4o`. |
| `ASSISTANT_FREE_DAILY_LIMIT` | No | Assistant requests per day for free users. Default `30`. Pro users and club-covered members are unlimited. |

## 3. Webhook events

The existing webhook (`/api/stripe/webhook`) now handles club subscriptions too.
Make sure these events are enabled on it:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Club subscriptions are recognized by `metadata.orgId`; individual Pro
subscriptions keep working exactly as before.

## 4. Enable the customer portal

Stripe Dashboard → **Settings → Billing → Customer portal** → activate it. The
"Manage billing" button in the Club view opens it (invoices, card, cancel).

## How seats are billed

- Checkout starts with seats = current active members (minimum 1).
- The server re-syncs each club's seat quantity **daily at 03:15** and **2 minutes
  after every restart**, with no proration — each renewal invoice bills the
  active count at that time.
- If the checkout webhook is delayed, returning from Stripe triggers a direct
  status refresh, so the plan shows as active immediately.

## Database

No manual steps. New columns/tables are created automatically on server start
(and by `npm run migrate`).
