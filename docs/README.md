# Documentation index

## Current engineering entry points

- [Project README](../README.md): existing project overview and setup instructions.
- [Agent instructions](../AGENTS.md): engineering and production safety rules.
- [Architecture and direction](ARCHITECTURE.md): observed architecture, proposals, and decisions needed.
- [Analytics overview](../analytics/README.md): reporting tools maintained alongside the app.

## Existing guides awaiting review

The guides below are grouped by subject. Moving them does not certify their accuracy. Run any relative shell commands from the repository root, not from these documentation directories. Server startup messages may still mention historical guide basenames; find the corresponding guide below. Names such as “complete,” “fix,” or “production” do not establish current deployment state. Review against source and confirmed configuration before following any operational instructions.

Some cover overlapping subjects. Consolidation and removal should follow a content review, rather than treating similar filenames as proof of duplication.

### Setup and product configuration

- [FEATURE_FLAGS.md](setup/FEATURE_FLAGS.md)
- [SETUP_INSTRUCTIONS.md](setup/SETUP_INSTRUCTIONS.md)

### Database

- [DATABASE_MIGRATION.md](setup/DATABASE_MIGRATION.md)
- [DATABASE_QUICKSTART.md](setup/DATABASE_QUICKSTART.md)

### Hosting, domains, and deployment

- [CUSTOM_DOMAIN_SETUP.md](deployment/CUSTOM_DOMAIN_SETUP.md)
- [DEPLOYMENT_CHECKLIST.md](deployment/DEPLOYMENT_CHECKLIST.md)
- [DEPLOYMENT_TROUBLESHOOTING.md](deployment/DEPLOYMENT_TROUBLESHOOTING.md)
- [DNS_RECORDS_GUIDE.md](deployment/DNS_RECORDS_GUIDE.md)
- [DOMAIN_SETUP_COMPLETE.md](deployment/DOMAIN_SETUP_COMPLETE.md)
- [FIND_PRODUCTION_URL.md](deployment/FIND_PRODUCTION_URL.md)
- [GODADDY_DNS_SETUP.md](deployment/GODADDY_DNS_SETUP.md)
- [RENDER_DEPLOYMENT.md](deployment/RENDER_DEPLOYMENT.md)
- [RENDER_DOMAIN_VERIFICATION.md](deployment/RENDER_DOMAIN_VERIFICATION.md)
- [RENDER_ENV_VARIABLES_COMPLETE.md](deployment/RENDER_ENV_VARIABLES_COMPLETE.md)
- [RENDER_ENV_VARIABLES_GUIDE.md](deployment/RENDER_ENV_VARIABLES_GUIDE.md)
- [RENDER_SETUP.md](deployment/RENDER_SETUP.md)
- [SSL_CERTIFICATE_PENDING.md](deployment/SSL_CERTIFICATE_PENDING.md)
- [SSL_FIX_GUIDE.md](deployment/SSL_FIX_GUIDE.md)

### Gmail

- [FIX_GMAIL_REDIRECT_URI.md](integrations/gmail/FIX_GMAIL_REDIRECT_URI.md)
- [GMAIL_PRODUCTION_SETUP.md](integrations/gmail/GMAIL_PRODUCTION_SETUP.md)
- [GMAIL_SETUP.md](integrations/gmail/GMAIL_SETUP.md)

### Email and reminders

- [EMAIL_AUTOMATION_COMPLETE.md](integrations/resend/EMAIL_AUTOMATION_COMPLETE.md)
- [EMAIL_AUTOMATION_SETUP.md](integrations/resend/EMAIL_AUTOMATION_SETUP.md)
- [EMAIL_SERVICE_MIGRATION.md](integrations/resend/EMAIL_SERVICE_MIGRATION.md)
- [RESEND_QUICK_START.md](integrations/resend/RESEND_QUICK_START.md)
- [RESEND_SETUP.md](integrations/resend/RESEND_SETUP.md)
- [RESEND_SETUP_SIMPLE.md](integrations/resend/RESEND_SETUP_SIMPLE.md)
- [TESTING_EMAIL_AUTOMATION.md](integrations/resend/TESTING_EMAIL_AUTOMATION.md)

### Stripe and club billing

- [CLUB_BILLING_SETUP.md](integrations/stripe/CLUB_BILLING_SETUP.md)
- [CREATE_STRIPE_PRICES.md](integrations/stripe/CREATE_STRIPE_PRICES.md)
- [FIND_PRICE_IDS.md](integrations/stripe/FIND_PRICE_IDS.md)
- [STRIPE_INTEGRATION_GUIDE.md](integrations/stripe/STRIPE_INTEGRATION_GUIDE.md)
- [STRIPE_PRODUCTION_FIX.md](integrations/stripe/STRIPE_PRODUCTION_FIX.md)
- [STRIPE_PRODUCT_SETUP.md](integrations/stripe/STRIPE_PRODUCT_SETUP.md)
- [STRIPE_TEST_MODE_SETUP.md](integrations/stripe/STRIPE_TEST_MODE_SETUP.md)
- [STRIPE_TEST_TO_LIVE.md](integrations/stripe/STRIPE_TEST_TO_LIVE.md)
- [VERIFY_STRIPE_PRICES.md](integrations/stripe/VERIFY_STRIPE_PRICES.md)

### Design history

- [github.md](design-history.md)

## Imported design reference

[Design reference](design-reference.md) preserves the former lowercase root README. Git previously tracked both `README.md` and `readme.md`, which collide on case-insensitive filesystems. The root `README.md` remains the project guide; the design guide now has a distinct, descriptive path under `docs/`.

## Cleanup boundaries

This first cleanup organizes documentation entry points and moves the root-level guides into subject directories. Application files, package manifests, migration scripts, and Render configuration stay in place. Frontend asset moves and broader repository restructuring require separately reviewed changes.
