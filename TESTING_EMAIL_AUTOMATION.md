# Testing Email Automation - Step-by-Step Guide

This guide walks you through testing the email automation feature from start to finish.

---

## 🧪 Prerequisites

Before testing, make sure you have:
- ✅ Server running (`npm start`)
- ✅ Database connected (check server logs)
- ✅ Gmail OAuth configured (check profile menu)
- ✅ At least one user account created
- ✅ At least one contact added to your network

---

## 📋 Step 1: Set Up Your Test User

### 1.1 Log In
1. Open your browser to `http://localhost:3000`
2. Click the profile icon (top right)
3. Log in or create an account
4. **Note your User ID** (shown in the profile menu dropdown)

### 1.2 Connect Gmail
1. In the profile menu, click "Connect Gmail"
2. Complete the OAuth flow
3. You should see "Gmail Connected" message
4. **Important:** Make sure you grant `gmail.send` permission

---

## 📋 Step 2: Configure Email Settings

### 2.1 Navigate to Settings
1. Click "Strengthening the Net" in the navigation
2. Scroll down to "Set Up Your Networking Assistant"

### 2.2 Configure Your Preferences
1. **Cold Contact Days:** Set to `5` (for faster testing)
2. **Established Contact Days:** Set to `10` (for faster testing)
3. **Reminder Types:** Check both "Cold contacts" and "Established contacts"
4. **VIP Only:** Leave unchecked (unless you want to test VIP filter)
5. **Email Frequency:** Choose "Real-time" (sends daily at your specified time)
6. **Email Time:** Set to a time 2-3 minutes from now (e.g., if it's 2:00 PM, set to 2:03 PM)
7. **Timezone:** Select your timezone

### 2.3 Save Settings
1. Click "Save Settings"
2. You should see the green success popup: "✓ You have successfully updated your email preferences"
3. Check server logs - you should see the settings being saved

---

## 📋 Step 3: Add Test Contacts

### 3.1 Add Contacts with Old Dates
You need contacts that are past their follow-up threshold.

**Option A: Add New Contact with Old Date**
1. Go to "Add Contacts" tab
2. Fill in contact details:
   - Name: "Test Contact 1"
   - Email: "test1@example.com"
   - First Contact Date: Set to **15 days ago** (or more)
3. Click "Add Contact"

**Option B: Use Existing Contact**
1. Go to "My Network" tab
2. Find an existing contact
3. Click on them to view details
4. Add an old email interaction:
   - Click "Add Email Sent"
   - Set date to **15 days ago** (or more)
   - Click "Add Interaction"

### 3.2 Verify Contact Status
1. Go to "Strengthening the Net" tab
2. Scroll to "Preview Your Contacts That Need a Follow-up"
3. Your test contact should appear in the list
4. Note the "Days Since Last Contact" - should be >= your cold contact days setting

---

## 📋 Step 4: Test Email Sending (Manual Test)

### 4.1 Use the Test Endpoint
This bypasses the time check and sends immediately.

1. **Get your User ID:**
   - Click profile icon
   - Note the User ID shown in the dropdown

2. **Open test endpoint in browser:**
   ```
   http://localhost:3000/api/test/send-reminder/YOUR_USER_ID
   ```
   Replace `YOUR_USER_ID` with your actual ID

3. **Expected Response:**
   ```json
   {
     "success": true,
     "contactsCount": 1,
     "message": "Email sent with 1 contacts"
   }
   ```

4. **Check Your Email:**
   - Open your Gmail inbox
   - Look for email from: **your-email@gmail.com** (your own email)
   - Subject: "Weaver: 1 Contact Needs Your Follow-up"
   - Should contain your test contact's details

5. **Check Server Logs:**
   ```
   ✅ Sent reminder email to your@email.com with 1 contacts
   ```

### 4.2 Troubleshooting Test Endpoint

**If you get an error:**

**Error: "Assistant settings not found"**
- Go back to Step 2 and make sure you saved your settings
- Refresh the page and try again

**Error: "User not found"**
- Check that you're using the correct User ID
- Make sure you're logged in

**Error: "User has no Gmail tokens"**
- Go back to Step 1.2 and reconnect Gmail
- Make sure OAuth completed successfully

**No email received:**
- Check spam folder
- Check server logs for errors
- Verify Gmail connection in profile menu
- Make sure you granted `gmail.send` permission

---

## 📋 Step 5: Test Automatic Cron Job

### 5.1 Set Time for Testing
1. Go back to "Strengthening the Net" tab
2. Click "Edit Time" next to Email Frequency
3. Set time to **2-3 minutes from now**
4. Save settings

### 5.2 Wait and Monitor
1. **Watch server logs:**
   - Every 5 minutes, you should see: `🔄 Processing reminder emails...`
   - When your time arrives, you should see: `✅ Sent reminder email...`

2. **Check your email:**
   - Wait for the scheduled time
   - Check your inbox
   - Email should arrive within 5 minutes of your set time

### 5.3 Verify Cron Job is Running
**Check server startup logs:**
```
📅 Email reminder cron job scheduled (runs every 5 minutes)
```

**Check periodic logs (every 5 minutes):**
```
🔄 Processing reminder emails...
✅ Finished processing reminder emails
```

---

## 📋 Step 6: Test Different Scenarios

### 6.1 Test Cold Contacts Only
1. Update settings:
   - Uncheck "Established contacts"
   - Check "Cold contacts"
2. Save settings
3. Use test endpoint or wait for scheduled time
4. Should only include contacts with no replies

### 6.2 Test Established Contacts Only
1. Update settings:
   - Check "Established contacts"
   - Uncheck "Cold contacts"
2. Save settings
3. Use test endpoint
4. Should only include contacts who have replied

### 6.3 Test VIP Filter
1. Mark a contact as VIP (in their profile)
2. Update settings:
   - Check "Show only VIP contacts"
3. Save settings
4. Use test endpoint
5. Should only include VIP contacts

### 6.4 Test Weekly Frequency
1. Update settings:
   - Change "Email Frequency" to "Weekly digest"
   - Set time (e.g., 9:00 AM)
2. Save settings
3. **Note:** Weekly emails only send on Mondays at your set time
4. For testing, use the manual test endpoint instead

---

## 📋 Step 7: Test on Render (Production)

### 7.1 Deploy to Render
1. Push code to GitHub:
   ```bash
   git add .
   git commit -m "Add email automation"
   git push
   ```

2. Wait for Render to deploy (check dashboard)

### 7.2 Test on Production
1. **Get your production URL:**
   - Go to Render dashboard
   - Find your web service URL
   - Example: `https://weaver-abc123.onrender.com`

2. **Test endpoint:**
   ```
   https://your-app.onrender.com/api/test/send-reminder/YOUR_USER_ID
   ```

3. **Check Render logs:**
   - Go to Render dashboard → Your service → Logs
   - Look for: `📅 Email reminder cron job scheduled`
   - Look for: `🔄 Processing reminder emails...`

### 7.3 Monitor Production
- Check logs every few minutes
- Verify emails are being sent
- Check for any errors

---

## 🔍 Debugging Tips

### Check Server Logs
Look for these messages:

**Good signs:**
```
✅ Database connection configured
✅ Gmail API credentials loaded
📅 Email reminder cron job scheduled (runs every 5 minutes)
🔄 Processing reminder emails...
✅ Sent reminder email to user@email.com with X contacts
```

**Error signs:**
```
❌ Error processing reminder emails: [error message]
Error sending reminder email to user@email.com: [error]
User user_id has no Gmail tokens, skipping email
```

### Common Issues

**1. "No Gmail tokens"**
- **Fix:** Reconnect Gmail in profile menu
- **Verify:** Check `/api/gmail/status?userId=YOUR_USER_ID`

**2. "No contacts found"**
- **Fix:** Make sure contacts have old interaction dates
- **Verify:** Check "Preview Your Contacts" section

**3. "Settings not found"**
- **Fix:** Go to "Strengthening the Net" and save settings
- **Verify:** Check database or use GET endpoint

**4. "Email not received"**
- **Fix:** Check spam folder
- **Fix:** Verify Gmail connection
- **Fix:** Check server logs for send errors

**5. "Wrong time"**
- **Fix:** Check timezone setting
- **Fix:** Cron runs every 5 minutes, so there's a 5-minute window

---

## ✅ Success Checklist

- [ ] User account created and logged in
- [ ] Gmail connected successfully
- [ ] Email settings configured and saved
- [ ] Test contacts added with old dates
- [ ] Test endpoint returns success
- [ ] Email received in Gmail inbox
- [ ] Cron job running (check logs)
- [ ] Automatic emails sending at scheduled time
- [ ] Different scenarios tested (cold, established, VIP)
- [ ] Production deployment tested

---

## 🎯 Quick Test Script

**Fastest way to test everything:**

1. **Set up (5 minutes):**
   ```bash
   # Start server
   npm start
   
   # In browser:
   # 1. Log in
   # 2. Connect Gmail
   # 3. Add contact with date 15 days ago
   # 4. Configure settings (5 days cold, 10 days established)
   # 5. Save settings
   ```

2. **Test immediately:**
   ```
   # Visit: http://localhost:3000/api/test/send-reminder/YOUR_USER_ID
   # Check email inbox
   ```

3. **Verify automatic:**
   ```
   # Set time to 2 minutes from now
   # Wait and watch server logs
   # Check email inbox
   ```

---

## 📞 Need Help?

If something isn't working:

1. **Check server logs** - Most errors are logged there
2. **Check browser console** - For frontend errors
3. **Verify database** - Settings should be saved
4. **Test endpoint** - Use manual test to isolate issues
5. **Check Gmail connection** - Reconnect if needed

---

## 🎉 You're Done!

Once you've completed these tests, your email automation is working correctly! The system will now automatically send reminder emails based on your users' preferences.


