// Idempotent schema statements for everything added after the original Drizzle
// migration. Run on every server start (server.js) and by `npm run migrate`, so a fresh
// deploy and an old database end up identical.

module.exports = [
    // Profile settings
    `CREATE TABLE IF NOT EXISTS user_settings (
        user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        first_name varchar(100),
        last_name varchar(100),
        profile_photo text,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
    )`,

    // Accounts / onboarding
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type text`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarded_at timestamp`,

    // Clubs and career centers
    `CREATE TABLE IF NOT EXISTS organizations (
        id text PRIMARY KEY,
        name varchar(255) NOT NULL,
        join_code varchar(20) NOT NULL UNIQUE,
        owner_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        school varchar(255),
        created_at timestamp DEFAULT now() NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS org_members (
        id text PRIMARY KEY,
        org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role varchar(20) DEFAULT 'member',
        display_name varchar(255),
        joined_at timestamp DEFAULT now() NOT NULL
    )`,
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_status text DEFAULT 'none'`,
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id text`,
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_subscription_id text`,
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_email varchar(255)`,
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS last_billed_seats integer`,
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false`,
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS org_type text DEFAULT 'club'`,
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS license text DEFAULT 'none'`,
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS license_expires_at timestamp`,
    `CREATE UNIQUE INDEX IF NOT EXISTS org_members_org_user_idx ON org_members (org_id, user_id)`,
    `CREATE INDEX IF NOT EXISTS org_members_user_idx ON org_members (user_id)`,
    `CREATE TABLE IF NOT EXISTS org_invites (
        id text PRIMARY KEY,
        org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        email varchar(255) NOT NULL,
        invited_by text REFERENCES users(id) ON DELETE SET NULL,
        status varchar(20) DEFAULT 'pending',
        created_at timestamp DEFAULT now() NOT NULL
    )`,

    // Sessions (only a hash of each token is stored)
    `CREATE TABLE IF NOT EXISTS sessions (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at timestamp NOT NULL DEFAULT now(),
        expires_at timestamp NOT NULL,
        last_seen_at timestamp,
        user_agent text,
        ip text
    )`,
    `CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id)`,

    // AI usage ledger (one row per model call; cost in micro-dollars)
    `CREATE TABLE IF NOT EXISTS ai_usage (
        id bigserial PRIMARY KEY,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        feature text NOT NULL,
        model text NOT NULL,
        input_tokens integer NOT NULL DEFAULT 0,
        cached_tokens integer NOT NULL DEFAULT 0,
        output_tokens integer NOT NULL DEFAULT 0,
        cost_micros bigint NOT NULL DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS ai_usage_user_month_idx ON ai_usage (user_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS ai_usage_created_idx ON ai_usage (created_at)`,

    // Recruiting outcomes (opt-in sharing with the student's club)
    `CREATE TABLE IF NOT EXISTS outcomes (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        firm varchar(255) NOT NULL,
        role varchar(255),
        stage varchar(30) NOT NULL,
        stage_date varchar(20),
        contact_id text,
        notes text,
        share_with_club boolean NOT NULL DEFAULT false,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS outcomes_user_idx ON outcomes (user_id)`,

    // Review tables, checklists and documents
    `CREATE TABLE IF NOT EXISTS reviews (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title varchar(200) NOT NULL,
        columns jsonb NOT NULL DEFAULT '[]'::jsonb,
        contact_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
        cells jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS reviews_user_idx ON reviews (user_id)`,
    `CREATE TABLE IF NOT EXISTS checklists (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title varchar(200) NOT NULL,
        template_key varchar(60),
        items jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS checklists_user_idx ON checklists (user_id)`,
    `CREATE TABLE IF NOT EXISTS documents (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        kind varchar(40) NOT NULL,
        title varchar(200) NOT NULL,
        contact_id text,
        org_id text,
        body text NOT NULL DEFAULT '',
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS documents_user_idx ON documents (user_id)`,
];
