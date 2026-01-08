# Complete Domain Setup: studentweaver.com

This guide will help you connect `studentweaver.com` across:
- **GoDaddy** (where you bought the domain)
- **Render** (where your app is hosted)
- **Resend** (for sending emails)

## Overview

You need to set up DNS records in GoDaddy that point to:
1. **Render** - So your domain works for the website
2. **Resend** - So you can send emails from your domain

## Step 1: Set Up Domain in Render

### 1.1 Add Custom Domain in Render

1. Go to your Render dashboard
2. Click on your **Web Service** (the one running Weaver)
3. Go to **Settings** tab
4. Scroll to **Custom Domains** section
5. Click **Add Custom Domain**
6. Enter: `studentweaver.com`
7. Render will show you DNS records you need to add

**Important:** Render will give you something like:
- **Type**: `CNAME`
- **Name**: `www`
- **Value**: `your-service.onrender.com`

OR

- **Type**: `A`
- **Name**: `@`
- **Value**: `IP address` (if Render provides one)

### 1.2 Get Your Render DNS Records

After adding the domain, Render will show you exactly what DNS records to add. **Copy these down** - you'll need them for Step 2.

Common Render DNS setup:
- **For root domain (studentweaver.com)**: Usually an `A` record or `CNAME`
- **For www (www.studentweaver.com)**: Usually a `CNAME` to your Render service

## Step 2: Add DNS Records in GoDaddy

### 2.1 Access GoDaddy DNS Management

