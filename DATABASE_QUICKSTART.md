# Database Quick Start Guide

## What's Been Set Up

✅ **Drizzle ORM installed** - Database ORM for PostgreSQL  
✅ **Database schema created** - Tables for users, contacts, emails, notes, and Gmail tokens  
✅ **Database API created** - Functions to interact with the database  
✅ **API endpoints added** - REST API routes in `server.js`  
✅ **Migration guide created** - See `DATABASE_MIGRATION.md` for details

## Files Created

- `db/schema.js` - Database table definitions
- `db/index.js` - Database connection setup
- `db/api.js` - Database query functions
- `drizzle.config.js` - Drizzle configuration
- `DATABASE_MIGRATION.md` - Complete migration guide

## Next Steps

### 1. Set Up Your Database

Choose one of these options:

**Option A: Render PostgreSQL (Recommended - Free tier available)**
1. Go to [render.com](https://render.com)
2. Sign up for a free account
3. Click "New +" → "PostgreSQL"
4. Fill in:
   - **Name**: `weaver-db` (or any name you like)
   - **Database**: `weaver` (or leave default)
   - **User**: `weaver_user` (or leave default)
   - **Region**: Choose closest to you
   - **PostgreSQL Version**: Latest (14 or 15)
   - **Plan**: Free (or Starter for production)
5. Click "Create Database"
6. Wait 2-3 minutes for database to provision
7. Once ready, click on your database
8. Find the **"Internal Database URL"** or **"Connection String"** in the dashboard
9. Copy the connection string (looks like: `postgresql://weaver_user:[password]@[host]:5432/weaver`)

**Option B: Supabase (Free)**
1. Go to [supabase.com](https://supabase.com)
2. Create a free account
3. Create a new project
4. Go to Settings → Database
5. Copy the connection string (looks like: `postgresql://postgres:[password]@[host]:5432/postgres`)

**Option C: Neon (Free)**
1. Go to [neon.tech](https://neon.tech)
2. Sign up for free
3. Create a new project
4. Copy the connection string

**Option D: Local PostgreSQL**
1. Install PostgreSQL on your machine
2. Create a database: `createdb weaver`
3. Connection string: `postgresql://localhost:5432/weaver`

### 2. Add Database URL to .env

Add this line to your `.env` file:

```bash
DATABASE_URL=postgresql://username:password@host:port/database
```

Replace with your actual connection string.

### 3. Create Database Tables

Run this command to create all tables:

```bash
npm run db:push
```

This will create:
- `users` table
- `contacts` table
- `emails` table
- `notes` table
- `gmail_tokens` table

### 4. Test the Setup

Start your server:

```bash
npm start
```

The server should start without errors. If you see database connection errors, check your `DATABASE_URL` in `.env`.

### 5. Update Frontend (Coming Next)

The frontend (`script.js`) still uses localStorage. You'll need to:

1. Replace `getContacts()` to fetch from `/api/contacts`
2. Replace `saveContacts()` to save via API
3. Update all contact operations to use API endpoints

See `DATABASE_MIGRATION.md` for detailed instructions.

## API Endpoints Available

### Users
- `POST /api/users/signup` - Create new user
- `POST /api/users/login` - Login user

### Contacts
- `GET /api/contacts?userId=xxx` - Get all contacts for user
- `GET /api/contacts/:contactId?userId=xxx` - Get single contact
- `POST /api/contacts` - Create new contact
- `PUT /api/contacts/:contactId` - Update contact
- `DELETE /api/contacts/:contactId?userId=xxx` - Delete contact
- `DELETE /api/contacts?userId=xxx` - Delete all contacts

### Emails
- `POST /api/contacts/:contactId/emails` - Add email interaction

### Notes
- `POST /api/contacts/:contactId/notes` - Add call note

## Current Status

✅ **Backend Ready** - Database and API are set up  
⏳ **Frontend Pending** - Still needs to be updated to use API instead of localStorage

## Troubleshooting

**"Cannot find module './db/api'"**
- Make sure all files in `db/` directory exist
- Restart the server

**"Connection refused"**
- Check your `DATABASE_URL` is correct
- Make sure your database is running
- Check firewall settings if using cloud database

**"Table does not exist"**
- Run `npm run db:push` to create tables

## Need Help?

Check `DATABASE_MIGRATION.md` for detailed instructions and troubleshooting.

