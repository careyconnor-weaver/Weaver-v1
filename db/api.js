const { db } = require('./index');
const { users, contacts, emails, notes, gmailTokens, assistantSettings, userSettings, organizations, orgMembers, orgInvites } = require('./schema');
const { eq, and, desc, inArray } = require('drizzle-orm');

// Check if db is available
if (!db) {
    console.warn('⚠️  Database not initialized. Database operations will fail.');
}

// ============ USERS ============
async function createUser(userId, email, password) {
    const result = await db.insert(users).values({
        id: userId,
        email: email,
        password: (password || '').trim(), // In production, hash this!
    }).returning();
    return result[0];
}

async function getUserByEmail(email) {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] || null;
}

async function getUserById(userId) {
    try {
        // Ensure userId is a string
        const userIdString = String(userId);
        const result = await db.select().from(users).where(eq(users.id, userIdString)).limit(1);
        return result[0] || null;
    } catch (error) {
        console.error('Error in getUserById:', error);
        // Check if it's a column error (schema mismatch)
        if (error.message && (
            error.message.includes('column') && error.message.includes('does not exist') ||
            error.message.includes('Failed query')
        )) {
            throw new Error('Database schema error: Stripe columns may not exist. Please run database migrations: npm run migrate');
        }
        throw error;
    }
}

// Set a user's account type (onboarding choice: 'student' | 'org')
async function setUserAccountType(userId, accountType) {
    const result = await db.update(users)
        .set({ accountType, onboardedAt: new Date() })
        .where(eq(users.id, String(userId)))
        .returning();
    return result[0] || null;
}

// ============ CLUB / ORGANIZATION ============

function generateJoinCode() {
    // Human-friendly, unambiguous code (no 0/O/1/I), e.g. "WVR-7K4PQX"
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
    return `WVR-${code}`;
}

async function createOrganization({ id, name, ownerId, school, application }) {
    if (!db) throw new Error('Database not initialized');
    // Ensure a unique join code
    let joinCode = generateJoinCode();
    for (let attempt = 0; attempt < 5; attempt++) {
        const clash = await db.select().from(organizations).where(eq(organizations.joinCode, joinCode)).limit(1);
        if (clash.length === 0) break;
        joinCode = generateJoinCode();
    }

    const result = await db.insert(organizations).values({
        id,
        name,
        joinCode,
        ownerId: String(ownerId),
        school: school || null,
        application: application || null,
    }).returning();
    const org = result[0];

    // Owner is automatically the first member (owner role)
    await addOrgMember({ orgId: org.id, userId: ownerId, role: 'owner' });
    return org;
}

async function getOrganizationById(orgId) {
    const result = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    return result[0] || null;
}

async function getOrganizationByJoinCode(joinCode) {
    const code = String(joinCode || '').trim().toUpperCase();
    const result = await db.select().from(organizations).where(eq(organizations.joinCode, code)).limit(1);
    return result[0] || null;
}

async function addOrgMember({ orgId, userId, role, displayName }) {
    // Idempotent: don't create a duplicate membership
    const existing = await db.select().from(orgMembers)
        .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, String(userId))))
        .limit(1);
    if (existing.length > 0) return existing[0];

    const result = await db.insert(orgMembers).values({
        id: `${orgId}_${userId}`,
        orgId,
        userId: String(userId),
        role: role || 'member',
        displayName: displayName || null,
    }).returning();
    return result[0];
}

// All orgs a user belongs to, with their role in each
async function getOrgsForUser(userId) {
    const rows = await db.select()
        .from(orgMembers)
        .innerJoin(organizations, eq(orgMembers.orgId, organizations.id))
        .where(eq(orgMembers.userId, String(userId)));
    return rows.map(r => ({ ...r.organizations, role: r.org_members.role, joinedAt: r.org_members.joinedAt }));
}

