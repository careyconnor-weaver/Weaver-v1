# Fix SSL Certificate Error for studentweaver.com

## The Problem
Safari (and other browsers) show "Can't establish a secure connection" when accessing `studentweaver.com`. This is an SSL/HTTPS certificate issue, not a code issue.

## Solution

### Option 1: Configure Custom Domain in Render (Recommended)

1. **Go to Render Dashboard**: https://render.com
2. **Click on your "weaver" web service**
3. **Go to Settings tab**
4. **Scroll down to "Custom Domains" section**
5. **Click "Add Custom Domain"**
6. **Enter**: `studentweaver.com`
7. **Click "Add"**
8. **Render will provide DNS instructions**:
   - You'll need to add CNAME or A records to your DNS provider
   - Render will automatically provision SSL certificate after DNS is configured

### Option 2: Update DNS Records

If you've already added the domain in Render, you need to update DNS:

1. **Go to your DNS provider** (where you bought the domain - GoDaddy, Namecheap, etc.)
2. **Add/Update DNS records**:
   - Type: `CNAME`
   - Name: `@` (or `studentweaver.com`)
   - Value: `your-render-url.onrender.com` (find this in Render dashboard)
   - OR
   - Type: `A`
   - Name: `@`
   - Value: `[IP addresses from Render]`

3. **Wait for DNS propagation** (can take up to 48 hours, usually 5-15 minutes)
4. **Render will automatically provision SSL certificate** once DNS is correct

### Option 3: Use Render's HTTPS (Free)

Render automatically provides HTTPS for `.onrender.com` domains:
- If you can use `weaver-xxxx.onrender.com`, HTTPS works automatically
- Custom domains need to be configured as above

## Verify SSL is Working

After DNS is configured:
1. Wait 5-15 minutes for DNS propagation
2. Check SSL certificate status in Render dashboard
3. Try accessing `https://studentweaver.com` (with https://)
4. You should see a valid SSL certificate

## Common Issues

### "Certificate not yet provisioned"
- DNS might not be correctly configured
- Wait a few more minutes
- Check DNS records are correct

### "Domain not verified"
- Make sure you added the domain in Render dashboard first
- Verify DNS records match what Render expects

### Still getting SSL error
- Clear browser cache
- Try a different browser
- Check if DNS has propagated: https://www.whatsmydns.net
- Verify DNS records are correct

## Quick Checklist

- [ ] Domain added in Render dashboard (Settings → Custom Domains)
- [ ] DNS records updated at domain provider
- [ ] DNS records match Render's requirements
- [ ] Waited for DNS propagation (5-15 minutes)
- [ ] Render shows SSL certificate as active
- [ ] Tried accessing https://studentweaver.com (with https://)
- [ ] Cleared browser cache if still having issues

## Note

This is a **deployment/domain configuration issue**, not a code issue. The code is fine - you just need to properly configure the custom domain and SSL certificate in Render (or your hosting provider).
