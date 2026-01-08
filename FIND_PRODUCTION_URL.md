# How to Find Your Production URL

## Quick Steps

1. **Go to Render Dashboard**: https://render.com
2. **Log in** to your account
3. **Click on your web service** (the one named "weaver" or whatever you named it)
4. **Look at the top of the page** - your production URL is displayed there

## What Your Production URL Looks Like

Your production URL will be in this format:
```
https://[service-name]-[random-id].onrender.com
```

**Examples:**
- `https://weaver-abc123.onrender.com`
- `https://weaver-xyz789.onrender.com`
- `https://weaver-d52dup63.onrender.com`

## Where to Find It

### Option 1: Service Dashboard
1. In Render dashboard, click on your web service
2. The URL is shown at the top, usually next to a "Visit Site" button
3. It looks like: `https://weaver-xxxx.onrender.com`

### Option 2: Service Settings
1. Click on your web service
2. Go to **Settings** tab
3. Look for **"Service URL"** or **"Public URL"**

### Option 3: Events/Logs
1. Click on your web service
2. Go to **Events** or **Logs** tab
3. Look for deployment messages - they often show the URL

## What to Do With It

Once you have your production URL, you need to:

1. **Add it to Google Cloud Console**:
   - Go to Google Cloud Console → APIs & Services → Credentials
   - Click your OAuth 2.0 Client ID
   - Add redirect URI: `https://your-actual-url.onrender.com/api/gmail/callback`

2. **Update Render Environment Variable**:
   - In Render → Your Service → Environment
   - Update `GOOGLE_REDIRECT_URI` to: `https://your-actual-url.onrender.com/api/gmail/callback`

## Still Can't Find It?

If you haven't deployed your web service yet:
1. You need to create a web service first (see `RENDER_DEPLOYMENT.md`)
2. Once deployed, the URL will be automatically generated
3. It will appear in your service dashboard

If your service is deployed but you can't see the URL:
- Check that the service status is "Live" (not "Building" or "Failed")
- The URL is always shown on the main service page

