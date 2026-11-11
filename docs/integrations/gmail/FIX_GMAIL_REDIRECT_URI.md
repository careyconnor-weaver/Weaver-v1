# Fix Gmail Redirect URI Mismatch Error

## The Problem
You're getting `Error 400: redirect_uri_mismatch` because the redirect URI in Google Cloud Console doesn't match what your app is using.

## Quick Fix Steps

### Step 1: Find Your Actual Production URL

1. Go to https://render.com and log in
2. Click on your "weaver" web service
3. Look at the top of the page - your URL will be displayed
4. It might be:
   - `https://weaver.onrender.com` (if you have a custom name)
   - `https://weaver-xxxx.onrender.com` (if auto-generated)
   
**Copy this exact URL** - you'll need it!

### Step 2: Add Redirect URI to Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Click on your **OAuth 2.0 Client ID** (the one for Weaver)
5. Scroll down to **Authorized redirect URIs**
6. Click **"+ ADD URI"**
7. Enter: `https://YOUR-ACTUAL-URL.onrender.com/api/gmail/callback`
   - Replace `YOUR-ACTUAL-URL` with your actual Render URL
   - Example: If your URL is `https://weaver-abc123.onrender.com`, enter:
     ```
     https://weaver-abc123.onrender.com/api/gmail/callback
     ```
8. Click **"SAVE"** at the bottom

### Step 3: Update Render Environment Variable

1. In Render dashboard, click on your "weaver" service
2. Go to **Environment** tab
3. Find `GOOGLE_REDIRECT_URI` (or add it if missing)
4. Set the value to: `https://YOUR-ACTUAL-URL.onrender.com/api/gmail/callback`
   - Use the SAME URL you added to Google Cloud Console
5. Click **"Save Changes"**
6. Render will automatically redeploy (takes 2-5 minutes)

### Step 4: Verify Both Match Exactly

**Critical**: The redirect URI must match EXACTLY in both places:
- ✅ Google Cloud Console: `https://weaver-xxxx.onrender.com/api/gmail/callback`
- ✅ Render Environment: `https://weaver-xxxx.onrender.com/api/gmail/callback`

**Common mistakes to avoid:**
- ❌ Trailing slash: `https://weaver-xxxx.onrender.com/api/gmail/callback/` (WRONG)
- ❌ Missing `/api`: `https://weaver-xxxx.onrender.com/gmail/callback` (WRONG)
- ❌ Wrong protocol: `http://weaver-xxxx.onrender.com/api/gmail/callback` (WRONG - must be https)
- ❌ Extra spaces or quotes

### Step 5: Test Again

1. Wait for Render to finish redeploying (check the Events tab)
2. Visit your production website
3. Try connecting Gmail again
4. It should work now!

## Still Getting the Error?

### Check OAuth Consent Screen Status

If your app is in "Testing" mode:
1. Go to **APIs & Services** → **OAuth consent screen**
2. Add your email (`careycr@bc.edu`) to **Test users**
3. Or publish your app to production (if you want anyone to use it)

### Verify Environment Variables in Render

Make sure these are all set correctly:
- `GOOGLE_CLIENT_ID` - Your Client ID from Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - Your Client Secret from Google Cloud Console  
- `GOOGLE_REDIRECT_URI` - Must match Google Cloud Console exactly

### Check Render Logs

1. In Render dashboard, go to **Logs** tab
2. Look for any errors related to Gmail or OAuth
3. The logs will show what redirect URI is being used

## Quick Checklist

- [ ] Found actual production URL from Render dashboard
- [ ] Added exact redirect URI to Google Cloud Console (Authorized redirect URIs)
- [ ] Updated `GOOGLE_REDIRECT_URI` in Render environment variables
- [ ] Both URIs match exactly (no trailing slashes, correct protocol)
- [ ] Added test user email if app is in testing mode
- [ ] Waited for Render to redeploy
- [ ] Tested Gmail connection again
