const { pgTable, text, timestamp, boolean, jsonb, varchar, integer } = require('drizzle-orm/pg-core');

// Users table
const users = pgTable('users', {
    id: text('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: text('password').notNull(), // In production, should be hashed
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    // Onboarding / account type: 'student' or 'org' (club / organization). Null until onboarding is completed.
    accountType: text('account_type'), // 'student' | 'org'
    onboardedAt: timestamp('onboarded_at', { mode: 'date' }),
    // Stripe subscription fields
    stripeCustomerId: text('stripe_customer_id'), // Stripe customer ID
    stripeSubscriptionId: text('stripe_subscription_id'), // Stripe subscription ID
    subscriptionStatus: text('subscription_status').default('free'), // free, active, canceled, past_due
    subscriptionPlan: text('subscription_plan'), // monthly, yearly, etc.
    subscriptionCurrentPeriodEnd: timestamp('subscription_current_period_end'),
});

// ============ CLUB / ORGANIZATION (enterprise) ============

// Organizations (clubs / orgs). Created by an 'org' account; students join via joinCode.
const organizations = pgTable('organizations', {
    id: text('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    joinCode: varchar('join_code', { length: 20 }).notNull().unique(), // shareable code students enter to join
    ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    school: varchar('school', { length: 255 }),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Org membership — the roster. One row per (org, user). This is the core network-effect asset:
// a member's standing, roster and peer comparison all hang off this row, so leaving is costly.
const orgMembers = pgTable('org_members', {
    id: text('id').primaryKey(),
    orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).default('member'), // 'owner' | 'admin' | 'member'
    displayName: varchar('display_name', { length: 255 }),
    joinedAt: timestamp('joined_at', { mode: 'date' }).defaultNow().notNull(),
});

// Pending invites sent by an org to an email address.
const orgInvites = pgTable('org_invites', {
    id: text('id').primaryKey(),
    orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    invitedBy: text('invited_by').references(() => users.id, { onDelete: 'set null' }),
    status: varchar('status', { length: 20 }).default('pending'), // 'pending' | 'accepted'
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Contacts table
const contacts = pgTable('contacts', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    firm: varchar('firm', { length: 255 }),
    company: varchar('company', { length: 255 }),
    position: varchar('position', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    location: varchar('location', { length: 255 }),
    priority: varchar('priority', { length: 20 }), // 'low', 'medium', 'high'
    vip: boolean('vip').default(false),
    firstEmailDate: varchar('first_email_date', { length: 50 }),
    generalNotes: text('general_notes'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// Emails table (interactions)
const emails = pgTable('emails', {
    id: text('id').primaryKey(),
    contactId: text('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
    date: varchar('date', { length: 50 }).notNull(),
    direction: varchar('direction', { length: 20 }).notNull(), // 'sent' or 'received'
    type: varchar('type', { length: 20 }), // 'cold', 'follow-up', 'received'
    subject: text('subject'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Notes table (call notes)
const notes = pgTable('notes', {
    id: text('id').primaryKey(),
    contactId: text('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
    date: varchar('date', { length: 50 }).notNull(),
    summary: text('summary').notNull(),
    extractedText: text('extracted_text'),
    imageUrl: text('image_url'),
    isTextNote: boolean('is_text_note').default(false),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Gmail tokens table
const gmailTokens = pgTable('gmail_tokens', {
    userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token'),
    expiryDate: timestamp('expiry_date', { mode: 'date' }),
    tokenType: varchar('token_type', { length: 50 }),
    scope: text('scope'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// Assistant settings table
const assistantSettings = pgTable('assistant_settings', {
    userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
    coldContactDays: integer('cold_contact_days').default(12),
    establishedContactDays: integer('established_contact_days').default(90),
    reminderColdContacts: boolean('reminder_cold_contacts').default(true),
    reminderEstablishedContacts: boolean('reminder_established_contacts').default(true),
    vipOnly: boolean('vip_only').default(false),
    emailFrequency: varchar('email_frequency', { length: 20 }).default('realtime'), // 'realtime' or 'weekly'
    emailTime: varchar('email_time', { length: 10 }).default('09:00'), // HH:MM format
    emailTimezone: varchar('email_timezone', { length: 50 }).default('America/New_York'),
    enabled: boolean('enabled').default(true),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// User profile settings table
const userSettings = pgTable('user_settings', {
    userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    profilePhoto: text('profile_photo'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

module.exports = {
    users,
    contacts,
    emails,
    notes,
    gmailTokens,
    assistantSettings,
    userSettings,
    organizations,
    orgMembers,
    orgInvites,
};