// Compute networking activity for a single user.
// "Networking calls" = logged call notes; "outreach" = sent emails; plus replies + contacts.
async function getUserNetworkingStats(userId) {
    const userContacts = await db.select({ id: contacts.id }).from(contacts).where(eq(contacts.userId, String(userId)));
    const contactIds = userContacts.map(c => c.id);

    let calls = 0, emailsSent = 0, emailsReceived = 0;
    // Activity dates = the interaction dates the user records + when contacts were added.
    // (contacts.updatedAt and email/note createdAt are rewritten on every sync, so they
    // only mean "last sync" and must not be used as activity signals.)
    const activityDates = [];
    if (contactIds.length > 0) {
        const contactRows = await db.select({ createdAt: contacts.createdAt }).from(contacts).where(eq(contacts.userId, String(userId)));
        const contactEmails = await db.select().from(emails).where(inArray(emails.contactId, contactIds));
        const contactNotes = await db.select().from(notes).where(inArray(notes.contactId, contactIds));
        calls = contactNotes.length;
        emailsSent = contactEmails.filter(e => e.direction === 'sent').length;
        emailsReceived = contactEmails.filter(e => e.direction === 'received').length;
        contactRows.forEach(c => c.createdAt && activityDates.push(new Date(c.createdAt)));
        contactEmails.forEach(e => e.date && activityDates.push(new Date(e.date)));
        contactNotes.forEach(n => n.date && activityDates.push(new Date(n.date)));
    }
    const now = new Date();
    const valid = activityDates.filter(d => !isNaN(d.getTime())).map(d => (d > now ? now : d));
    const lastActivityAt = valid.length ? new Date(Math.max(...valid.map(d => d.getTime()))) : null;

    const contactsCount = contactIds.length;
    const responseRate = emailsSent > 0 ? Math.round((emailsReceived / emailsSent) * 100) : 0;
    // Composite activity score drives the leaderboard: a call is worth more than an email touch.
    const activityScore = (calls * 3) + emailsSent + (emailsReceived * 2) + contactsCount;

    return { userId: String(userId), contactsCount, calls, emailsSent, emailsReceived, responseRate, activityScore, lastActivityAt };
}

// ============ CLUB BILLING (per active member) ============
// A member is "active" (billable) in a period if they recorded at least one
// networking interaction or added a contact during it.

function isActiveSince(stats, since) {
    return !!(stats.lastActivityAt && new Date(stats.lastActivityAt) >= since);
}

async function getOrgActiveMemberCount(orgId, since) {
    const roster = await getOrgRosterWithStats(orgId);
    const active = roster.filter(m => isActiveSince(m, since));
    return { total: roster.length, active: active.length, activeMembers: active.map(m => ({ userId: m.userId, name: m.name, lastActivityAt: m.lastActivityAt })) };
}

async function setOrgBilling(orgId, fields) {
    const result = await db.update(organizations).set(fields).where(eq(organizations.id, orgId)).returning();
    return result[0] || null;
}

async function getOrgByStripeCustomerId(customerId) {
    const result = await db.select().from(organizations).where(eq(organizations.stripeCustomerId, customerId)).limit(1);
    return result[0] || null;
}

async function getOrgsWithActivePlans() {
    return await db.select().from(organizations).where(inArray(organizations.planStatus, ['active', 'trialing', 'past_due']));
}

// True if the user belongs to a club whose plan is active (club pays → member gets Pro).
async function userHasClubCoverage(userId) {
    const orgs = await getOrgsForUser(userId);
    return orgs.some(o => o.planStatus === 'active' || o.planStatus === 'trialing');
}

// Roster with per-member networking stats, sorted for the leaderboard (most active first).
async function getOrgRosterWithStats(orgId) {
    const members = await db.select()
        .from(orgMembers)
        .innerJoin(users, eq(orgMembers.userId, users.id))
        .where(eq(orgMembers.orgId, orgId));

    const roster = await Promise.all(members.map(async (row) => {
        const m = row.org_members;
        const u = row.users;
        const settings = await getUserSettingsById(u.id).catch(() => null);
        const stats = await getUserNetworkingStats(u.id);
        const name = (m.displayName
            || [settings?.firstName, settings?.lastName].filter(Boolean).join(' ').trim()
            || (u.email || '').split('@')[0]);
        return {
            userId: u.id,
            email: u.email,
            name,
            role: m.role,
            joinedAt: m.joinedAt,
            ...stats,
        };
    }));

    roster.sort((a, b) => b.activityScore - a.activityScore);
    roster.forEach((member, i) => { member.rank = i + 1; });
    return roster;
}

async function createOrgInvite({ id, orgId, email, invitedBy }) {
    const result = await db.insert(orgInvites).values({
        id,
        orgId,
        email: String(email).trim().toLowerCase(),
        invitedBy: invitedBy ? String(invitedBy) : null,
    }).returning();
    return result[0];
}

async function getOrgInvites(orgId) {
    return await db.select().from(orgInvites).where(eq(orgInvites.orgId, orgId)).orderBy(desc(orgInvites.createdAt));
}

