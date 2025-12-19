# Setting Up Render PostgreSQL Database for Weaver

This guide walks you through setting up a PostgreSQL database on Render and connecting it to your Weaver application.

## What is Render?

Render is a cloud platform that provides:
- **Web Services** - Host your Node.js/Express apps
- **PostgreSQL Databases** - Managed PostgreSQL (what we'll use)
- **Static Sites** - Host frontend apps
- **Background Workers** - Run scheduled tasks

For this setup, we're using **Render's PostgreSQL database service**.

## Step-by-Step Setup

### Step 1: Create a Render Account

1. Go to [render.com](https://render.com)
2. Click "Get Started for Free"
3. Sign up with:
   - Email address, OR
   - GitHub account (recommended - easier integration)

### Step 2: Create a PostgreSQL Database

1. Once logged in, click the **"New +"** button in the top right
2. Select **"PostgreSQL"** from the dropdown

3. Fill in the database configuration:
   - **Name**: `weaver-db` (or any name you prefer)
   - **Database**: `weaver` (or leave as default)
   - **User**: `weaver_user` (or leave as default)
   - **Region**: Choose the region closest to you (e.g., `Oregon (US West)` for US)
   - **PostgreSQL Version**: Select the latest version (14 or 15)
   - **Plan**: 
     - **Free**: 90 days free trial, then $7/month (good for development)
     - **Starter**: $20/month (better for production)
   - **Databases**: Leave as default (1)

4. Click **"Create Database"**

5. Wait 2-3 minutes for Render to provision your database

### Step 3: Get Your Connection String

1. Once the database is ready, click on it in your dashboard

2. You'll see several connection details. Look for:
   - **"Internal Database URL"** - Use this if hosting on Render
   - **"External Connection String"** - Use this for local development
   - **"Connection Pooling"** - Optional, for production

3. The connection string looks like:
   ```
   postgresql://weaver_user:password123@dpg-xxxxx-a.oregon-postgres.render.com:5432/weaver_xxxx
   ```

4. **Copy the External Connection String** (for local development)

### Step 4: Add to Your .env File

1. Open your `.env` file in the Weaver project root

2. Add the connection string:
   ```bash
   DATABASE_URL=postgresql://weaver_user:password123@dpg-xxxxx-a.oregon-postgres.render.com:5432/weaver_xxxx
   ```

   **Important**: Replace the entire connection string with the one you copied from Render!

3. Save the file

### Step 5: Create Database Tables

1. Open your terminal in the Weaver directory

2. Run:
   ```bash
   npm run db:push
   ```

3. You should see output like:
   ```
   ✓ Tables created successfully
   ```

4. If you see errors:
   - Check that your `DATABASE_URL` is correct
   - Make sure there are no extra spaces or quotes
   - Verify the database is running in Render dashboard

### Step 6: Verify Setup

1. Start your server:
   ```bash
   npm start
   ```

2. Check the console for any database connection errors

3. If you see "Weaver server running", you're good to go!

4. Test the API:
   ```bash
   curl http://localhost:3000/api/health
   ```

## Render Dashboard Features

Once your database is set up, you can:

- **View Database Info**: See connection details, status, and metrics
- **View Logs**: Check database logs for errors
- **Restart Database**: Restart if needed
- **Upgrade Plan**: Scale up when needed
- **Backups**: Automatic backups (on paid plans)

## Connection String Formats

Render provides different connection strings:

1. **External Connection String** (for local development):
   ```
   postgresql://user:password@host:5432/database
   ```
   Use this in your `.env` file when developing locally.

2. **Internal Database URL** (for Render-hosted apps):
   ```
   postgresql://user:password@host:5432/database
   ```
   Use this if you deploy your Weaver app to Render as a web service.

3. **Connection Pooling URL** (for production):
   ```
   postgresql://user:password@host:5432/database?sslmode=require
   ```
   Better for high-traffic applications.

## Security Notes

⚠️ **Important Security Tips**:

1. **Never commit `.env` to Git** - It's already in `.gitignore`
2. **Use Environment Variables** - In production, set `DATABASE_URL` as an environment variable
3. **Rotate Passwords** - Change database password periodically in Render dashboard
4. **Use SSL** - Render databases use SSL by default

## Troubleshooting

### "Connection refused" error
- Check that your database is running in Render dashboard
- Verify the connection string is correct
- Make sure you're using the **External** connection string for local development

### "Authentication failed" error
- Check username and password in connection string
- Reset password in Render dashboard if needed

### "Database does not exist" error
- Verify the database name in the connection string
- Check that the database was created successfully in Render

### "SSL required" error
- Add `?sslmode=require` to the end of your connection string:
  ```
  DATABASE_URL=postgresql://...?sslmode=require
  ```

## Free Tier Limitations

Render's free PostgreSQL tier includes:
- ✅ 90 days free
- ✅ 1 GB storage
- ✅ 256 MB RAM
- ✅ Automatic backups
- ⚠️ Database spins down after 90 days of inactivity (free tier only)
- ⚠️ $7/month after free trial

**For production**, consider the Starter plan ($20/month) which doesn't spin down.

## Next Steps

Once your database is set up:

1. ✅ Database created on Render
2. ✅ Connection string added to `.env`
3. ✅ Tables created with `npm run db:push`
4. ⏳ Update frontend to use API (see `DATABASE_MIGRATION.md`)

## Need Help?

- [Render Documentation](https://render.com/docs)
- [Render PostgreSQL Guide](https://render.com/docs/databases)
- Check Render dashboard for database status and logs

