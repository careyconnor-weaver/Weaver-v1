# Email Automation Setup Guide

This guide walks you through setting up automated email reminders that send personalized follow-up lists to users based on their Networking Assistant settings.

## Overview

The email automation system will:
1. **Check contacts** daily/hourly based on user settings
2. **Find contacts** that need follow-ups (based on days since last contact, contact type, VIP status)
3. **Send emails** to users' Gmail accounts with a curated list of contacts to follow up with
4. **Respect user preferences** (frequency, time, timezone, reminder types)

---

## What You Need

### 1. **Software/Packages** (Already Installed ✅)
- ✅ `googleapis` - For sending emails via Gmail API
- ✅ `node-cron` - For scheduling tasks (need to install)
- ✅ PostgreSQL database - For storing settings and contacts
- ✅ Express.js server - Already running

### 2. **Gmail API Setup** (Already Configured ✅)
- ✅ OAuth 2.0 credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- ✅ `gmail.send` scope (already included in your OAuth scopes)
- ✅ Refresh tokens stored in database

### 3. **What You Need to Add**
- Install `node-cron` package
- Create a scheduled job system
- Create email template generator
- Create contact query logic
- Set up cron job on Render (or use Render Cron Jobs)

---

## Step-by-Step Implementation

### Step 1: Install Required Package

```bash
npm install node-cron
```

### Step 2: Update Database Schema

You need to store assistant settings in the database instead of localStorage. Add a new table:

**File: `db/schema.js`**
```javascript
// Assistant settings table
const assistantSettings = pgTable('assistant_settings', {
    userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
    coldContactDays: integer('cold_contact_days').default(12),
    establishedContactDays: integer('established_contact_days').default(90),
    reminderColdContacts: boolean('reminder_cold_contacts').default(true),
    reminderEstablishedContacts: boolean('reminder_established_contacts').default(true),
    vipOnly: boolean('vip_only').default(false),
    emailFrequency: varchar('email_frequency', { length: 20 }).default('realtime'), // 'realtime' or 'weekly'
    emailTime: varchar('email_time', { length: 10 }).default('09:00'), // HH:MM format
    emailTimezone: varchar('email_timezone', { length: 50 }).default('America/New_York'),
    enabled: boolean('enabled').default(true),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});
```

Then run:
```bash
npm run db:push
```

### Step 3: Create Database API Functions

**File: `db/api.js`** - Add these functions:

```javascript
// Assistant Settings Functions
async function getAssistantSettings(userId) {
    if (!db) return null;
    try {
        const result = await db.select().from(assistantSettings).where(eq(assistantSettings.userId, userId)).limit(1);
        return result[0] || null;
    } catch (error) {
        console.error('Error getting assistant settings:', error);
        return null;
    }
}

async function saveAssistantSettings(userId, settings) {
    if (!db) return null;
    try {
        const existing = await getAssistantSettings(userId);
        if (existing) {
            const result = await db
                .update(assistantSettings)
                .set({ ...settings, updatedAt: new Date() })
                .where(eq(assistantSettings.userId, userId))
                .returning();
            return result[0];
        } else {
            const result = await db
                .insert(assistantSettings)
                .values({ userId, ...settings })
                .returning();
            return result[0];
        }
    } catch (error) {
        console.error('Error saving assistant settings:', error);
        return null;
    }
}

// Get contacts needing follow-up
async function getContactsNeedingFollowup(userId, settings) {
    if (!db) return [];
    try {
        const userContacts = await getContactsByUserId(userId);
        const now = new Date();
        const contactsNeedingFollowup = [];
        
        for (const contact of userContacts) {
            // Apply VIP filter if enabled
            if (settings.vipOnly && !contact.vip) {
                continue;
            }
            
            // Get last interaction date
            const lastInteraction = await getLastInteractionDate(contact.id);
            if (!lastInteraction) continue;
            
            const daysSinceLastContact = Math.floor((now - new Date(lastInteraction)) / (1000 * 60 * 60 * 24));
            
            // Determine contact type (cold vs established)
            const sentEmails = await getEmailsByContactId(contact.id);
            const hasReceivedReply = sentEmails.some(e => e.direction === 'received');
            const isEstablished = hasReceivedReply || sentEmails.length > 1;
            
            // Check if needs follow-up based on type
            let needsFollowup = false;
            if (isEstablished && settings.reminderEstablishedContacts) {
                needsFollowup = daysSinceLastContact >= settings.establishedContactDays;
            } else if (!isEstablished && settings.reminderColdContacts) {
                needsFollowup = daysSinceLastContact >= settings.coldContactDays;
            }
            
            if (needsFollowup) {
                contactsNeedingFollowup.push({
                    ...contact,
                    daysSinceLastContact,
                    isEstablished
                });
            }
        }
        
        return contactsNeedingFollowup;
    } catch (error) {
        console.error('Error getting contacts needing followup:', error);
        return [];
    }
}
```

