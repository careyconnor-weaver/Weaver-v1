#!/usr/bin/env node

/**
 * Database Migration Script - Adds Stripe columns to existing users table
 * This script safely adds columns if they don't exist
 */

const { Pool } = require('pg');
require('dotenv').config();

async function migrate() {
    console.log('🔄 Starting database migration...');
    
    if (!process.env.DATABASE_URL) {
        console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL?.includes('render.com') || process.env.DATABASE_URL?.includes('dpg-') 
            ? { rejectUnauthorized: false } 
            : false,
    });

    const client = await pool.connect();

    try {
        console.log('📦 Checking users table structure...');
        
        // Check if columns exist
        const checkColumns = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name IN ('stripe_customer_id', 'stripe_subscription_id', 'subscription_status', 'subscription_plan', 'subscription_current_period_end')
        `);

        const existingColumns = checkColumns.rows.map(row => row.column_name);
        console.log('Existing Stripe columns:', existingColumns.length > 0 ? existingColumns.join(', ') : 'None');

        // Add columns that don't exist
        const columnsToAdd = [
            { name: 'stripe_customer_id', type: 'text' },
            { name: 'stripe_subscription_id', type: 'text' },
            { name: 'subscription_status', type: 'text DEFAULT \'free\'' },
            { name: 'subscription_plan', type: 'text' },
            { name: 'subscription_current_period_end', type: 'timestamp' }
        ];

        for (const column of columnsToAdd) {
            if (!existingColumns.includes(column.name)) {
                console.log(`  ➕ Adding column: ${column.name}`);
                await client.query(`
                    ALTER TABLE users 
                    ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}
                `);
                console.log(`  ✅ Added column: ${column.name}`);
            } else {
                console.log(`  ✓ Column already exists: ${column.name}`);
            }
        }

        // Create user_settings table if it doesn't exist
        console.log('\n📦 Checking user_settings table...');
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'user_settings'
            );
        `);
        if (!tableCheck.rows[0].exists) {
            console.log('  ➕ Creating user_settings table...');
            await client.query(`
                CREATE TABLE user_settings (
                    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                    first_name VARCHAR(100),
                    last_name VARCHAR(100),
                    profile_photo TEXT,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
                );
            `);
            console.log('  ✅ Created user_settings table');
        } else {
            console.log('  ✓ user_settings table already exists');
        }

        // Club / Organization (enterprise) feature
        console.log('\n📦 Checking club/organization schema...');
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type text`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarded_at timestamp`);
        await client.query(`
            CREATE TABLE IF NOT EXISTS organizations (
                id text PRIMARY KEY,
                name varchar(255) NOT NULL,
                join_code varchar(20) NOT NULL UNIQUE,
                owner_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                school varchar(255),
                created_at timestamp DEFAULT now() NOT NULL
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS org_members (
                id text PRIMARY KEY,
                org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role varchar(20) DEFAULT 'member',
                display_name varchar(255),
                joined_at timestamp DEFAULT now() NOT NULL
            )
        `);
        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS org_members_org_user_idx ON org_members (org_id, user_id)`);
        await client.query(`
            CREATE TABLE IF NOT EXISTS org_invites (
                id text PRIMARY KEY,
                org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                email varchar(255) NOT NULL,
                invited_by text REFERENCES users(id) ON DELETE SET NULL,
                status varchar(20) DEFAULT 'pending',
                created_at timestamp DEFAULT now() NOT NULL
            )
        `);
        console.log('  ✅ Club/organization schema ready');

        console.log('✅ Database migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Database migration failed:', error.message);
        console.error('Error details:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
