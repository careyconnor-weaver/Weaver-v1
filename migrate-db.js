/**
 * Database Migration Script
 * Run this once after deploying to Render to create all tables
 * 
 * Usage:
 * 1. Set DATABASE_URL in environment
 * 2. Run: node migrate-db.js
 */

require('dotenv').config();
const { db } = require('./db/index');
const { users, contacts, emails, notes, gmailTokens } = require('./db/schema');

async function migrate() {
    try {
        console.log('Starting database migration...');
        console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set ✓' : 'Missing ✗');
        
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL environment variable is not set');
        }

        // Test connection
        console.log('Testing database connection...');
        const { pool } = require('./db/index');
        await pool.query('SELECT NOW()');
        console.log('✓ Database connection successful');

        // Push schema (create tables)
        console.log('Creating tables...');
        const { drizzle } = require('drizzle-orm/node-postgres');
        const { sql } = require('drizzle-orm');
        
        // Create tables using SQL
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW() NOT NULL
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS contacts (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                firm VARCHAR(255),
                company VARCHAR(255),
                position VARCHAR(255),
                phone VARCHAR(50),
                location VARCHAR(255),
                priority VARCHAR(20),
                vip BOOLEAN DEFAULT FALSE,
                first_email_date VARCHAR(50),
                general_notes TEXT,
                created_at TIMESTAMP DEFAULT NOW() NOT NULL,
                updated_at TIMESTAMP DEFAULT NOW() NOT NULL
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS emails (
                id TEXT PRIMARY KEY,
                contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
                date VARCHAR(50) NOT NULL,
                direction VARCHAR(20) NOT NULL,
                type VARCHAR(20),
                subject TEXT,
                created_at TIMESTAMP DEFAULT NOW() NOT NULL
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
                date VARCHAR(50) NOT NULL,
                summary TEXT NOT NULL,
                extracted_text TEXT,
                image_url TEXT,
                is_text_note BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW() NOT NULL
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS gmail_tokens (
                user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                access_token TEXT NOT NULL,
                refresh_token TEXT,
                expiry_date TIMESTAMP,
                token_type VARCHAR(50),
                scope TEXT,
                created_at TIMESTAMP DEFAULT NOW() NOT NULL,
                updated_at TIMESTAMP DEFAULT NOW() NOT NULL
            );
        `);

        console.log('✓ All tables created successfully!');
        console.log('\nMigration complete! Your database is ready to use.');
        
        process.exit(0);
    } catch (error) {
        console.error('✗ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

migrate();