### Step 4: Create Email Sending Function

**File: `server.js`** - Add this function:

```javascript
const cron = require('node-cron');

// Send reminder email to user
async function sendReminderEmail(userId, userEmail, contacts) {
    try {
        // Get user's Gmail tokens
        const tokens = await dbAPI.getGmailTokens(userId);
        if (!tokens || !tokens.refreshToken) {
            console.log(`User ${userId} has no Gmail tokens, skipping email`);
            return false;
        }
        
        // Set up OAuth client
        oauth2Client.setCredentials({
            refresh_token: tokens.refreshToken,
            access_token: tokens.accessToken,
            expiry_date: tokens.expiryDate ? new Date(tokens.expiryDate).getTime() : null
        });
        
        // Refresh token if needed
        if (tokens.expiryDate && new Date(tokens.expiryDate) <= new Date()) {
            const { credentials } = await oauth2Client.refreshAccessToken();
            await dbAPI.saveGmailTokens(userId, {
                accessToken: credentials.access_token,
                refreshToken: credentials.refresh_token || tokens.refreshToken,
                expiryDate: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
                tokenType: credentials.token_type,
                scope: credentials.scope
            });
            oauth2Client.setCredentials(credentials);
        }
        
        // Generate email content
        const emailSubject = `Weaver: ${contacts.length} Contact${contacts.length !== 1 ? 's' : ''} Need Your Follow-up`;
        const emailBody = generateEmailBody(contacts);
        
        // Create email message
        const message = [
            `To: ${userEmail}`,
            `Subject: ${emailSubject}`,
            `Content-Type: text/html; charset=utf-8`,
            ``,
            emailBody
        ].join('\n');
        
        // Encode message
        const encodedMessage = Buffer.from(message)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
        
        // Send email via Gmail API
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage
            }
        });
        
        console.log(`✅ Sent reminder email to ${userEmail} with ${contacts.length} contacts`);
        return true;
    } catch (error) {
        console.error(`Error sending reminder email to ${userEmail}:`, error);
        return false;
    }
}

// Generate HTML email body
function generateEmailBody(contacts) {
    const sortedContacts = contacts.sort((a, b) => b.daysSinceLastContact - a.daysSinceLastContact);
    
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: #3182ce; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; max-width: 600px; margin: 0 auto; }
            .contact-item { background: #f5f5f0; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #3182ce; }
            .contact-name { font-weight: bold; font-size: 1.1em; color: #1a2332; }
            .contact-details { margin-top: 8px; color: #4a5568; }
            .days-badge { display: inline-block; background: #f56565; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.9em; margin-left: 10px; }
            .footer { text-align: center; padding: 20px; color: #718096; font-size: 0.9em; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📧 Weaver Follow-up Reminder</h1>
        </div>
        <div class="content">
            <p>Hi there!</p>
            <p>Here are <strong>${contacts.length}</strong> contact${contacts.length !== 1 ? 's' : ''} that need your attention:</p>
    `;
    
    sortedContacts.forEach(contact => {
        const typeLabel = contact.isEstablished ? 'Established Contact' : 'Cold Contact';
        html += `
            <div class="contact-item">
                <div class="contact-name">
                    ${contact.name}
                    <span class="days-badge">${contact.daysSinceLastContact} days</span>
                </div>
                <div class="contact-details">
                    <strong>Type:</strong> ${typeLabel}<br>
                    ${contact.email ? `<strong>Email:</strong> ${contact.email}<br>` : ''}
                    ${contact.firm ? `<strong>Firm:</strong> ${contact.firm}<br>` : ''}
                    ${contact.position ? `<strong>Position:</strong> ${contact.position}<br>` : ''}
                </div>
            </div>
        `;
    });
    
    html += `
            <p style="margin-top: 30px;">
                <a href="https://your-weaver-url.com/#contacts" style="background: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
                    View in Weaver →
                </a>
            </p>
        </div>
        <div class="footer">
            <p>This email was sent by Weaver based on your networking preferences.</p>
            <p>You can update your settings in the "Strengthening the Net" tab.</p>
        </div>
    </body>
    </html>
    `;
    
    return html;
}
```

### Step 5: Create Scheduled Job

**File: `server.js`** - Add cron job:

```javascript
// Process reminder emails for all users
async function processReminderEmails() {
    console.log('🔄 Processing reminder emails...');
    
    try {
        // Get all users with enabled assistant settings
        const users = await dbAPI.getAllUsersWithAssistantSettings();
        
        for (const user of users) {
            const settings = await dbAPI.getAssistantSettings(user.id);
            if (!settings || !settings.enabled) continue;
            
            // Check if it's time to send email based on frequency
            const shouldSend = shouldSendEmailNow(settings);
            if (!shouldSend) continue;
            
            // Get contacts needing follow-up
            const contacts = await dbAPI.getContactsNeedingFollowup(user.id, settings);
            
            if (contacts.length > 0) {
                await sendReminderEmail(user.id, user.email, contacts);
            }
        }
        
        console.log('✅ Finished processing reminder emails');
    } catch (error) {
        console.error('❌ Error processing reminder emails:', error);
    }
}

