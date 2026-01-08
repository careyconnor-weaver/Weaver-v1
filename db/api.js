const { db } = require('./index');
const { users, contacts, emails, notes, gmailTokens, assistantSettings } = require('./schema');
const { eq, and, desc } = require('drizzle-orm');

// Check if db is available
if (!db) {
    console.warn('⚠️  Database not initialized. Database operations will fail.');
}

// ============ USERS ============
async function createUser(userId, email, password) {
    const result = await db.insert(users).values({
        id: userId,
        email: email,
        password: password, // In production, hash this!
    }).returning();
    return result[0];
}

async function getUserByEmail(email) {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] || null;
}

async function getUserById(userId) {
    const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return result[0] || null;
}

// ============ CONTACTS ============
async function getContactsByUserId(userId) {
    if (!db) {
        throw new Error('Database not initialized. Check DATABASE_URL environment variable.');
    }
    const contactsList = await db.select().from(contacts).where(eq(contacts.userId, userId));
    
    // Get emails and notes for each contact
    const contactsWithData = await Promise.all(contactsList.map(async (contact) => {
        const contactEmails = await db.select()
            .from(emails)
            .where(eq(emails.contactId, contact.id))
            .orderBy(emails.date);
        
        const contactNotes = await db.select()
            .from(notes)
            .where(eq(notes.contactId, contact.id))
            .orderBy(notes.date);
        
        return {
            ...contact,
            emails: contactEmails,
            notes: contactNotes,
        };
    }));
    
    return contactsWithData;
}

async function getContactById(contactId, userId) {
    const contact = await db.select()
        .from(contacts)
        .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
        .limit(1);
    
    if (contact.length === 0) return null;
    
    const contactEmails = await db.select()
        .from(emails)
        .where(eq(emails.contactId, contactId))
        .orderBy(emails.date);
    
    const contactNotes = await db.select()
        .from(notes)
        .where(eq(notes.contactId, contactId))
        .orderBy(notes.date);
    
    return {
        ...contact[0],
        emails: contactEmails,
        notes: contactNotes,
    };
}

async function createContact(contactData) {
    const { id, userId, name, email, firm, company, position, phone, location, priority, vip, firstEmailDate, generalNotes } = contactData;
    
    const result = await db.insert(contacts).values({
        id,
        userId,
        name,
        email: email || null,
        firm: firm || null,
        company: company || null,
        position: position || null,
        phone: phone || null,
        location: location || null,
        priority: priority || null,
        vip: vip || false,
        firstEmailDate: firstEmailDate || null,
        generalNotes: generalNotes || null,
    }).returning();
    
    return result[0];
}

async function updateContact(contactId, userId, updates) {
    const result = await db.update(contacts)
        .set({
            ...updates,
            updatedAt: new Date(),
        })
        .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
        .returning();
    
    return result[0] || null;
}

async function deleteContact(contactId, userId) {
    // Cascade delete will handle emails and notes
    await db.delete(contacts)
        .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)));
    return true;
}

async function deleteAllContacts(userId) {
    await db.delete(contacts).where(eq(contacts.userId, userId));
    return true;
}

// ============ EMAILS ============
async function addEmail(contactId, emailData) {
    const { id, date, direction, type, subject } = emailData;
    
    const result = await db.insert(emails).values({
        id,
        contactId,
        date,
        direction,
        type: type || null,
        subject: subject || null,
    }).returning();
    
    return result[0];
}

// ============ NOTES ============
async function addNote(contactId, noteData) {
    const { id, date, summary, extractedText, imageUrl, isTextNote } = noteData;
    
    const result = await db.insert(notes).values({
        id,
        contactId,
        date,
        summary,
        extractedText: extractedText || null,
        imageUrl: imageUrl || null,
        isTextNote: isTextNote || false,
    }).returning();
    
    return result[0];
}

// ============ GMAIL TOKENS ============
async function saveGmailToken(userId, tokenData) {
    const { accessToken, refreshToken, expiryDate, tokenType, scope } = tokenData;
    
    // Check if token exists
    const existing = await db.select()
        .from(gmailTokens)
        .where(eq(gmailTokens.userId, userId))
        .limit(1);
    
    if (existing.length > 0) {
        // Update existing
        const result = await db.update(gmailTokens)
            .set({
                accessToken,
                refreshToken: refreshToken || existing[0].refreshToken,
                expiryDate: expiryDate || null,
                tokenType: tokenType || null,
                scope: scope || null,
                updatedAt: new Date(),
            })
            .where(eq(gmailTokens.userId, userId))
            .returning();
        return result[0];
    } else {
        // Insert new
        const result = await db.insert(gmailTokens).values({
            userId,
            accessToken,
            refreshToken: refreshToken || null,
            expiryDate: expiryDate || null,
            tokenType: tokenType || null,
            scope: scope || null,
        }).returning();
        return result[0];
    }
}

async function getGmailToken(userId) {
    const result = await db.select()
        .from(gmailTokens)
        .where(eq(gmailTokens.userId, userId))
        .limit(1);
    return result[0] || null;
}

async function deleteGmailToken(userId) {
    await db.delete(gmailTokens).where(eq(gmailTokens.userId, userId));
    return true;
}

// Helper function to get emails by contact ID
async function getEmailsByContactId(contactId) {
    const result = await db.select()
        .from(emails)
        .where(eq(emails.contactId, contactId))
        .orderBy(emails.date);
    return result;
}

