# Fix Custom Domain: studentweaver.com

## Current Status
- ✅ **Render URL works**: https://weaver-kuwd.onrender.com
- ❌ **Custom domain doesn't work**: studentweaver.com

## The Problem
Your custom domain `studentweaver.com` is not properly configured to point to your Render service. This is a DNS/domain configuration issue, not a code issue.

## Solution: Configure Domain in Render

### Step 1: Add Custom Domain in Render Dashboard

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Click on your "weaver" web service**
3. **Go to the "Settings" tab** (in the left sidebar)
4. **Scroll down to "Custom Domains" section**
5. **Click "Add Custom Domain"** button
6. **Enter your domain**: `studentweaver.com`
7. **Click "Add"**

### Step 2: Get DNS Instructions from Render

After adding the domain, Render will show you DNS configuration instructions. You'll see something like:

**Option A: CNAME Record (Recommended)**
- Type: `CNAME`
- Name: `@` (or leave blank, or `studentweaver.com`)
- Value: `weaver-kuwd.onrender.com`

**Option B: A Records**
- Type: `A`
- Name: `@`
- Value: `[IP addresses from Render]`

### Step 3: Update DNS Records at Your Domain Provider

1. **Go to your domain registrar** (where you bought studentweaver.com):
   - GoDaddy: https://www.godaddy.com
   - Namecheap: https://www.namecheap.com
   - Google Domains: https://domains.google
   - Or wherever you purchased the domain

2. **Find DNS Management**:
   - Look for "DNS Management", "DNS Settings", "Manage DNS", or "Nameservers"
   - This is usually in your domain settings

3. **Add/Update DNS Records**:
   
   **If Render says to use CNAME:**
   - Add a new CNAME record:
     - **Name/Host**: `@` (or `studentweaver.com` or leave blank - depends on your provider)
     - **Value/Target**: `weaver-kuwd.onrender.com`
     - **TTL**: 3600 (or default)
   
   **If Render says to use A records:**
   - Add A records with the IP addresses Render provides
   - Name: `@`
   - Value: [IP addresses from Render]

4. **Save the DNS records**

### Step 4: Wait for DNS Propagation

- DNS changes can take **5 minutes to 48 hours** to propagate
- Usually takes **5-15 minutes** for most users
- You can check propagation status at: https://www.whatsmydns.net

### Step 5: Render Will Provision SSL Certificate

- Once DNS is correctly configured, Render will **automatically provision an SSL certificate**
- This usually takes **5-15 minutes** after DNS is correct
- You'll see the SSL status in Render dashboard (Settings → Custom Domains)

### Step 6: Verify It Works

1. Wait 10-15 minutes after updating DNS
2. Check DNS propagation: https://www.whatsmydns.net/#A/studentweaver.com
3. Try accessing: `https://studentweaver.com` (with https://)
4. If it still doesn't work, wait a bit longer and try again

## Common Issues

### "Can't connect to server"
- **Cause**: DNS records not configured or not propagated yet
- **Fix**: 
  1. Verify DNS records are correct at your domain provider
  2. Wait for DNS propagation (check at whatsmydns.net)
  3. Make sure you added the domain in Render dashboard first

### "SSL Certificate Error"
- **Cause**: DNS not configured correctly, or SSL not yet provisioned
- **Fix**: 
  1. Wait for DNS to propagate
  2. Wait for Render to provision SSL (5-15 minutes after DNS is correct)
  3. Make sure you're using `https://` not `http://`

### Domain Shows "Pending" in Render
- **Cause**: DNS records not configured correctly
- **Fix**: 
  1. Double-check DNS records match exactly what Render says
  2. Make sure there are no typos
  3. Wait for DNS propagation

## Quick Checklist

- [ ] Added `studentweaver.com` in Render dashboard (Settings → Custom Domains)
- [ ] Got DNS instructions from Render
- [ ] Updated DNS records at domain provider (GoDaddy, Namecheap, etc.)
- [ ] DNS records match exactly what Render specified
- [ ] Waited 10-15 minutes for DNS propagation
- [ ] Checked DNS propagation at whatsmydns.net
- [ ] Render shows domain as "Active" (not "Pending")
- [ ] Tried accessing https://studentweaver.com (with https://)

## Important Notes

1. **Use the Render URL for now**: While setting up the custom domain, you can continue using https://weaver-kuwd.onrender.com
2. **DNS propagation takes time**: Be patient - it can take up to 48 hours (but usually 5-15 minutes)
3. **SSL is automatic**: Once DNS is correct, Render automatically provisions SSL - no extra steps needed
4. **Both domains will work**: Once configured, both `studentweaver.com` and `weaver-kuwd.onrender.com` will work

## Need Help?

If you're stuck:
1. Check Render dashboard → Settings → Custom Domains for specific instructions
2. Check your domain provider's DNS documentation
3. Verify DNS records are correct using https://www.whatsmydns.net