// Check if email should be sent now based on user settings
function shouldSendEmailNow(settings) {
    const now = new Date();
    const userTimezone = settings.emailTimezone || 'America/New_York';
    
    // Convert current time to user's timezone
    const userTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
    const [hours, minutes] = settings.emailTime.split(':');
    const targetHour = parseInt(hours);
    const targetMinute = parseInt(minutes);
    
    if (settings.emailFrequency === 'weekly') {
        // Send once per week (e.g., Monday at specified time)
        const dayOfWeek = userTime.getDay();
        const currentHour = userTime.getHours();
        const currentMinute = userTime.getMinutes();
        
        // Send on Monday (1) at the specified time
        return dayOfWeek === 1 && 
               currentHour === targetHour && 
               currentMinute >= targetMinute && 
               currentMinute < targetMinute + 5; // 5-minute window
    } else {
        // Real-time: Send daily at specified time
        const currentHour = userTime.getHours();
        const currentMinute = userTime.getMinutes();
        
        return currentHour === targetHour && 
               currentMinute >= targetMinute && 
               currentMinute < targetMinute + 5; // 5-minute window
    }
}

// Schedule cron job - runs every 5 minutes
cron.schedule('*/5 * * * *', () => {
    processReminderEmails();
});

console.log('📅 Email reminder cron job scheduled (runs every 5 minutes)');
```

### Step 6: Create API Endpoint to Save Settings

**File: `server.js`** - Add endpoint:

```javascript
// Save assistant settings
app.post('/api/assistant/settings', async (req, res) => {
    try {
        const userId = req.body.userId;
        if (!userId) {
            return res.status(400).json({ error: 'User ID required' });
        }
        
        const settings = {
            coldContactDays: req.body.coldContactDays || 12,
            establishedContactDays: req.body.establishedContactDays || 90,
            reminderColdContacts: req.body.reminderColdContacts !== undefined ? req.body.reminderColdContacts : true,
            reminderEstablishedContacts: req.body.reminderEstablishedContacts !== undefined ? req.body.reminderEstablishedContacts : true,
            vipOnly: req.body.vipOnly || false,
            emailFrequency: req.body.emailFrequency || 'realtime',
            emailTime: req.body.emailTime || '09:00',
            emailTimezone: req.body.emailTimezone || 'America/New_York',
            enabled: req.body.enabled !== undefined ? req.body.enabled : true
        };
        
        const saved = await dbAPI.saveAssistantSettings(userId, settings);
        
        if (saved) {
            res.json({ success: true, settings: saved });
        } else {
            res.status(500).json({ error: 'Failed to save settings' });
        }
    } catch (error) {
        console.error('Error saving assistant settings:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get assistant settings
app.get('/api/assistant/settings/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const settings = await dbAPI.getAssistantSettings(userId);
        
        if (settings) {
            res.json({ success: true, settings });
        } else {
            res.json({ success: true, settings: null });
        }
    } catch (error) {
        console.error('Error getting assistant settings:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
```

### Step 7: Update Frontend to Save to Database

**File: `script.js`** - Update `initNetworkingAssistant` function:

```javascript
// In the save button handler, replace localStorage with API call:
saveButton.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const user = getCurrentUser();
    if (!user) {
        saveStatus.textContent = 'Please log in to save settings.';
        saveStatus.style.color = 'var(--error)';
        saveStatus.style.display = 'block';
        return;
    }
    
    const settings = {
        coldContactDays: parseInt(document.getElementById('cold-contact-days').value) || 12,
        establishedContactDays: parseInt(document.getElementById('established-contact-days').value) || 90,
        reminderColdContacts: document.getElementById('reminder-cold-contacts').checked,
        reminderEstablishedContacts: document.getElementById('reminder-established-contacts').checked,
        vipOnly: document.getElementById('reminder-vip-only').checked,
        emailFrequency: document.querySelector('input[name="email-frequency"]:checked')?.value || 'realtime',
        emailTime: document.getElementById('email-time').value || '09:00',
        emailTimezone: document.getElementById('email-timezone').value || 'America/New_York',
        enabled: true
    };
    
    // Validate
    if (!settings.reminderColdContacts && !settings.reminderEstablishedContacts) {
        saveStatus.textContent = 'Please select at least one reminder type.';
        saveStatus.style.color = 'var(--error)';
        saveStatus.style.display = 'block';
        return;
    }
    
    // Save to database
    try {
        const response = await fetch('/api/assistant/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, ...settings })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAssistantSuccessPopup();
        } else {
            saveStatus.textContent = 'Error saving settings. Please try again.';
            saveStatus.style.color = 'var(--error)';
            saveStatus.style.display = 'block';
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        saveStatus.textContent = 'Error saving settings. Please try again.';
        saveStatus.style.color = 'var(--error)';
        saveStatus.style.display = 'block';
    }
});
```

### Step 8: Set Up Render Cron Job (Optional)

If you want more control, you can use Render's Cron Jobs feature:

1. Go to your Render dashboard
2. Click "New" → "Cron Job"
3. Set:
   - **Name**: `weaver-email-reminders`
   - **Schedule**: `*/5 * * * *` (every 5 minutes)
   - **Command**: `node -e "require('./server.js')"`
   - **Service**: Your main web service

Or keep the cron job in your main server (simpler for now).

---

## Testing

### Test Email Sending Locally

1. **Set up a test user** with assistant settings
2. **Manually trigger** the email function:
   ```javascript
   // In server.js, add a test endpoint:
   app.get('/api/test/send-reminder/:userId', async (req, res) => {
       const userId = req.params.userId;
       const settings = await dbAPI.getAssistantSettings(userId);
       const contacts = await dbAPI.getContactsNeedingFollowup(userId, settings);
       await sendReminderEmail(userId, 'test@example.com', contacts);
       res.json({ success: true, contactsCount: contacts.length });
   });
   ```

3. **Visit**: `http://localhost:3000/api/test/send-reminder/YOUR_USER_ID`

### Verify Cron Job

Check your server logs - you should see:
```
🔄 Processing reminder emails...
✅ Sent reminder email to user@example.com with 5 contacts
✅ Finished processing reminder emails
```

---

## Important Notes

1. **Gmail API Limits**: 
   - Free tier: 1 billion quota units per day
   - Sending an email uses ~100 quota units
   - You can send ~10 million emails per day (plenty for your use case)

2. **Time Zone Handling**: 
   - The cron job runs every 5 minutes
   - It checks each user's timezone and sends at their specified time
   - Uses a 5-minute window to catch the right time

3. **Error Handling**:
   - If a user's Gmail token expires, the system will try to refresh it
   - If refresh fails, the email is skipped (user needs to reconnect Gmail)

4. **Database Performance**:
   - Consider adding indexes on `contacts.userId`, `emails.contactId`, `emails.date`
   - For large user bases, consider caching or batching

---

## Next Steps

1. ✅ Install `node-cron`
2. ✅ Update database schema
3. ✅ Create API functions
4. ✅ Implement email sending
5. ✅ Set up cron job
6. ✅ Update frontend to save to database
7. ✅ Test locally
8. ✅ Deploy to Render
9. ✅ Monitor logs

---

## Troubleshooting

**Emails not sending?**
- Check Gmail tokens are valid
- Verify OAuth scopes include `gmail.send`
- Check server logs for errors
- Verify cron job is running

**Wrong time?**
- Check timezone conversion logic
- Verify user's timezone setting
- Check server timezone vs user timezone

**No contacts found?**
- Verify contact data exists
- Check date calculations
- Verify filter settings (VIP, cold/established)

---

## Summary

You now have a complete email automation system that:
- ✅ Checks contacts daily based on user settings
- ✅ Sends personalized emails with follow-up lists
- ✅ Respects user preferences (time, frequency, filters)
- ✅ Uses Gmail API to send emails
- ✅ Runs automatically via cron job

The system is ready to deploy! 🚀


