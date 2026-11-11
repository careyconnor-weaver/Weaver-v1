# Documentation index

## Current engineering entry points

- [Project README](../README.md): source map and local development precautions.
- [Agent instructions](../AGENTS.md): engineering and production safety rules.
- [Architecture and direction](ARCHITECTURE.md): observed architecture, proposals, and decisions needed.
- [Engineering workflow](CONTRIBUTING.md): branches, verification, and review.
- [Analytics overview](../analytics/README.md): reporting tools maintained alongside the app.

## Existing guides awaiting review

The guides below are retained at their existing paths to preserve references. This index categorizes them; it does not certify their accuracy. Names such as “complete,” “fix,” or “production” do not establish current deployment state. Review against source and confirmed configuration before following any operational instructions.

Some cover overlapping subjects. Consolidation and removal should follow a content review, rather than treating similar filenames as proof of duplication.

### Setup and product configuration

- [FEATURE_FLAGS.md](../FEATURE_FLAGS.md)
- [SETUP_INSTRUCTIONS.md](../SETUP_INSTRUCTIONS.md)

### Database

- [DATABASE_MIGRATION.md](../DATABASE_MIGRATION.md)
- [DATABASE_QUICKSTART.md](../DATABASE_QUICKSTART.md)

### Hosting, domains, and deployment

- [CUSTOM_DOMAIN_SETUP.md](../CUSTOM_DOMAIN_SETUP.md)
- [DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md)
- [DEPLOYMENT_TROUBLESHOOTING.md](../DEPLOYMENT_TROUBLESHOOTING.md)
- [DNS_RECORDS_GUIDE.md](../DNS_RECORDS_GUIDE.md)
- [DOMAIN_SETUP_COMPLETE.md](../DOMAIN_SETUP_COMPLETE.md)
- [FIND_PRODUCTION_URL.md](../FIND_PRODUCTION_URL.md)
- [GODADDY_DNS_SETUP.md](../GODADDY_DNS_SETUP.md)
- [RENDER_DEPLOYMENT.md](../RENDER_DEPLOYMENT.md)
- [RENDER_DOMAIN_VERIFICATION.md](../RENDER_DOMAIN_VERIFICATION.md)
- [RENDER_ENV_VARIABLES_COMPLETE.md](../RENDER_ENV_VARIABLES_COMPLETE.md)
- [RENDER_ENV_VARIABLES_GUIDE.md](../RENDER_ENV_VARIABLES_GUIDE.md)
- [RENDER_SETUP.md](../RENDER_SETUP.md)
- [SSL_CERTIFICATE_PENDING.md](../SSL_CERTIFICATE_PENDING.md)
- [SSL_FIX_GUIDE.md](../SSL_FIX_GUIDE.md)

### Gmail

- [FIX_GMAIL_REDIRECT_URI.md](../FIX_GMAIL_REDIRECT_URI.md)
- [GMAIL_PRODUCTION_SETUP.md](../GMAIL_PRODUCTION_SETUP.md)
- [GMAIL_SETUP.md](../GMAIL_SETUP.md)

### Email and reminders

- [EMAIL_AUTOMATION_COMPLETE.md](../EMAIL_AUTOMATION_COMPLETE.md)
- [EMAIL_AUTOMATION_SETUP.md](../EMAIL_AUTOMATION_SETUP.md)
- [EMAIL_SERVICE_MIGRATION.md](../EMAIL_SERVICE_MIGRATION.md)
- [RESEND_QUICK_START.md](../RESEND_QUICK_START.md)
- [RESEND_SETUP.md](../RESEND_SETUP.md)
- [RESEND_SETUP_SIMPLE.md](../RESEND_SETUP_SIMPLE.md)
- [TESTING_EMAIL_AUTOMATION.md](../TESTING_EMAIL_AUTOMATION.md)

### Stripe and club billing

- [CLUB_BILLING_SETUP.md](../CLUB_BILLING_SETUP.md)
- [CREATE_STRIPE_PRICES.md](../CREATE_STRIPE_PRICES.md)
- [FIND_PRICE_IDS.md](../FIND_PRICE_IDS.md)
- [STRIPE_INTEGRATION_GUIDE.md](../STRIPE_INTEGRATION_GUIDE.md)
- [STRIPE_PRODUCTION_FIX.md](../STRIPE_PRODUCTION_FIX.md)
- [STRIPE_PRODUCT_SETUP.md](../STRIPE_PRODUCT_SETUP.md)
- [STRIPE_TEST_MODE_SETUP.md](../STRIPE_TEST_MODE_SETUP.md)
- [STRIPE_TEST_TO_LIVE.md](../STRIPE_TEST_TO_LIVE.md)
- [VERIFY_STRIPE_PRICES.md](../VERIFY_STRIPE_PRICES.md)

### Design history

- [github.md](../github.md)

## Imported design reference

[Design reference](design-reference.md) preserves the former lowercase root README. Git previously tracked both `README.md` and `readme.md`, which collide on case-insensitive filesystems. The root `README.md` remains the project guide; the design guide now has a distinct, descriptive path under `docs/`.

## Cleanup boundaries

This first cleanup organizes documentation entry points. Application files, package manifests, migration scripts, and Render configuration stay in place. Frontend asset moves and broader repository restructuring require separately reviewed changes.
