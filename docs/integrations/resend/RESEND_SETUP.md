# Resend Email Service Setup Guide

Weaver uses [Resend](https://resend.com) to send professional, branded email reminders. Resend provides excellent deliverability and allows emails to be sent from your own domain (e.g., `noreply@weaver.app`).

## Why Resend?

- ✅ **Professional emails from Weaver** - Not from user's Gmail
- ✅ **Better deliverability** - Industry-leading email infrastructure
- ✅ **Custom branding** - Beautiful HTML emails with your logo and colors
- ✅ **Easy setup** - Simple API, great documentation
- ✅ **Free tier** - 3,000 emails/month free
- ✅ **Domain verification** - Send from your own domain

## Quick Setup (5 minutes)

### Step 1: Create Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### Step 2: Get Your API Key

1. Go to [API Keys](https://resend.com/api-keys) in your Resend dashboard
2. Click "Create API Key"
3. Give it a name (e.g., "Weaver Production")
4. Copy the API key (starts with `re_`)

### Step 3: Add to Environment Variables

#### For Local Development (.env file):

```bash
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=Weaver <noreply@weaver.app>
RESEND_FROM_NAME=Weaver
```

#### For Production (Render):

1. Go to your Render dashboard
2. Navigate to your service → Environment
3. Add these variables:
   - `RESEND_API_KEY` = `re_your_api_key_here`
   - `RESEND_FROM_EMAIL` = `Weaver <noreply@weaver.app>`
   - `RESEND_FROM_NAME` = `Weaver`

### Step 4: Verify Your Domain (Optional but Recommended)

To send from your own domain (e.g., `noreply@weaver.app`):

1. Go to [Domains](https://resend.com/domains) in Resend dashboard
2. Click "Add Domain"
3. Enter your domain (e.g., `weaver.app`)
4. Add the DNS records Resend provides to your domain registrar
5. Wait for verification (usually a few minutes)
6. Update `RESEND_FROM_EMAIL` to use your verified domain:
   ```
   RESEND_FROM_EMAIL=Weaver <noreply@weaver.app>
   ```

**Note:** Until you verify a domain, you can use Resend's test domain for development:
```
RESEND_FROM_EMAIL=Weaver <onboarding@resend.dev>
```

## Testing

### Test Email Sending

1. Set up your assistant settings in Weaver
2. Use the test endpoint:
   ```
   GET /api/test/send-reminder/:userId
   ```
3. Check your email inbox for the reminder

### Check Server Logs

The server will log email sending status:
```
✅ Sent reminder email to user@example.com with 5 contacts (Resend ID: abc123)
```

## Email Template Customization

The email template is in `server.js` in the `generateEmailBody()` function. You can customize:

- **Colors**: Match your brand colors (currently uses Weaver's blue theme)
- **Logo**: Add your logo URL in the header
- **Styling**: Modify the CSS in the `<style>` tag
- **Content**: Update the greeting, footer, etc.

### Adding Your Logo

In `generateEmailBody()`, add your logo:

```javascript
<div class="email-header">
    <img src="https://yourdomain.com/logo.png" alt="Weaver" style="height: 40px; margin-bottom: 10px;">
    <h1>Weaver</h1>
    <div class="subtitle">Follow-up Reminder</div>
</div>
```

## Pricing

- **Free Tier**: 3,000 emails/month
- **Pro**: $20/month for 50,000 emails
- **Business**: Custom pricing for higher volumes

For most users, the free tier is sufficient. Each user gets one reminder email per day/week, so 3,000 emails = ~100 active users.

## Troubleshooting

### "Resend not initialized" Error

- Check that `RESEND_API_KEY` is set in your environment
- Restart your server after adding the key
- Check server logs on startup for Resend initialization status

### Emails Not Arriving

1. Check spam folder
2. Verify `RESEND_FROM_EMAIL` is correct
3. Check Resend dashboard for delivery status
4. Ensure domain is verified (if using custom domain)

### Domain Verification Issues

- DNS records can take up to 48 hours to propagate
- Make sure all required DNS records are added
- Check Resend dashboard for verification status

## Alternative Email Services

If you prefer a different service, Weaver can be adapted to use:

- **SendGrid** - Popular, good free tier
- **Mailgun** - Developer-friendly
- **Postmark** - Great deliverability
- **AWS SES** - Very cheap, more setup required

The code structure in `sendReminderEmail()` can be easily modified to use any email service API.

## Support

- Resend Docs: https://resend.com/docs
- Resend Support: support@resend.com
- Resend Status: https://status.resend.com