// ============ CONTACTS ============
async function getContactsByUserId(userId) {
    if (!db) {
        throw new Error('Database not initialized. Check DATABASE_URL environment variable.');
    }
    const contactsList = await db.select().from(contacts).where(eq(contacts.userId, userId));
    if (contactsList.length === 0) return [];

    // Batch-load all emails and notes in 2 queries (was 2 queries PER contact,
    // which made login/page-load slow enough to hang for users with many contacts).
    const ids = contactsList.map(c => c.id);
    const [allEmails, allNotes] = await Promise.all([
        db.select().from(emails).where(inArray(emails.contactId, ids)).orderBy(emails.date),
        db.select().from(notes).where(inArray(notes.contactId, ids)).orderBy(notes.date),
    ]);
    const emailsBy = {}, notesBy = {};
    for (const e of allEmails) (emailsBy[e.contactId] = emailsBy[e.contactId] || []).push(e);
    for (const n of allNotes) (notesBy[n.contactId] = notesBy[n.contactId] || []).push(n);

    return contactsList.map(contact => ({
        ...contact,
        emails: emailsBy[contact.id] || [],
        notes: notesBy[contact.id] || [],
    }));
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

async function deleteEmailsByContactId(contactId) {
    await db.delete(emails).where(eq(emails.contactId, contactId));
}

async function deleteNotesByContactId(contactId) {
    await db.delete(notes).where(eq(notes.contactId, contactId));
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

// ============ USER SETTINGS ============
async function getUserSettingsById(userId) {
    if (!db) return null;
    try {
        const result = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
        return result[0] || null;
    } catch (error) {
        console.error('Error getting user settings:', error);
        return null;
    }
}

async function saveUserSettingsToDb(userId, settings) {
    if (!db) throw new Error('Database not initialized');
    const existing = await getUserSettingsById(userId);
    if (existing) {
        const result = await db
            .update(userSettings)
            .set({ ...settings, updatedAt: new Date() })
            .where(eq(userSettings.userId, userId))
            .returning();
        return result[0] || null;
    } else {
        const result = await db
            .insert(userSettings)
            .values({ userId, ...settings })
            .returning();
        return result[0] || null;
    }
}

// ============ STRIPE SUBSCRIPTIONS ============
// Update user's Stripe customer ID
async function updateUserStripeCustomerId(userId, customerId) {
    const result = await db.update(users)
        .set({ stripeCustomerId: customerId })
        .where(eq(users.id, userId))
        .returning();
    return result[0] || null;
}

// Update user subscription
async function updateUserSubscription(customerId, subscriptionData) {
    // First get user by Stripe customer ID
    const userResult = await db.select()
        .from(users)
        .where(eq(users.stripeCustomerId, customerId))
        .limit(1);
    
    if (userResult.length === 0) {
        throw new Error('User not found for customer ID: ' + customerId);
    }
    
    const userId = userResult[0].id;
    const rec = subscriptionData.items?.data?.[0]?.price?.recurring;
    const fromInterval = rec
        ? (rec.interval === 'year' ? 'annual' : rec.interval === 'month' && rec.interval_count === 3 ? 'quarterly' : rec.interval === 'month' ? 'monthly' : rec.interval)
        : null;
    const planName = subscriptionData.metadata?.plan || fromInterval || 'monthly';
    
    const result = await db.update(users)
        .set({
            stripeSubscriptionId: subscriptionData.id,
            subscriptionStatus: subscriptionData.status,
            subscriptionPlan: planName,
            subscriptionCurrentPeriodEnd: subscriptionData.current_period_end 
                ? new Date(subscriptionData.current_period_end * 1000)
                : null
        })
        .where(eq(users.id, userId))
        .returning();
    
    return result[0] || null;
}

// Cancel user subscription
async function cancelUserSubscription(customerId) {
    // First get user by Stripe customer ID
    const userResult = await db.select()
        .from(users)
        .where(eq(users.stripeCustomerId, customerId))
        .limit(1);
    
    if (userResult.length === 0) {
        throw new Error('User not found for customer ID: ' + customerId);
    }
    
    const userId = userResult[0].id;
    
    const result = await db.update(users)
        .set({
            subscriptionStatus: 'canceled',
            stripeSubscriptionId: null
        })
        .where(eq(users.id, userId))
        .returning();
    
    return result[0] || null;
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
    deleteEmailsByContactId,

    // Notes
    addNote,
    deleteNotesByContactId,
    
    // Gmail Tokens
    saveGmailToken,
    getGmailToken,
    deleteGmailToken,
    
    // Assistant Settings
    getAssistantSettings,
    saveAssistantSettings,
    getAllUsersWithAssistantSettings,
    getContactsNeedingFollowup,
    
    // User Settings
    getUserSettingsById,
    saveUserSettingsToDb,

    // Stripe Subscriptions
    updateUserStripeCustomerId,
    updateUserSubscription,
    cancelUserSubscription,

    // Account type / onboarding
    setUserAccountType,

    // Club / Organization
    createOrganization,
    getOrganizationById,
    getOrganizationByJoinCode,
    addOrgMember,
    getOrgsForUser,
    getUserNetworkingStats,
    getOrgRosterWithStats,
    createOrgInvite,
    getOrgInvites,

    // Club billing
    getOrgActiveMemberCount,
    setOrgBilling,
    getOrgByStripeCustomerId,
    getOrgsWithActivePlans,
    userHasClubCoverage,
};

