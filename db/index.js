const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
require('dotenv').config();

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
    console.warn('⚠️  WARNING: DATABASE_URL environment variable is not set!');
    console.warn('   Database features will not work without a valid connection string.');
}

// Create pool with error handling
let pool;
let db;

try {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL?.includes('render.com') || process.env.DATABASE_URL?.includes('dpg-') 
            ? { rejectUnauthorized: false } 
            : false,
    });

    // Handle pool errors gracefully
    pool.on('error', (err) => {
        console.error('Unexpected database pool error:', err);
    });

    db = drizzle(pool);
} catch (error) {
    console.error('Failed to initialize database connection:', error.message);
    // Don't throw - allow server to start even if DB connection fails
    // Individual API endpoints will handle database errors
}

module.exports = { db, pool };

