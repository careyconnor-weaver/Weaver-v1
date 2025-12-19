const { db } = require('./index');
const { users, contacts, emails, notes, gmailTokens } = require('./schema');
const { eq, and, desc } = require('drizzle-orm');

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
    
    // Notes
    addNote,
    
    // Gmail Tokens
    saveGmailToken,
    getGmailToken,
    deleteGmailToken,
};

