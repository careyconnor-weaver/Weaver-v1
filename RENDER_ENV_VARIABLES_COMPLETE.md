# Complete List of Environment Variables for Render

This is a comprehensive list of ALL environment variables you need to set in Render, and exactly where to find each one.

## Required Environment Variables

### 1. NODE_ENV
- **Value**: `production`
- **Where to get it**: Set this manually
- **How to add**: 
  - Key: `NODE_ENV`
  - Value: `production`
- **Why**: Tells Node.js this is a production environment

---

### 2. PORT
- **Value**: `10000`
- **Where to get it**: Set this manually
- **How to add**:
  - Key: `PORT`
  - Value: `10000`
- **Why**: Render uses port 10000 for web services

---

### 3. DATABASE_URL
- **Value**: `postgresql://weaver_user:password@host/database?sslmode=require`
- **Where to get it**: From your Render PostgreSQL database
- **How to find it**:
  1. Go to Render dashboard → Your PostgreSQL database
  2. Click on the database
  3. Look for **"Internal Database URL"** (NOT External)
  4. Copy the entire connection string
  5. Add `?sslmode=require` at the end if it's not there
- **Example**: 
  ```
  postgresql://weaver_user:C0KZ2FZFot9azEUJMGdVdrYb3hVgGfeq@dpg-d52dup63jp1c73c1ms2g-a/weaver?sslmode=require
  ```
- **Important**: Use the **Internal** URL (for Render services), not External
- **How to add**:
  - Key: `DATABASE_URL`
  - Value: Paste the Internal Database URL + `?sslmode=require`

---

