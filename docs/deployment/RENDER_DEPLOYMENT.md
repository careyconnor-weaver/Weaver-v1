# Deploy Weaver to Render - Complete Guide

This guide will walk you through deploying your entire Weaver application to Render, making it accessible to everyone on the web.

## Overview

We'll deploy:
1. **PostgreSQL Database** - For storing contacts, users, emails, notes
2. **Web Service** - Your Node.js/Express server
3. **Static Files** - Your HTML, CSS, JavaScript files

## Step 1: Get Your Database Connection Strings

### If you already created the database:

1. Go to [render.com](https://render.com) and log in
2. Click on your PostgreSQL database in the dashboard
3. Find these connection strings:
   - **External Database URL** - Copy this (looks like: `postgresql://user:pass@host:5432/db`)
   - **Internal Database URL** - Copy this too (for Render services)

### If you haven't created the database yet:

1. In Render dashboard, click **"New +"** → **"PostgreSQL"**
2. Fill in:
   - **Name**: `weaver-db`
   - **Region**: Choose closest to you
   - **PostgreSQL Version**: Latest (14 or 15)
   - **Plan**: Free (or Starter for production)
3. Click **"Create Database"**
4. Wait 2-3 minutes
5. Click on the database and copy both connection strings

**Important**: Save both connection strings - you'll need them!

## Step 2: Set Up Database Locally (One-Time Setup)

1. Open your `.env` file (create it if it doesn't exist)

2. Add the **External Database URL**:
   ```bash
   DATABASE_URL=postgresql://user:password@host:5432/database
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/callback
   OPENAI_API_KEY=your_openai_key
   PORT=3000
   ```

3. Create the database tables:
   ```bash
   npm run db:push
   ```

4. Test locally:
   ```bash
   npm start
   ```

## Step 3: Prepare for Deployment

### Create render.yaml (Optional but Recommended)

This file tells Render how to deploy your app:

```yaml
services:
  - type: web
    name: weaver
    env: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: DATABASE_URL
        fromDatabase:
          name: weaver-db
          property: connectionString
      - key: GOOGLE_CLIENT_ID
        sync: false
      - key: GOOGLE_CLIENT_SECRET
        sync: false
      - key: GOOGLE_REDIRECT_URI
        sync: false
      - key: OPENAI_API_KEY
        sync: false

databases:
  - name: weaver-db
    plan: free
```

### Update server.js for Production

Make sure your server uses the PORT from environment:

```javascript
const PORT = process.env.PORT || 3000;
```

This is already set up! ✅

### Update Gmail Redirect URI

You'll need to update your Google OAuth settings:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Find your OAuth 2.0 credentials
3. Add your Render URL to authorized redirect URIs:
   - `https://your-app-name.onrender.com/api/gmail/callback`

## Step 4: Deploy to Render

### Option A: Deploy from GitHub (Recommended)

1. **Push your code to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

2. **In Render Dashboard**:
   - Click **"New +"** → **"Web Service"**
   - Connect your GitHub account (if not connected)
   - Select your `Weaver-v1` repository
   - Click **"Connect"**

3. **Configure the service**:
   - **Name**: `weaver` (or any name)
   - **Region**: Same as your database
   - **Branch**: `main`
   - **Root Directory**: Leave blank (or `.` if needed)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or Starter for production)

4. **Add Environment Variables**:
   Click **"Advanced"** → **"Add Environment Variable"** and add:
   - `NODE_ENV` = `production`
   - `PORT` = `10000` (Render uses this port)
   - `DATABASE_URL` = Paste your **Internal Database URL** from Step 1
   - `GOOGLE_CLIENT_ID` = Your Google Client ID
   - `GOOGLE_CLIENT_SECRET` = Your Google Client Secret
   - `GOOGLE_REDIRECT_URI` = `https://your-app-name.onrender.com/api/gmail/callback`
   - `OPENAI_API_KEY` = Your OpenAI API key

5. **Click "Create Web Service"**

6. **Wait for deployment** (5-10 minutes for first deploy)

### Option B: Deploy with render.yaml

1. Create `render.yaml` in your project root (see Step 3)

2. Push to GitHub:
   ```bash
   git add render.yaml
   git commit -m "Add Render configuration"
   git push origin main
   ```

3. In Render Dashboard:
   - Click **"New +"** → **"Blueprint"**
   - Connect your GitHub repo
   - Render will detect `render.yaml` and deploy automatically

## Step 5: Update Database Tables on Render

After deployment, you need to create tables in your Render database:

1. **Option A: Use Render Shell** (Easiest)
   - In Render dashboard, go to your database
   - Click **"Connect"** → **"Render Shell"**
   - Run: `npm run db:push` (if you have access)
   
2. **Option B: Run Migration Script**
   - SSH into your Render service (if available)
   - Or create a one-time migration endpoint

3. **Option C: Manual Setup** (Recommended for now)
   - I'll create a migration script you can run

## Step 6: Update Gmail OAuth Settings

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add:
   ```
   https://your-app-name.onrender.com/api/gmail/callback
   ```
5. Save changes

## Step 7: Test Your Live Site

1. Your site will be at: `https://your-app-name.onrender.com`
2. Test the homepage
3. Test user signup/login
4. Test adding contacts
5. Test Gmail connection (after updating OAuth settings)

## Troubleshooting

### "Database connection failed"
- Check that `DATABASE_URL` uses the **Internal Database URL** (not external)
- Verify database is running in Render dashboard
- Check environment variables are set correctly

### "Cannot find module"
- Make sure `package.json` has all dependencies
- Check build logs in Render dashboard

### "Port already in use"
- Make sure `PORT` environment variable is set to `10000`
- Render automatically assigns ports, but you should use `process.env.PORT`

### "Gmail OAuth not working"
- Update redirect URI in Google Cloud Console
- Make sure `GOOGLE_REDIRECT_URI` matches your Render URL

### Site is slow to load
- Free tier services spin down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds
- Upgrade to Starter plan ($7/month) to avoid spin-down

## Free Tier Limitations

- ✅ Free PostgreSQL database (90 days, then $7/month)
- ✅ Free web service
- ⚠️ Services spin down after 15 min inactivity (first request is slow)
- ⚠️ 750 hours/month free (enough for always-on with one service)

## Production Recommendations

For a production site, consider:
- **Starter plan** ($7/month) - No spin-down, better performance
- **Custom domain** - Add your own domain name
- **SSL certificate** - Automatically provided by Render
- **Backups** - Enable automatic database backups

## Next Steps After Deployment

1. ✅ Database created and tables set up
2. ✅ Web service deployed
3. ✅ Environment variables configured
4. ⏳ Update frontend to use API (if not already done)
5. ⏳ Test all features
6. ⏳ Set up custom domain (optional)

## Need Help?

- [Render Documentation](https://render.com/docs)
- Check Render dashboard logs for errors
- Render support: support@render.com

