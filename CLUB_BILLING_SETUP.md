# Setup: plans, billing, AI limits and club verification

Everything here is configured in **Render → your web service → Environment**. No code changes needed.

## 1. Plans

| Plan | Who | AI allowance per month | Contacts |
| --- | --- | --- | --- |
| Starter | Signed up, no verified club, not paying | $0.01 (a few requests) | 20 |
| Club | Member of a **verified** club | $0.25 | 150 |
| Club sponsored | Member of a verified club with a paid club plan or campus license | $0.75 | 1,000 |
| Pro | Individual subscriber (monthly, quarterly or annual) | $1.50 | 5,000 |

The allowance is a hard cap. Before each AI request, Weaver checks the request's
worst-case cost against what's left; if it could go over, the request is refused
before it reaches OpenAI. Allowances reset on the 1st (UTC).

Tune any value without code:

| Variable | Default | Meaning |
| --- | --- | --- |
| `PLAN_STARTER_AI_MICROS` | `10000` | Starter allowance in millionths of a dollar ($0.01) |
| `PLAN_CLUB_AI_MICROS` | `250000` | Club allowance ($0.25) |
| `PLAN_CLUB_PLUS_AI_MICROS` | `750000` | Club sponsored allowance ($0.75) |
| `PLAN_PRO_AI_MICROS` | `1500000` | Pro allowance ($1.50) |
| `PLAN_STARTER_CONTACTS`, `PLAN_CLUB_CONTACTS`, `PLAN_CLUB_PLUS_CONTACTS`, `PLAN_PRO_CONTACTS` | 20 / 150 / 1000 / 5000 | Contact limits |
| `AI_MONTHLY_GLOBAL_CAP_USD` | none | Kill switch: pauses all AI features for the month once total spend reaches this. Recommended: set it, e.g. `150`. |
| `OPENAI_ASSISTANT_MODEL` | `gpt-4o-mini` | Model for the assistant, review tables and Starter/Club documents |
| `OPENAI_QUALITY_MODEL` | `gpt-4o` | Model for documents on Club sponsored and Pro |
| `OPENAI_VISION_MODEL` | `gpt-4o` | Model that reads photos of handwritten notes |

Keep each paid allowance well below the plan's price so margins stay high.

## 2. Pro prices (monthly, quarterly, annual)

In Stripe → **Product catalog**, create the Pro prices, then set:

| Variable | Notes |
| --- | --- |
| `STRIPE_PRICE_PRO_MONTHLY` | Defaults to the existing monthly price |
| `STRIPE_PRICE_PRO_QUARTERLY` | Recurring every 3 months. The quarterly option appears once this is set. |
| `STRIPE_PRICE_PRO_ANNUAL` | Defaults to the existing yearly price |

Prices on the landing page and in the upgrade dialog are read live from Stripe, so
changing a price in Stripe (and the variable, if it's a new price ID) is all it takes.
Only these three prices can be purchased. Promotion codes are enabled at checkout,
so discounts for a school or a launch are created as Stripe coupons, not separate prices.

## 3. Club plans (per active member)

1. Stripe → **Add product** "Weaver Club Plan", recurring monthly, **per unit**.
2. Set `CLUB_SEAT_PRICE_ID` to its price ID.
3. A club must be **verified** (step 5) before it can start a plan.

Seats = members with networking activity in the last 30 days (minimum 1), re-synced
daily without proration. Webhook events needed on `/api/stripe/webhook`:
`customer.subscription.created`, `.updated`, `.deleted`. Activate the Stripe customer
portal (Settings → Billing → Customer portal) for "Manage billing".

## 4. Admins

Set `ADMIN_EMAILS` to a comma-separated list of Weaver staff accounts, e.g.
`ADMIN_EMAILS=shindon@bc.edu,connor@example.com`. Admins can verify clubs, grant campus
licenses and use the maintenance endpoints. Nobody else can.

## 5. Verifying a club, granting a campus license

Members only get the free Club allowance once Weaver verifies the club (this stops
people creating clubs to get free AI usage). Club leaders see a note asking them to
email info@studentweaver.com from a school address.

While signed in as an admin, open the browser console on studentweaver.com and run:

```js
// List clubs (newest first)
await (await fetch('/api/admin/orgs')).json()

// Verify a club
await fetch('/api/admin/orgs/ORG_ID', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ verified: true }) })

// Career-center contract: sponsor every member until a date
await fetch('/api/admin/orgs/ORG_ID', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orgType: 'career_center', license: 'campus', licenseExpiresAt: '2027-06-30' }) })
```

## 6. After deploying this version

- Everyone is signed out once (sessions moved to a secure cookie) and signs back in normally.
- Existing passwords are converted to secure hashes automatically, in the background on
  first start and on each user's next sign-in. Nothing for users to do.
- New database tables are created automatically on start.

## 7. The confidential playbook (do this once)

Weaver's detailed recruiting playbook is a trade secret, and this code repository is
public, so the playbook is **not** in the code. The server loads it at start from a
Render Secret File:

1. Render → Weaver web service → **Environment** → **Secret Files** → **Add Secret File**.
2. Filename: `weaver-playbook.md`. Paste the contents of the private playbook file.
3. Save. Render redeploys; the file is available at `/etc/secrets/weaver-playbook.md`.

Until it is added, the AI uses a short generic fallback and the server log says
"Weaver playbook not installed". To change the method later, edit the Secret File;
no code change or commit is needed. For a local run, put the same file at
`private/weaver-playbook.md` (git-ignored).

The playbook is applied silently to every AI feature, the AI is instructed never to
reveal it, and every AI output is scrubbed of sentences that repeat its wording. The
in-app Playbook page shows principles only.
