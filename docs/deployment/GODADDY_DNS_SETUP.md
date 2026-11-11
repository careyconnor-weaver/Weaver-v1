# GoDaddy DNS Setup for studentweaver.com

Quick reference for adding DNS records in GoDaddy.

## Accessing DNS in GoDaddy

1. Go to [godaddy.com](https://www.godaddy.com) and log in
2. Click **My Products** (top right)
3. Find **studentweaver.com** in your domain list
4. Click the **DNS** button (or three dots → **Manage DNS**)

You'll see a table with existing DNS records. Scroll down to see the **Records** section.

## Adding Records in GoDaddy

For each record you need to add:

1. Click the **Add** button (usually at the top of the Records table)
2. A form will appear with fields:
   - **Type** (dropdown)
   - **Name** (text field)
   - **Value** (text field)
   - **TTL** (time to live, usually leave as default)
3. Fill in the fields
4. Click **Save**

## Record Types You'll Need

### A Record (for Render - root domain)

**When Render gives you an IP address:**

- **Type**: `A`
- **Name**: `@` (this means studentweaver.com)
- **Value**: The IP address from Render (e.g., `123.45.67.89`)
- **TTL**: Default (600)

**Note:** If GoDaddy doesn't accept `@`, try leaving Name blank or using `studentweaver.com`

### CNAME Record (for Render - www subdomain)

**When Render gives you a CNAME:**

- **Type**: `CNAME`
- **Name**: `www`
- **Value**: The CNAME from Render (e.g., `your-service.onrender.com`)
- **TTL**: Default

### TXT Record (for Resend verification)

**From Resend dashboard:**

- **Type**: `TXT`
- **Name**: `@` (or what Resend specifies, might be `_resend`)
- **Value**: The entire verification string from Resend
  - Example: `resend-verification=abc123xyz789...`
- **TTL**: Default

**Important:** Copy the ENTIRE value string from Resend, including `resend-verification=`

### MX Record (for Resend email)

**From Resend dashboard:**

- **Type**: `MX`
- **Name**: `@`
- **Priority**: The number from Resend (usually `10`)
- **Value**: The mail server from Resend (e.g., `mail.resend.com`)
  - **Note:** In GoDaddy, you might need to enter: `10 mail.resend.com` (priority + server)
- **TTL**: Default

**GoDaddy Format:** Some GoDaddy interfaces require you to enter priority and value separately, others want them together like `10 mail.resend.com`

### CNAME Record (for Resend - if provided)

**If Resend gives you a CNAME:**

- **Type**: `CNAME`
- **Name**: What Resend specifies (often `mail` or `email`)
- **Value**: The target from Resend (e.g., `mail.resend.com`)
- **TTL**: Default

## Common GoDaddy Issues

### "@" Symbol Not Working

If GoDaddy doesn't accept `@` for the root domain:
- Try leaving the **Name** field **blank**
- Or try entering just `studentweaver.com`
- Or use `*` (wildcard)

### CNAME on Root Domain

Some DNS providers (including GoDaddy) don't allow CNAME records on the root domain (`@`).

**If Render gives you a CNAME for root domain:**
- Render might provide an A record instead
- Or you can use Cloudflare (free) as your DNS provider:
  1. Sign up at [cloudflare.com](https://cloudflare.com) (free)
  2. Add your domain
  3. Get Cloudflare's nameservers
  4. In GoDaddy: Go to **DNS** → **Nameservers** → Change to Cloudflare's nameservers
  5. Add all DNS records in Cloudflare instead (Cloudflare allows CNAME on root)

### MX Record Format

GoDaddy's MX record interface varies. If you see separate fields:
- **Priority**: Enter the number (e.g., `10`)
- **Host**: Enter `@` or leave blank
- **Points to**: Enter the mail server (e.g., `mail.resend.com`)

If you see a single "Value" field:
- Enter: `10 mail.resend.com` (priority + space + server)

## Visual Guide: GoDaddy DNS Interface

```
┌─────────────────────────────────────────┐
│  DNS Management - studentweaver.com      │
├─────────────────────────────────────────┤
│  Records                                │
│                                         │
│  Type | Name | Value        | TTL      │
│  ─────┼──────┼──────────────┼─────────│
│  A    | @    | 123.45.67.89 | 600      │
│  CNAME| www  | service.on... | 600      │
│  TXT  | @    | resend-ver... | 600      │
│  MX   | @    | 10 mail.res...| 600      │
│                                         │
│  [+ Add] button                          │
└─────────────────────────────────────────┘
```

## After Adding Records

1. **Wait 15-30 minutes** for DNS to propagate
2. **Check in Render**: Go to Custom Domains → Should show "Verified" ✅
3. **Check in Resend**: Go to Domains → Click "Verify" → Should show "Verified" ✅

## Verifying DNS Records

You can check if records are working:

```bash
# Check A record (for Render)
dig studentweaver.com

# Check CNAME
dig www.studentweaver.com

# Check TXT records (for Resend)
dig TXT studentweaver.com

# Check MX records (for Resend)
dig MX studentweaver.com
```

Or use online tools:
- [mxtoolbox.com](https://mxtoolbox.com) - Enter domain, select record type
- [whatsmydns.net](https://www.whatsmydns.net) - Check DNS propagation

## Quick Checklist

- [ ] Opened GoDaddy DNS management
- [ ] Added Render A record (or CNAME) for root domain
- [ ] Added Render CNAME for www
- [ ] Added Resend TXT record for verification
- [ ] Added Resend MX record
- [ ] Added any Resend CNAME records
- [ ] Waited 15-30 minutes
- [ ] Verified domain in Render dashboard
- [ ] Verified domain in Resend dashboard
- [ ] Updated environment variables in Render

## Need Help?

If you're stuck:
1. Take a screenshot of the DNS records you're trying to add
2. Check the error message GoDaddy shows
3. Verify you copied the values exactly from Render/Resend
4. Try using Cloudflare as DNS provider (allows more flexibility)

