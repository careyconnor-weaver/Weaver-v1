# How to Add DNS Records for Resend Domain Verification

This guide will help you add the DNS records that Resend provides to verify your domain (e.g., `weaver.app`).

## What Are DNS Records?

DNS (Domain Name System) records tell the internet where to route your domain's services. Resend needs you to add specific records to prove you own the domain.

## Step 1: Get Your DNS Records from Resend

1. Go to [resend.com/domains](https://resend.com/domains)
2. Click on your domain (or add it if you haven't)
3. You'll see a list of DNS records that need to be added
4. Copy each record - you'll need:
   - **Type** (TXT, MX, CNAME, etc.)
   - **Name/Host** (e.g., `@`, `_resend`, `mail`)
   - **Value** (the long string Resend provides)
   - **TTL** (usually 3600 or "Auto")

## Step 2: Find Your Domain Registrar

Your domain registrar is where you bought your domain. Common ones:
- **Namecheap**
- **GoDaddy**
- **Google Domains / Squarespace Domains**
- **Cloudflare**
- **Name.com**
- **Hover**
- **Route 53 (AWS)**

## Step 3: Access DNS Management

The steps vary by registrar, but generally:

1. Log into your domain registrar account
2. Find your domain in the dashboard
3. Look for:
   - "DNS Management"
   - "DNS Settings"
   - "Manage DNS"
   - "DNS Records"
   - "Advanced DNS"

## Step 4: Add Each DNS Record

For each record Resend provides:

### For TXT Records:
1. Click "Add Record" or "+"
2. Select **Type**: `TXT`
3. **Name/Host**: Enter exactly what Resend shows (often `@` or `_resend`)
   - `@` means your root domain (weaver.app)
   - `_resend` means a subdomain (_resend.weaver.app)
4. **Value**: Paste the entire value from Resend (usually a long string)
5. **TTL**: Use 3600 or "Auto"
6. Click "Save" or "Add"

### For MX Records:
1. Click "Add Record" or "+"
2. Select **Type**: `MX`
3. **Name/Host**: Usually `@` or `mail`
4. **Value/Priority**: Enter the priority number first (usually `10`), then the mail server
   - Format: `10 mail.resend.com` or `10 value.resend.com`
5. **TTL**: 3600 or "Auto"
6. Click "Save"

### For CNAME Records:
1. Click "Add Record" or "+"
2. Select **Type**: `CNAME`
3. **Name/Host**: Enter the subdomain (e.g., `mail`, `email`)
4. **Value**: Enter the target (e.g., `mail.resend.com`)
5. **TTL**: 3600 or "Auto"
6. Click "Save"

## Step-by-Step for Common Registrars

### Namecheap

1. Log in to [Namecheap](https://www.namecheap.com)
2. Go to **Domain List** → Click **Manage** next to your domain
3. Click **Advanced DNS** tab
4. Scroll to **Host Records** section
5. Click **Add New Record**
6. Select the record type
7. Fill in:
   - **Host**: Enter the name (use `@` for root domain)
   - **Value**: Paste the value from Resend
   - **TTL**: Automatic (or 3600)
8. Click **Save All Changes**

### GoDaddy

1. Log in to [GoDaddy](https://www.godaddy.com)
2. Go to **My Products** → Click **DNS** next to your domain
3. Scroll to **Records** section
4. Click **Add** button
5. Select record type
6. Fill in:
   - **Type**: Select from dropdown
   - **Name**: Enter the name (use `@` for root)
   - **Value**: Paste the value
   - **TTL**: 600 seconds (or leave default)
7. Click **Save**

### Google Domains / Squarespace Domains

1. Log in to [Google Domains](https://domains.google) or [Squarespace Domains](https://domains.squarespace.com)
2. Click on your domain
3. Go to **DNS** section
4. Scroll to **Custom resource records**
5. Click **Add record**
6. Select:
   - **Type**: Choose from dropdown
   - **Name**: Enter the name (`@` for root domain)
   - **Data**: Paste the value
   - **TTL**: 3600
7. Click **Add**

### Cloudflare

1. Log in to [Cloudflare](https://dash.cloudflare.com)
2. Select your domain
3. Go to **DNS** → **Records**
4. Click **Add record**
5. Fill in:
   - **Type**: Select from dropdown
   - **Name**: Enter the name (use `@` for root)
   - **Content**: Paste the value
   - **TTL**: Auto
   - **Proxy status**: DNS only (gray cloud)
6. Click **Save**

### Name.com

1. Log in to [Name.com](https://www.name.com)
2. Go to **My Domains** → Click your domain
3. Click **DNS Records** tab
4. Click **Add Record**
5. Select type and fill in:
   - **Hostname**: Enter the name
   - **Record Type**: Select from dropdown
   - **Answer**: Paste the value
   - **TTL**: 3600
6. Click **Add Record**

## Important Notes

### Using `@` for Root Domain

- `@` represents your root domain (weaver.app)
- Some registrars require you to leave the name field **empty** or use just the domain name
- If `@` doesn't work, try:
  - Leaving it blank
  - Using just your domain: `weaver.app`
  - Using `*` (wildcard)

### DNS Propagation

- DNS changes can take **5 minutes to 48 hours** to propagate
- Usually takes **15-30 minutes** for most changes
- You can check propagation at [whatsmydns.net](https://www.whatsmydns.net)

### Verifying Records Are Added

1. Wait 5-15 minutes after adding records
2. Go back to Resend dashboard
3. Click **Verify** or **Check Status**
4. Resend will check if records are found

You can also check manually using command line:
```bash
# For TXT records
dig TXT weaver.app

# For MX records  
dig MX weaver.app

# For CNAME records
dig CNAME mail.weaver.app
```

## Troubleshooting

### "Record not found" after adding

- **Wait longer**: DNS can take up to 48 hours (usually 15-30 min)
- **Check spelling**: Make sure the value is copied exactly
- **Check name**: Ensure `@` or the subdomain name is correct
- **Check type**: Make sure TXT, MX, CNAME match what Resend requires

### Can't find DNS settings

- Look for "Advanced Settings" or "DNS Management"
- Some registrars use external DNS (like Cloudflare)
- Check if your domain uses a different DNS provider

### Records keep disappearing

- Some registrars have a limit on number of records
- Check if there's a conflict with existing records
- Make sure you're saving changes properly

### Still not working after 24 hours

1. Double-check each record matches Resend exactly
2. Use a DNS checker tool: [mxtoolbox.com](https://mxtoolbox.com)
3. Contact Resend support: support@resend.com
4. Contact your domain registrar support

## Example: What Resend Records Look Like

Resend typically requires records like:

```
Type: TXT
Name: @
Value: resend-verification=abc123xyz...

Type: MX
Name: @
Priority: 10
Value: mail.resend.com

Type: CNAME
Name: mail
Value: mail.resend.com
```

## Need Help?

- **Resend Support**: support@resend.com
- **Resend Docs**: https://resend.com/docs
- **Your Domain Registrar**: Check their help docs or support

Once all records are added and verified, you can use `noreply@weaver.app` as your sender email! 🎉

