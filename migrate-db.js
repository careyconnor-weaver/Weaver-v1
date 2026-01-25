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
