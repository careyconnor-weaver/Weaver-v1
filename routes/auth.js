// Account endpoints: signup, login, logout, current user, change password.
// Sessions live in an httpOnly cookie (see lib/auth.js); the browser never sees the token.

const express = require('express');
const crypto = require('crypto');
const auth = require('../lib/auth');
const { resolvePlan, publicPlan } = require('../lib/plans');

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

function cleanEmail(v) {
    return String(v || '').trim().toLowerCase();
}

// Same normalization the app always applied, so existing passwords keep working.
function cleanPassword(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/\s/g, '').replace(/[​-‍﻿]/g, '').replace(/[\x00-\x1F\x7F]/g, '');
}

function publicUser(u, plan, orgs) {
    const memberships = (orgs || []).map((o) => ({
        id: o.id,
        name: o.name,
        school: o.school || null,
        role: o.role,
        verified: !!o.verified,
        orgType: o.orgType || 'club',
    }));
    const manages = memberships.some((m) => m.role === 'owner' || m.role === 'admin');
    return {
        id: u.id,
        email: u.email,
        createdAt: u.createdAt,
        accountType: u.accountType || null,
        onboardedAt: u.onboardedAt || null,
        // 'manager' = runs a club or career center; 'student' = everyone else.
        role: u.accountType === 'org' || manages ? 'manager' : 'student',
        subscriptionStatus: u.subscriptionStatus || 'free',
        subscriptionPlan: u.subscriptionPlan || null,
        subscriptionCurrentPeriodEnd: u.subscriptionCurrentPeriodEnd || null,
        hasBillingAccount: !!u.stripeCustomerId,
        plan: publicPlan(plan),
        // Kept for older parts of the client: true when a club pays for this member.
        clubCovered: plan.key === 'club_plus',
        orgs: memberships,
    };
}

module.exports = function authRoutes({ pool, dbAPI }) {
    const router = express.Router();

    async function describe(user) {
        let orgs = [];
        try { orgs = await dbAPI.getOrgsForUser(user.id); } catch (e) { /* org tables optional */ }
        return publicUser(user, resolvePlan(user, orgs), orgs);
    }

    async function startSession(req, res, user) {
        const { token } = await auth.createSession(pool, user.id, req);
        auth.setSessionCookie(req, res, token);
    }

    async function signup(req, res) {
        try {
            const limit = auth.hit('signup-ip:' + req.ip, 10, 3600000);
            if (!limit.allowed) return res.status(429).json({ error: `Too many sign-ups from this network. Try again in ${Math.ceil(limit.retryAfterSec / 60)} minutes.` });

            const email = cleanEmail(req.body && req.body.email);
            const password = cleanPassword(req.body && req.body.password);
            if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
            const problem = auth.passwordProblem(password);
            if (problem) return res.status(400).json({ error: problem });
            if (await dbAPI.getUserByEmail(email)) {
                return res.status(400).json({ error: 'An account with this email already exists. Log in instead.' });
            }
            const id = 'u_' + crypto.randomBytes(9).toString('base64url');
            const hash = await auth.hashPassword(password);
            const user = await dbAPI.createUser(id, email, hash);
            await startSession(req, res, user);
            res.json({ success: true, user: await describe(user) });
        } catch (error) {
            if (error.code === '23505') return res.status(400).json({ error: 'An account with this email already exists. Log in instead.' });
            console.error('Signup error:', error.message);
            res.status(500).json({ error: 'Could not create your account. Try again.' });
        }
    }

    async function login(req, res) {
        try {
            const email = cleanEmail(req.body && req.body.email);
            const password = cleanPassword(req.body && req.body.password);
            if (!email || !password) return res.status(400).json({ error: 'Enter your email and password.' });

            const byIp = auth.hit('login-ip:' + req.ip, 30, 900000);
            const byEmail = auth.hit('login-email:' + email, 8, 900000);
            if (!byIp.allowed || !byEmail.allowed) {
                const wait = Math.max(byIp.retryAfterSec, byEmail.retryAfterSec);
                return res.status(429).json({ error: `Too many sign-in attempts. Try again in ${Math.ceil(wait / 60)} minutes.` });
            }

            const user = await dbAPI.getUserByEmail(email);
            // Verify against a dummy hash when the user doesn't exist, so response time
            // doesn't reveal which emails have accounts.
            const check = await auth.verifyPassword(password, user ? cleanPassword(user.password) : 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$' + 'A'.repeat(86) + '==');
            if (!user || !check.ok) return res.status(401).json({ error: 'That email and password don’t match an account.' });

            if (check.needsRehash) {
                const hash = await auth.hashPassword(password);
                await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hash, user.id]);
            }
            await startSession(req, res, user);
            res.json({ success: true, user: await describe(user) });
        } catch (error) {
            console.error('Login error:', error.message);
            res.status(500).json({ error: 'Could not sign you in. Try again.' });
        }
    }

    router.post('/auth/signup', signup);
    router.post('/auth/login', login);
    // Older clients call these paths.
    router.post('/users/signup', signup);
    router.post('/users/login', login);

    router.post('/auth/logout', async (req, res) => {
        try { await auth.destroySession(pool, auth.sessionToken(req)); } catch (e) { /* already gone */ }
        auth.clearSessionCookie(req, res);
        res.json({ success: true });
    });

    router.get('/auth/me', async (req, res) => {
        if (!req.user) return res.status(401).json({ error: 'Please log in again.', code: 'auth_required' });
        res.json({ success: true, user: await describe(req.user) });
    });

    router.post('/auth/change-password', async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: 'Please log in again.', code: 'auth_required' });
            const current = cleanPassword(req.body && req.body.currentPassword);
            const next = cleanPassword(req.body && req.body.newPassword);
            const problem = auth.passwordProblem(next);
            if (problem) return res.status(400).json({ error: problem });
            const row = await dbAPI.getUserById(req.user.id);
            const check = await auth.verifyPassword(current, cleanPassword(row.password));
            if (!check.ok) return res.status(400).json({ error: 'Your current password is incorrect.' });
            await pool.query('UPDATE users SET password = $1 WHERE id = $2', [await auth.hashPassword(next), req.user.id]);
            // Sign out every other device.
            await auth.destroyUserSessions(pool, req.user.id, auth.sessionToken(req));
            res.json({ success: true });
        } catch (error) {
            console.error('Change password error:', error.message);
            res.status(500).json({ error: 'Could not change your password. Try again.' });
        }
    });

    router.describe = describe;
    return router;
};

module.exports.publicUser = publicUser;
module.exports.cleanPassword = cleanPassword;
