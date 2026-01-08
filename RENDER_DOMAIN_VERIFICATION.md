# Step-by-Step: Adding Custom Domain to Render

This guide walks you through adding `studentweaver.com` to Render and verifying it.

## Step 1: Add Domain in Render

1. **Go to Render Dashboard**
   - Visit [dashboard.render.com](https://dashboard.render.com)
   - Log in to your account

2. **Navigate to Your Service**
   - Click on your **Web Service** (the one running Weaver)
   - If you have multiple services, find the one that's your main app

3. **Go to Settings**
   - Click the **Settings** tab (at the top of the page)

4. **Find Custom Domains Section**
   - Scroll down to find **"Custom Domains"** section
   - You'll see a button that says **"Add Custom Domain"** or **"Add"**

5. **Enter Your Domain**
   - Click **"Add Custom Domain"**
   - Enter: `studentweaver.com`
   - Click **"Add"** or **"Save"**

## Step 2: Render Shows DNS Records

After clicking "Add", Render will show you a screen with DNS records you need to add.

**You'll see something like:**

```
To verify studentweaver.com, add these DNS records:

Type: A
Name: @
Value: 123.45.67.89

Type: CNAME  
Name: www
Value: your-service-name.onrender.com
```

**OR it might show:**

```
Type: CNAME
Name: @
Value: your-service-name.onrender.com
```

**IMPORTANT:** Copy these records exactly - you'll need them for Step 3!

## Step 3: Add DNS Records in GoDaddy

Now you need to add these records to GoDaddy so Render can verify you own the domain.

### 3.1 Access GoDaddy DNS

1. Go to [godaddy.com](https://www.godaddy.com)
2. Log in to your account
3. Click **"My Products"** (top right, or in the main menu)
4. Find **studentweaver.com** in your domain list
5. Click the **"DNS"** button (or click the three dots → **"Manage DNS"**)

### 3.2 Add the Records

You'll see a table of existing DNS records. Now add the ones Render provided:

#### For A Record (if Render gave you an IP address):

1. Click the **"Add"** button (usually at the top of the Records table)
2. Fill in:
   - **Type**: Select `A` from dropdown
   - **Name**: Enter `@` (this means your root domain)
     - **Note:** If GoDaddy doesn't accept `@`, try leaving it blank or entering `studentweaver.com`
   - **Value**: Paste the IP address from Render (e.g., `123.45.67.89`)
   - **TTL**: Leave as default (usually 600 seconds)
3. Click **"Save"**

#### For CNAME Record (if Render gave you a CNAME):

**For Root Domain (@):**
1. Click **"Add"**
2. Fill in:
   - **Type**: Select `CNAME`
   - **Name**: Enter `@` (or leave blank if `@` doesn't work)
   - **Value**: Paste the CNAME from Render (e.g., `your-service.onrender.com`)
   - **TTL**: Leave as default
3. Click **"Save"**

**For www Subdomain:**
1. Click **"Add"**
2. Fill in:
   - **Type**: Select `CNAME`
   - **Name**: Enter `www`
   - **Value**: Paste the CNAME from Render (usually same as root)
   - **TTL**: Leave as default
3. Click **"Save"**

### 3.3 Common GoDaddy Issues

**Problem:** GoDaddy doesn't accept `@` symbol
- **Solution:** Leave the Name field blank, or try entering `studentweaver.com`

**Problem:** Can't add CNAME for root domain (@)
- **Solution:** Some DNS providers don't allow CNAME on root. Options:
  1. Render might provide an A record instead - use that
  2. Use Cloudflare (free) as your DNS provider (allows CNAME on root)

## Step 4: Wait for DNS Propagation

After adding DNS records:

1. **Wait 15-30 minutes** for DNS changes to propagate
   - DNS changes aren't instant
   - Can take up to 48 hours, but usually 15-30 minutes

2. **Don't click "Verify" in Render yet** - wait for DNS to propagate first

## Step 5: Verify Domain in Render

After waiting 15-30 minutes:

1. **Go back to Render Dashboard**
2. **Go to your service → Settings → Custom Domains**
3. You should see `studentweaver.com` listed
4. Render will automatically check DNS records
5. Status will change to **"Verified"** ✅ when DNS is detected

**OR** if there's a **"Verify"** button:
1. Click the **"Verify"** button next to your domain
2. Render will check if DNS records are found
3. If found, status changes to **"Verified"** ✅

## Troubleshooting

### "DNS records not found" Error

**Check:**
1. Did you wait at least 15 minutes after adding records?
2. Did you add the records exactly as Render showed?
3. Are the values correct? (Double-check you copied them correctly)

**Verify DNS is working:**
- Use [mxtoolbox.com](https://mxtoolbox.com)
  - Enter `studentweaver.com`
  - Select record type (A or CNAME)
  - Click "Lookup"
  - Should show the values you added

**Or use command line:**
```bash
# For A record
dig studentweaver.com

# For CNAME
dig www.studentweaver.com
```

### Domain Already Added Error

If Render says domain is already added:
1. Check if it's in another Render service
2. Remove it from there first
3. Then add it to the correct service

### CNAME on Root Not Allowed

If GoDaddy won't let you add CNAME for `@`:
1. Check if Render provided an A record instead
2. If not, contact Render support
3. Or use Cloudflare as DNS provider (allows CNAME on root)

### Still Not Working After 30 Minutes

1. Double-check DNS records in GoDaddy match Render exactly
2. Verify records are saved (refresh GoDaddy page)
3. Check DNS propagation: [whatsmydns.net](https://www.whatsmydns.net)
4. Try clicking "Verify" again in Render
5. Contact Render support if still not working

## Visual Guide: What You'll See

### In Render (After Adding Domain):

```
┌─────────────────────────────────────┐
│  Custom Domains                      │
├─────────────────────────────────────┤
│  studentweaver.com                   │
│  Status: Pending Verification ⏳     │
│  [Verify] [Remove]                   │
│                                      │
│  Add these DNS records:              │
│  ┌─────────────────────────────────┐ │
│  │ Type: A                         │ │
│  │ Name: @                         │ │
│  │ Value: 123.45.67.89            │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### In GoDaddy DNS:

```
┌─────────────────────────────────────┐
│  DNS Management                     │
├─────────────────────────────────────┤
│  Records                            │
│  ┌──────┬──────┬──────────────────┐│
│  │ Type │ Name │ Value            ││
│  ├──────┼──────┼──────────────────┤│
│  │ A    │ @    │ 123.45.67.89    ││ ← Add this
│  │ CNAME│ www  │ service.onren... ││ ← Add this
│  └──────┴──────┴──────────────────┘│
│  [+ Add]                            │
└─────────────────────────────────────┘
```

## Quick Checklist

- [ ] Added domain in Render (entered studentweaver.com)
- [ ] Copied DNS records from Render
- [ ] Opened GoDaddy DNS management
- [ ] Added A record (or CNAME) for root domain (@)
- [ ] Added CNAME record for www (if provided)
- [ ] Saved records in GoDaddy
- [ ] Waited 15-30 minutes
- [ ] Clicked "Verify" in Render (or waited for auto-verify)
- [ ] Status shows "Verified" ✅

## Next Steps After Verification

Once verified:
1. Render will automatically configure SSL (HTTPS)
2. Your site will be accessible at https://studentweaver.com
3. Update environment variables:
   - `WEAVER_URL=https://studentweaver.com`
4. Update Resend email:
   - `RESEND_FROM_EMAIL=Weaver <noreply@studentweaver.com>`

## Need More Help?

If you're still stuck:
1. Take a screenshot of what Render shows you
2. Take a screenshot of your GoDaddy DNS records
3. Check Render status page: [status.render.com](https://status.render.com)
4. Contact Render support: support@render.com