1. Log in to [GoDaddy](https://www.godaddy.com)
2. Go to **My Products** (top right, or main menu)
3. Find **studentweaver.com** in your domain list
4. Click the **DNS** button (or three dots → Manage DNS)

### 2.2 Add Render DNS Records

You'll see a list of existing DNS records. Add the records Render provided:

#### For Root Domain (studentweaver.com):

**Option A: If Render gives you an A record:**
1. Click **Add** button
2. **Type**: Select `A`
3. **Name**: Enter `@` (this means root domain)
4. **Value**: Paste the IP address from Render
5. **TTL**: Leave as default (600 seconds)
6. Click **Save**

**Option B: If Render gives you a CNAME:**
1. Click **Add** button
2. **Type**: Select `CNAME`
3. **Name**: Enter `@` (some registrars don't allow CNAME for root, see note below)
4. **Value**: Paste the CNAME value from Render (e.g., `your-service.onrender.com`)
5. **TTL**: Leave as default
6. Click **Save**

**Note:** Some DNS providers don't allow CNAME for root domain. If that's the case:
- Render might provide an `A` record instead
- Or you might need to use a service like Cloudflare (free) as your DNS provider

#### For www Subdomain:

1. Click **Add** button
2. **Type**: Select `CNAME`
3. **Name**: Enter `www`
4. **Value**: Paste the CNAME from Render (usually same as root)
5. **TTL**: Leave as default
6. Click **Save**

### 2.3 Wait for DNS Propagation

- DNS changes take **15-30 minutes** (sometimes up to 48 hours)
- You can check status in Render dashboard
- Render will show "Verified" when DNS is working

## Step 3: Set Up Resend Domain

### 3.1 Add Domain in Resend

1. Go to [resend.com/domains](https://resend.com/domains)
2. Click **Add Domain**
3. Enter: `studentweaver.com`
4. Click **Add Domain**
5. Resend will show you DNS records to add

### 3.2 Add Resend DNS Records in GoDaddy

Go back to GoDaddy DNS management and add each record Resend provides:

#### TXT Record for Verification:

1. Click **Add** button
2. **Type**: Select `TXT`
3. **Name**: Enter `@` (or what Resend specifies, might be `_resend`)
4. **Value**: Paste the entire verification string from Resend
   - Looks like: `resend-verification=abc123xyz...`
5. **TTL**: Leave as default
6. Click **Save**

#### MX Record (for receiving emails - optional):

1. Click **Add** button
2. **Type**: Select `MX`
3. **Name**: Enter `@`
4. **Priority**: Enter the number Resend provides (usually `10`)
5. **Value**: Enter the mail server (e.g., `mail.resend.com`)
   - Format: `10 mail.resend.com`
6. **TTL**: Leave as default
7. Click **Save**

#### CNAME Record (if Resend provides one):

1. Click **Add** button
2. **Type**: Select `CNAME`
3. **Name**: Enter what Resend specifies (often `mail` or `email`)
4. **Value**: Enter the target (e.g., `mail.resend.com`)
5. **TTL**: Leave as default
6. Click **Save**

### 3.3 Verify Domain in Resend

1. Wait 15-30 minutes after adding DNS records
2. Go back to Resend dashboard
3. Click **Verify** next to your domain
4. Resend will check if all records are found
5. Status will change to "Verified" ✅

## Step 4: Update Environment Variables

### 4.1 Update Local .env File

Update your `.env` file to use the new domain:

```bash
RESEND_API_KEY=re_D1HGx1Bw_6DVca2jDfHkb3Pw5EH6jxABt
RESEND_FROM_EMAIL=Weaver <noreply@studentweaver.com>
RESEND_FROM_NAME=Weaver
WEAVER_URL=https://studentweaver.com
```

### 4.2 Update Render Environment Variables

1. Go to Render dashboard → Your service → **Environment**
2. Update or add:
   - `RESEND_FROM_EMAIL` = `Weaver <noreply@studentweaver.com>`
   - `WEAVER_URL` = `https://studentweaver.com`
3. Click **Save Changes**
4. Render will automatically redeploy

## Step 5: Update Server Code (if needed)

Make sure your server.js uses the WEAVER_URL environment variable (it should already):

```javascript
const weaverUrl = process.env.WEAVER_URL || 'http://localhost:3000';
```

This is already in the code, so you're good!

## Troubleshooting

### Domain Not Working in Render

**Check DNS propagation:**
```bash
# Check if DNS is working
dig studentweaver.com
dig www.studentweaver.com
```

**Common issues:**
- DNS hasn't propagated yet (wait 15-30 min)
- Wrong DNS records added (double-check values)
- CNAME on root domain not allowed (use A record or Cloudflare)

**Solution:** Use Cloudflare (free) as DNS provider:
1. Sign up at [cloudflare.com](https://cloudflare.com)
2. Add your domain
3. Change nameservers in GoDaddy to Cloudflare's
4. Add DNS records in Cloudflare (allows CNAME on root)

### Resend Domain Not Verifying

**Check DNS records:**
```bash
# Check TXT records
dig TXT studentweaver.com

# Check MX records
dig MX studentweaver.com
```

**Common issues:**
- Records not propagated (wait longer)
- Wrong values copied (check exact match)
- Wrong record type (TXT vs MX vs CNAME)

**Solution:** Double-check each record matches Resend exactly

### Emails Not Sending

1. Check Resend dashboard for errors
2. Verify domain is verified in Resend
3. Check `RESEND_FROM_EMAIL` matches verified domain
4. Check server logs for Resend errors

## Quick Checklist

- [ ] Added domain in Render
- [ ] Got DNS records from Render
- [ ] Added Render DNS records in GoDaddy
- [ ] Added domain in Resend
- [ ] Got DNS records from Resend
- [ ] Added Resend DNS records in GoDaddy
- [ ] Waited 15-30 minutes for DNS propagation
- [ ] Verified domain in Resend dashboard
- [ ] Updated `.env` file with new domain
- [ ] Updated Render environment variables
- [ ] Tested website at studentweaver.com
- [ ] Tested email sending

## Need Help?

If you get stuck:
1. Check Render logs for errors
2. Check Resend dashboard for verification status
3. Use DNS checker: [mxtoolbox.com](https://mxtoolbox.com)
4. Contact support:
   - Render: support@render.com
   - Resend: support@resend.com
   - GoDaddy: help.godaddy.com

Once everything is set up, you'll have:
- ✅ Website at https://studentweaver.com
- ✅ Emails sent from noreply@studentweaver.com
- ✅ Professional branding across all services

