# Gmail OAuth Production Setup Guide

This guide will help you configure Gmail OAuth for production use with multiple users on your live website.

## Current Status

✅ **Token Storage**: Already configured to store tokens per user in the database (using `gmail_tokens` table)  
✅ **User-Specific**: Each user has their own Gmail connection  
⚠️ **OAuth Configuration**: Needs to be updated for production URL

## Step 1: Get Your Production URL

1. Go to your Render dashboard: https://render.com
2. Click on your Weaver web service
3. Copy your production URL (e.g., `https://weaver-xxxx.onrender.com`)

## Step 2: Update Google Cloud Console OAuth Settings

### A. Add Production Redirect URI

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (the one with your Gmail API credentials)
3. Navigate to **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID (the one you created for Weaver)
5. Under **Authorized redirect URIs**, you should see:
   - `http://localhost:3000/api/gmail/callback` (for local development)

6. **Add your production redirect URI**:
   - Click **"+ ADD URI"**
   - Enter: `https://your-actual-render-url.onrender.com/api/gmail/callback`
   - Replace `your-actual-render-url` with your actual Render service name
   - Example: `https://weaver-xxxx.onrender.com/api/gmail/callback`
   - Click **"SAVE"**

### B. Update OAuth Consent Screen (If Needed)

For production with multiple users, you may need to publish your OAuth consent screen:

1. Go to **APIs & Services** → **OAuth consent screen**
2. Check the current status:
   - **"Testing"** = Only works for test users you've added
   - **"In production"** = Works for any Google user

3. **If still in Testing mode:**
   - Review all sections (App information, Scopes, Test users)
   - Click **"PUBLISH APP"** button
   - Confirm the publishing
   - ⚠️ **Note**: Publishing makes your app available to all Google users. Make sure your app information is accurate.

4. **Scopes Required:**
   - `https://www.googleapis.com/auth/gmail.readonly` (Read emails)
   - `https://www.googleapis.com/auth/gmail.send` (Send emails - if you add this feature)

## Step 3: Add/Update Environment Variables in Render

1. **Go to your Render dashboard**: https://render.com
2. **Click on your Weaver web service** (the one you deployed)
3. **Click on the "Environment" tab** (in the left sidebar or top menu)
4. **Scroll down** to see all your environment variables

5. **Add or Update `GOOGLE_REDIRECT_URI`:**
   - **If you see `GOOGLE_REDIRECT_URI` already listed:**
     - Click on it to edit
     - Change the value to: `https://your-actual-render-url.onrender.com/api/gmail/callback`
     - Replace `your-actual-render-url` with your actual Render service URL (e.g., `weaver-abc123`)
   
   - **If you DON'T see `GOOGLE_REDIRECT_URI`:**
     - Click the **"+ Add Environment Variable"** button (usually at the top or bottom of the list)
     - **Key**: Enter `GOOGLE_REDIRECT_URI` (exactly like this, all caps)
     - **Value**: Enter `https://your-actual-render-url.onrender.com/api/gmail/callback`
       - Replace `your-actual-render-url` with your actual Render service URL
       - Example: If your URL is `https://weaver-abc123.onrender.com`, then the value should be:
         ```
         https://weaver-abc123.onrender.com/api/gmail/callback
         ```
     - Click **"Save Changes"** or **"Add"**

6. **Verify all Gmail-related environment variables are set** (check that these exist):
   - ✅ `GOOGLE_CLIENT_ID` = Should be your Client ID (starts with numbers, ends with `.apps.googleusercontent.com`)
   - ✅ `GOOGLE_CLIENT_SECRET` = Should be your Client Secret (starts with `GOCSPX-`)
   - ✅ `GOOGLE_REDIRECT_URI` = Should be `https://your-render-url.onrender.com/api/gmail/callback`

7. **If any are missing, add them the same way:**
   - Click **"+ Add Environment Variable"**
   - Enter the Key and Value
   - Click **"Save Changes"**

8. **After saving, Render will automatically redeploy** your service with the new environment variables (this takes 2-5 minutes)

6. Click **"Save Changes"**
7. Render will automatically redeploy with the new environment variables

## Step 4: Verify Token Storage

Your code already stores tokens per user in the database:
- ✅ Tokens are stored in `gmail_tokens` table
- ✅ Each user has their own `user_id` as the primary key
- ✅ Tokens are retrieved per user when needed

**No code changes needed** - this is already configured correctly!

## Step 5: Test the Production Setup

1. **Wait for Render to redeploy** (after updating environment variables)
2. Visit your production URL
3. Sign up or log in as a user
4. Click "Connect Gmail" in the profile menu
5. You should be redirected to Google's OAuth consent screen
6. After authorizing, you should be redirected back to your production site
7. Gmail should now be connected for that user

## Important Notes for Multiple Users

### ✅ What Works Automatically:
- **User Isolation**: Each user's Gmail tokens are stored separately
- **Multiple Connections**: Different users can connect different Gmail accounts
- **Token Refresh**: The system handles token refresh automatically

### ⚠️ OAuth Consent Screen Status:

**If your app is in "Testing" mode:**
- Only users you add as "Test users" in Google Cloud Console can connect Gmail
- To add test users: Go to OAuth consent screen → Test users → Add users

**If your app is "In production":**
- Any Google user can connect their Gmail account
- No need to add test users
- Your app will be publicly available

### 🔒 Security Considerations:

1. **Client Secret**: Never expose your `GOOGLE_CLIENT_SECRET` in client-side code (it's already server-side only ✅)
2. **Token Storage**: Tokens are stored securely in your database (not in localStorage ✅)
3. **HTTPS**: Render automatically provides HTTPS for your production site ✅

## Troubleshooting

### "redirect_uri_mismatch" Error
- **Cause**: The redirect URI in your request doesn't match what's in Google Cloud Console
- **Fix**: 
  1. Check `GOOGLE_REDIRECT_URI` in Render matches exactly what's in Google Cloud Console
  2. Make sure there are no trailing slashes or extra characters
  3. Both should use `https://` (not `http://`)

### "access_denied" Error
- **Cause**: User denied permission or app is in testing mode
- **Fix**: 
  1. If in testing mode, add the user's email as a test user in Google Cloud Console
  2. Or publish your app to production

### "invalid_client" Error
- **Cause**: Client ID or Client Secret is incorrect
- **Fix**: 
  1. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Render match Google Cloud Console
  2. Make sure there are no extra spaces or quotes

### Users Can't Connect Gmail
- **Check**: Is your OAuth consent screen published?
- **Check**: Are the redirect URIs correct in Google Cloud Console?
- **Check**: Are environment variables set correctly in Render?

## Quick Checklist

- [ ] Production URL obtained from Render
- [ ] Production redirect URI added to Google Cloud Console
- [ ] `GOOGLE_REDIRECT_URI` updated in Render environment variables
- [ ] OAuth consent screen published (if needed for public use)
- [ ] Test users added (if app is in testing mode)
- [ ] Tested Gmail connection on production site

## Current Configuration Summary

**Your Setup:**
- ✅ Tokens stored per user in database (`gmail_tokens` table)
- ✅ User-specific Gmail connections
- ✅ Automatic token refresh
- ⚠️ Need to update redirect URI for production

**What You Need to Do:**
1. Add production redirect URI to Google Cloud Console
2. Update `GOOGLE_REDIRECT_URI` in Render
3. Publish OAuth consent screen (if you want public access)

## Need Help?

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Render Environment Variables Guide](https://render.com/docs/environment-variables)
- Check Render logs for specific error messages