### 4. GOOGLE_CLIENT_ID
- **Value**: `203620464756-xxxxx.apps.googleusercontent.com`
- **Where to get it**: Google Cloud Console
- **How to find it**:
  1. Go to [Google Cloud Console](https://console.cloud.google.com)
  2. Select your project
  3. Go to **APIs & Services** → **Credentials**
  4. Click on your **OAuth 2.0 Client ID**
  5. Copy the **Client ID** (the long string that ends with `.apps.googleusercontent.com`)
- **Example**: 
  ```
  203620464756-xxxxx.apps.googleusercontent.com
  ```
- **How to add**:
  - Key: `GOOGLE_CLIENT_ID`
  - Value: Paste your Client ID

---

### 5. GOOGLE_CLIENT_SECRET
- **Value**: `GOCSPX-xxxxx`
- **Where to get it**: Google Cloud Console
- **How to find it**:
  1. Go to [Google Cloud Console](https://console.cloud.google.com)
  2. Select your project
  3. Go to **APIs & Services** → **Credentials**
  4. Click on your **OAuth 2.0 Client ID**
  5. Click **"Show"** next to Client secret
  6. Copy the **Client secret** (starts with `GOCSPX-`)
- **Example**: 
  ```
  GOCSPX-xxxxx
  ```
- **How to add**:
  - Key: `GOOGLE_CLIENT_SECRET`
  - Value: Paste your Client Secret
- **Security**: Keep this secret! Never share it publicly.

---

### 6. GOOGLE_REDIRECT_URI
- **Value**: `https://your-render-url.onrender.com/api/gmail/callback`
- **Where to get it**: Your Render service URL + `/api/gmail/callback`
- **How to find it**:
  1. Go to Render dashboard
  2. Click on your **Weaver web service**
  3. Look at the top of the page for your service URL
  4. It will be something like: `https://weaver-abc123.onrender.com`
  5. Add `/api/gmail/callback` to the end
- **Example**: 
  If your Render URL is `https://weaver-abc123.onrender.com`, then:
  ```
  https://weaver-abc123.onrender.com/api/gmail/callback
  ```
- **How to add**:
  - Key: `GOOGLE_REDIRECT_URI`
  - Value: Your Render URL + `/api/gmail/callback`
- **Important**: 
  - Must use `https://` (not `http://`)
  - Must match exactly what you add in Google Cloud Console
  - No trailing slash

---

### 7. OPENAI_API_KEY
- **Value**: `sk-proj-xxxxx` or `sk-xxxxx`
- **Where to get it**: OpenAI Dashboard
- **How to find it**:
  1. Go to [OpenAI Platform](https://platform.openai.com)
  2. Log in to your account
  3. Click on your profile (top right) → **"API keys"**
  4. Click **"+ Create new secret key"**
  5. Give it a name (e.g., "Weaver Production")
  6. Copy the key immediately (you can only see it once!)
  7. Store it securely
- **Example**: 
  ```
  sk-proj-xxxxx
  ```
- **How to add**:
  - Key: `OPENAI_API_KEY`
  - Value: Paste your OpenAI API key
- **Security**: Keep this secret! Never share it publicly.
- **Note**: Make sure your OpenAI account has access to:
  - GPT-4 models (for text summarization)
  - GPT-4o or GPT-4-turbo (for image/vision processing)

---

## Quick Reference Table

| Variable | Where to Get It | Example Value |
|----------|----------------|---------------|
| `NODE_ENV` | Set manually | `production` |
| `PORT` | Set manually | `10000` |
| `DATABASE_URL` | Render database dashboard (Internal URL) | `postgresql://user:pass@host/db?sslmode=require` |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → Credentials | `203620464756-xxxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → Credentials | `GOCSPX-xxxxx` |
| `GOOGLE_REDIRECT_URI` | Your Render URL + `/api/gmail/callback` | `https://weaver-abc123.onrender.com/api/gmail/callback` |
| `OPENAI_API_KEY` | OpenAI Platform → API keys | `sk-proj-xxxxx` |

## How to Add Variables in Render

1. **Go to Render Dashboard**: https://render.com
2. **Click on your Weaver web service**
3. **Click "Environment" tab** (left sidebar)
4. **Click "+ Add Environment Variable"**
5. **Enter Key and Value** (from the table above)
6. **Click "Save Changes"**
7. **Repeat for each variable**

## Verification Checklist

After adding all variables, verify:

- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `10000`
- [ ] `DATABASE_URL` = Internal Database URL from Render (with `?sslmode=require`)
- [ ] `GOOGLE_CLIENT_ID` = From Google Cloud Console
- [ ] `GOOGLE_CLIENT_SECRET` = From Google Cloud Console
- [ ] `GOOGLE_REDIRECT_URI` = Your Render URL + `/api/gmail/callback`
- [ ] `OPENAI_API_KEY` = From OpenAI Platform

## Common Mistakes to Avoid

1. **DATABASE_URL**: 
   - ❌ Don't use External Database URL
   - ✅ Use Internal Database URL
   - ✅ Must include `?sslmode=require`

2. **GOOGLE_REDIRECT_URI**:
   - ❌ Don't use `http://` (must be `https://`)
   - ❌ Don't forget `/api/gmail/callback` at the end
   - ✅ Must match exactly what's in Google Cloud Console

3. **Variable Names**:
   - ❌ Don't use spaces or dashes
   - ✅ Use all caps with underscores: `GOOGLE_CLIENT_ID` (not `google-client-id`)

4. **Extra Spaces**:
   - ❌ Don't add spaces before/after values
   - ✅ Copy values exactly as shown

## After Adding All Variables

1. **Render will automatically redeploy** (takes 2-5 minutes)
2. **Check deployment logs** to ensure no errors
3. **Test your site** to verify everything works
4. **Test Gmail connection** to ensure OAuth works

## Need Help Finding Something?

- **Render Database URL**: Render dashboard → Your database → "Internal Database URL"
- **Google Credentials**: Google Cloud Console → APIs & Services → Credentials
- **OpenAI Key**: OpenAI Platform → Profile → API keys
- **Render Service URL**: Render dashboard → Your web service → Top of page