// Helper function to get last interaction date (email or note)
async function getLastInteractionDate(contactId) {
    // Get most recent email
    const recentEmails = await db.select()
        .from(emails)
        .where(eq(emails.contactId, contactId))
        .orderBy(desc(emails.date))
        .limit(1);
    
    // Get most recent note
    const recentNotes = await db.select()
        .from(notes)
        .where(eq(notes.contactId, contactId))
        .orderBy(desc(notes.date))
        .limit(1);
    
    const emailDate = recentEmails.length > 0 ? new Date(recentEmails[0].date) : null;
    const noteDate = recentNotes.length > 0 ? new Date(recentNotes[0].date) : null;
    
    if (!emailDate && !noteDate) return null;
    if (!emailDate) return noteDate;
    if (!noteDate) return emailDate;
    
    return emailDate > noteDate ? emailDate : noteDate;
}

// ============ ASSISTANT SETTINGS ============
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
    if (!db) {
        console.error('Database not initialized in saveAssistantSettings');
        throw new Error('Database not initialized');
    }
    try {
        const existing = await getAssistantSettings(userId);
        
        if (existing) {
            const result = await db
                .update(assistantSettings)
                .set({ ...settings, updatedAt: new Date() })
                .where(eq(assistantSettings.userId, userId))
                .returning();
            return result[0] || null;
        } else {
            const result = await db
                .insert(assistantSettings)
                .values({ userId, ...settings })
                .returning();
            return result[0] || null;
        }
    } catch (error) {
        console.error('Error saving assistant settings:', error);
        // Re-throw the error so it can be handled by the API endpoint
        throw error;
    }
}

// Get all users with enabled assistant settings
async function getAllUsersWithAssistantSettings() {
    if (!db) return [];
    try {
        const result = await db.select()
            .from(assistantSettings)
            .innerJoin(users, eq(assistantSettings.userId, users.id))
            .where(eq(assistantSettings.enabled, true));
        
        return result.map(row => row.users);
    } catch (error) {
        console.error('Error getting users with assistant settings:', error);
        return [];
    }
}

// Get contacts needing follow-up
async function getContactsNeedingFollowup(userId, settings) {
    if (!db) return [];
    try {
        const userContacts = await getContactsByUserId(userId);
        const now = new Date();
        const contactsNeedingFollowup = [];
        
        console.log(`[getContactsNeedingFollowup] Checking ${userContacts.length} contacts for user ${userId}`);
        console.log(`[getContactsNeedingFollowup] Settings:`, {
            coldContactDays: settings.coldContactDays,
            establishedContactDays: settings.establishedContactDays,
            reminderColdContacts: settings.reminderColdContacts,
            reminderEstablishedContacts: settings.reminderEstablishedContacts,
            vipOnly: settings.vipOnly
        });
        
        for (const contact of userContacts) {
            // Apply VIP filter if enabled
            if (settings.vipOnly && !contact.vip) {
                continue;
            }
            
            // Get last interaction date
            const lastInteraction = await getLastInteractionDate(contact.id);
            if (!lastInteraction) {
                console.log(`[getContactsNeedingFollowup] Contact ${contact.name} has no interactions, skipping`);
                continue;
            }
            
            const daysSinceLastContact = Math.floor((now - new Date(lastInteraction)) / (1000 * 60 * 60 * 24));
            
            // Determine contact type (cold vs established)
            const sentEmails = contact.emails || await getEmailsByContactId(contact.id);
            const hasReceivedReply = sentEmails.some(e => e.direction === 'received');
            const isEstablished = hasReceivedReply || sentEmails.length > 1;
            
            // Check if needs follow-up based on type
            // IMPORTANT: Include ALL contacts that are overdue (>= threshold), not just ones that become due today
            let needsFollowup = false;
            if (isEstablished && settings.reminderEstablishedContacts) {
                needsFollowup = daysSinceLastContact >= settings.establishedContactDays;
                if (needsFollowup) {
                    console.log(`[getContactsNeedingFollowup] Contact ${contact.name} is established and overdue: ${daysSinceLastContact} days (threshold: ${settings.establishedContactDays})`);
                }
            } else if (!isEstablished && settings.reminderColdContacts) {
                needsFollowup = daysSinceLastContact >= settings.coldContactDays;
                if (needsFollowup) {
                    console.log(`[getContactsNeedingFollowup] Contact ${contact.name} is cold and overdue: ${daysSinceLastContact} days (threshold: ${settings.coldContactDays})`);
                }
            }
            
            if (needsFollowup) {
                contactsNeedingFollowup.push({
                    ...contact,
                    daysSinceLastContact,
                    isEstablished
                });
            }
        }
        
        console.log(`[getContactsNeedingFollowup] Found ${contactsNeedingFollowup.length} contacts needing follow-up`);
        return contactsNeedingFollowup;
    } catch (error) {
        console.error('Error getting contacts needing followup:', error);
        return [];
    }
}

module.exports = {
    // Users
    createUser,
    getUserByEmail,
    getUserById,
    
    // Contacts
    getContactsByUserId,
    getContactById,
    createContact,
    updateContact,
    deleteContact,
    deleteAllContacts,
    
    // Emails
    addEmail,
    getEmailsByContactId,
    
    // Notes
    addNote,
    
    // Gmail Tokens
    saveGmailToken,
    getGmailToken,
    deleteGmailToken,
    
    // Assistant Settings
    getAssistantSettings,
    saveAssistantSettings,
    getAllUsersWithAssistantSettings,
    getContactsNeedingFollowup,
};

