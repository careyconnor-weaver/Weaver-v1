# Database Migration Guide

This guide will help you migrate your Weaver application from localStorage to a PostgreSQL database using Drizzle ORM.

## Prerequisites

1. **PostgreSQL Database**: You need a PostgreSQL database. Options:
   - **Local**: Install PostgreSQL on your machine
   - **Cloud**: Use services like:
     - **[Render](https://render.com)** (Recommended - Free tier available, see `RENDER_SETUP.md`)
     - [Supabase](https://supabase.com) (Free tier available)
     - [Neon](https://neon.tech) (Free tier available)
     - [Railway](https://railway.app) (Free tier available)
     - [Heroku Postgres](https://www.heroku.com/postgres) (Paid)
     - [AWS RDS](https://aws.amazon.com/rds/postgresql/) (Paid)

2. **Database Connection String**: You'll get a connection string like:
   ```
   postgresql://username:password@host:port/database
   ```

## Step 1: Set Up Environment Variables

1. Add your database connection string to `.env`:
   ```bash
   DATABASE_URL=postgresql://username:password@host:port/database
   ```

2. Make sure your `.env` file is in the root directory and contains:
   ```
   DATABASE_URL=your_connection_string_here
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/callback
   OPENAI_API_KEY=your_openai_key
   PORT=3000
   ```

## Step 2: Generate and Run Database Migrations

1. **Generate migration files**:
   ```bash
   npm run db:generate
   ```
   This creates migration files in the `drizzle/` directory.

2. **Push schema to database** (recommended for development):
   ```bash
   npm run db:push
   ```
   This directly applies the schema to your database.

   OR **Run migrations** (recommended for production):
   ```bash
   npm run db:migrate
   ```

## Step 3: Verify Database Setup

1. Check that tables were created:
   - `users`
   - `contacts`
   - `emails`
   - `notes`
   - `gmail_tokens`

2. You can verify by connecting to your database and running:
   ```sql
   \dt
   ```
   (in psql) or checking your database dashboard.

## Step 4: Migrate Existing Data (Optional)

If you have existing data in localStorage, you'll need to migrate it. Here's a script to help:

**Create `migrate-data.js`**:
```javascript
const { db } = require('./db/index');
const dbAPI = require('./db/api');
const fs = require('fs');
const path = require('path');

async function migrateLocalStorageData() {
    // This script would read localStorage data and migrate it
    // Since localStorage is browser-only, you'll need to:
    // 1. Export data from browser console
    // 2. Import it here
    // 3. Use dbAPI functions to insert into database
    
    console.log('Migration script - implement based on your data export');
}

migrateLocalStorageData();
```

**To export localStorage data from browser console**:
```javascript
// Run this in browser console on your Weaver site
const users = JSON.parse(localStorage.getItem('weaver_users') || '{}');
const currentUser = JSON.parse(localStorage.getItem('weaver_current_user') || 'null');
const contacts = JSON.parse(localStorage.getItem(`weaver_contacts_${currentUser?.id}`) || '[]');

console.log(JSON.stringify({ users, currentUser, contacts }, null, 2));
// Copy the output and save to a file
```

## Step 5: Update Frontend to Use API

The frontend (`script.js`) currently uses localStorage. You'll need to:

1. **Replace `getContacts()`** to fetch from API:
   ```javascript
   async function getContacts() {
       const currentUser = getCurrentUser();
       if (!currentUser) return [];
       
       try {
           const response = await fetch(`/api/contacts?userId=${currentUser.id}`);
           const data = await response.json();
           return data.success ? data.contacts : [];
       } catch (error) {
           console.error('Error fetching contacts:', error);
           return [];
       }
   }
   ```

2. **Replace `saveContacts()`** to save via API:
   ```javascript
   async function saveContacts(contacts) {
       // For each contact, update via API
       // This is more complex - you may want to batch updates
   }
   ```

3. **Update all contact operations** to use API endpoints instead of localStorage.

## Step 6: Update Gmail Token Storage

The Gmail token storage in `server.js` currently uses a file. Update it to use the database:

```javascript
// In server.js, replace userTokens object with:
const getGmailToken = async (userId) => {
    return await dbAPI.getGmailToken(userId);
};

const saveGmailToken = async (userId, tokens) => {
    return await dbAPI.saveGmailToken(userId, tokens);
};
```

## Database Schema Overview

### Users Table
- `id` (text, primary key)
- `email` (varchar, unique)
- `password` (text) - **⚠️ Should be hashed in production!**
- `created_at` (timestamp)

### Contacts Table
- `id` (text, primary key)
- `user_id` (text, foreign key → users.id)
- `name` (varchar)
- `email` (varchar)
- `firm`, `company`, `position`, `phone`, `location` (varchar)
- `priority` (varchar)
- `vip` (boolean)
- `first_email_date` (varchar)
- `general_notes` (text)
- `created_at`, `updated_at` (timestamp)

### Emails Table
- `id` (text, primary key)
- `contact_id` (text, foreign key → contacts.id, cascade delete)
- `date` (varchar)
- `direction` (varchar: 'sent' or 'received')
- `type` (varchar: 'cold', 'follow-up', 'received')
- `subject` (text)
- `created_at` (timestamp)

### Notes Table
- `id` (text, primary key)
- `contact_id` (text, foreign key → contacts.id, cascade delete)
- `date` (varchar)
- `summary` (text)
- `extracted_text` (text)
- `image_url` (text)
- `is_text_note` (boolean)
- `created_at` (timestamp)

### Gmail Tokens Table
- `user_id` (text, primary key, foreign key → users.id, cascade delete)
- `access_token` (text)
- `refresh_token` (text)
- `expiry_date` (timestamp)
- `token_type` (varchar)
- `scope` (text)
- `created_at`, `updated_at` (timestamp)

## Security Notes

1. **Password Hashing**: Currently passwords are stored in plain text. In production, use `bcrypt`:
   ```bash
   npm install bcrypt
   ```
   Then hash passwords before storing.

2. **Environment Variables**: Never commit `.env` to Git. It's already in `.gitignore`.

3. **Database Connection**: Use connection pooling (already configured in `db/index.js`).

4. **API Authentication**: Consider adding JWT tokens or session management for API routes.

## Troubleshooting

### "Connection refused" error
- Check your `DATABASE_URL` is correct
- Ensure your database is running
- Check firewall/network settings if using cloud database

### "Table does not exist" error
- Run `npm run db:push` to create tables
- Check that migrations ran successfully

### "Foreign key constraint" error
- Ensure users exist before creating contacts
- Check that contact IDs match when adding emails/notes

## Next Steps

1. ✅ Install Drizzle and PostgreSQL driver
2. ✅ Create database schema
3. ✅ Set up database connection
4. ✅ Create API endpoints
5. ⏳ Update frontend to use API (requires frontend changes)
6. ⏳ Migrate existing localStorage data
7. ⏳ Test all functionality
8. ⏳ Deploy to production

## Quick Start Commands

```bash
# Install dependencies
npm install

# Set up .env with DATABASE_URL
# Then generate and push schema
npm run db:push

# Start server
npm start
```

## Need Help?

- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- Check server logs for detailed error messages

