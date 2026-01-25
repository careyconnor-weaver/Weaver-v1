#!/usr/bin/env node

/**
 * Database Migration Script
 * This script runs database migrations using drizzle-kit push
 * Run this on Render after deployment or as part of the build process
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🔄 Starting database migration...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
    console.error('   Database migrations cannot run without a database connection.');
    process.exit(1);
}

try {
    // Run drizzle-kit push to sync schema with database
    console.log('📦 Running drizzle-kit push to sync database schema...');
    execSync('npm run db:push', {
        stdio: 'inherit',
        cwd: path.resolve(__dirname),
        env: process.env
    });
    
    console.log('✅ Database migration completed successfully!');
    process.exit(0);
} catch (error) {
    console.error('❌ Database migration failed:', error.message);
    console.error('   Please check your DATABASE_URL and ensure the database is accessible.');
    process.exit(1);
}
