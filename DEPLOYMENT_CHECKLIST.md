# Deployment Checklist - Final Steps

## ✅ Completed
- [x] Database connection strings obtained
- [x] DATABASE_URL added to .env
- [x] Database tables created successfully
- [x] SSL connection configured
- [x] render.yaml configured with Internal Database URL

## 🚀 Next Steps to Deploy

### Step 1: Push Code to GitHub

```bash
git add .
git commit -m "Configure for Render deployment"
git push origin main
```

### Step 2: Deploy Web Service on Render

1. **Go to [render.com](https://render.com)** and log in

2. **Click "New +" → "Web Service"**

3. **Connect GitHub** (if not already):
   - Click "Connect GitHub" or "Connect account"
   - Authorize Render to access your repositories
   - Select your `Weaver-v1` repository

4. **Configure the service**:
   - **Name**: `weaver` (or any name you like)
   - **Region**: `Ohio` (same as your database)
   - **Branch**: `main`
   - **Root Directory**: Leave blank
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free` (or `Starter` for production)

5. **Add Environment Variables**:
   Click "Advanced" → "Add Environment Variable" and add these:

   ```
   NODE_ENV = production
   PORT = 10000
   DATABASE_URL = postgresql://weaver_user:YOUR_PASSWORD@dpg-d52dup63jp1c73c1ms2g-a/weaver?sslmode=require
   GOOGLE_CLIENT_ID = YOUR_GOOGLE_CLIENT_ID
   GOOGLE_CLIENT_SECRET = YOUR_GOOGLE_CLIENT_SECRET
   GOOGLE_REDIRECT_URI = https://your-app-name.onrender.com/api/gmail/callback
   OPENAI_API_KEY = YOUR_OPENAI_API_KEY
   ```

   **Important**: 
   - Use the **Internal Database URL** (without `.ohio-postgres.render.com`)
   - Replace `your-app-name` in `GOOGLE_REDIRECT_URI` with your actual Render service name

6. **Click "Create Web Service"**

7. **Wait for deployment** (5-10 minutes for first deploy)

### Step 3: Update Google OAuth Settings

After deployment, you'll get a URL like: `https://weaver-xxxx.onrender.com`

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add:
   ```
   https://your-actual-render-url.onrender.com/api/gmail/callback
   ```
5. Save changes

### Step 4: Test Your Live Site

1. Visit your Render URL: `https://your-app-name.onrender.com`
2. Test user signup/login
3. Test adding contacts
4. Test Gmail connection (after updating OAuth)

## Environment Variables Summary

For Render deployment, use these values:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `DATABASE_URL` | `postgresql://weaver_user:YOUR_PASSWORD@dpg-d52dup63jp1c73c1ms2g-a/weaver?sslmode=require` |
| `GOOGLE_CLIENT_ID` | `YOUR_GOOGLE_CLIENT_ID` |
| `GOOGLE_CLIENT_SECRET` | `YOUR_GOOGLE_CLIENT_SECRET` |
| `GOOGLE_REDIRECT_URI` | `https://YOUR-APP-NAME.onrender.com/api/gmail/callback` |
| `OPENAI_API_KEY` | `YOUR_OPENAI_API_KEY` |

## Troubleshooting

### "Database connection failed"
- Make sure you're using the **Internal Database URL** (without `.ohio-postgres.render.com`)
- Check that `?sslmode=require` is at the end

### "Port already in use"
- Make sure `PORT=10000` is set in environment variables

### Site takes 30-60 seconds to load
- Free tier services spin down after 15 minutes of inactivity
- First request after spin-down is slow
- Upgrade to Starter plan ($7/month) to avoid spin-down

## Your Site Will Be Live At:

`https://your-app-name.onrender.com`

(Replace `your-app-name` with whatever you name your service in Render)

