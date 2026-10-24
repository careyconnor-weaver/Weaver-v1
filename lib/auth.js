// Accounts: password hashing, server-side sessions, and in-memory rate limits.
//
// Sessions are opaque random tokens kept in an httpOnly cookie. Only a SHA-256 hash of
// the token is stored, so a database leak does not leak usable sessions. Passwords are
// hashed with scrypt (Node built-in, no extra dependency). Accounts created before this
// change stored plaintext passwords; those are hashed at startup and on next login.

const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);

const SESSION_COOKIE = 'weaver_session';
const SESSION_DAYS = 30;
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

// ---------------- passwords ----------------

async function hashPassword(password) {
    const salt = crypto.randomBytes(16);
    const key = await scrypt(String(password), salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: 64 * 1024 * 1024 });
    return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), key.toString('base64')].join('$');
}

function isHashed(stored) {
    return typeof stored === 'string' && stored.startsWith('scrypt$');
}

function sameBytes(a, b) {
    const ha = crypto.createHash('sha256').update(String(a)).digest();
    const hb = crypto.createHash('sha256').update(String(b)).digest();
    return crypto.timingSafeEqual(ha, hb);
}

// Returns { ok, needsRehash }. Legacy plaintext values are compared in constant time.
async function verifyPassword(password, stored) {
    if (!stored) return { ok: false, needsRehash: false };
    if (!isHashed(stored)) {
        return { ok: sameBytes(password, stored), needsRehash: true };
    }
    const [, n, r, p, saltB64, keyB64] = stored.split('$');
    const expected = Buffer.from(keyB64, 'base64');
    const key = await scrypt(String(password), Buffer.from(saltB64, 'base64'), expected.length, { N: +n, r: +r, p: +p, maxmem: 64 * 1024 * 1024 });
    return { ok: crypto.timingSafeEqual(key, expected), needsRehash: +n !== SCRYPT.N };
}

function passwordProblem(password) {
    const p = String(password || '');
    if (p.length < 8) return 'Use at least 8 characters for your password.';
    if (p.length > 200) return 'That password is too long.';
    return null;
}

// ---------------- sessions ----------------

function tokenId(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

async function createSession(pool, userId, req) {
    const token = crypto.randomBytes(32).toString('base64url');
    const expires = new Date(Date.now() + SESSION_DAYS * 86400000);
    await pool.query(
        'INSERT INTO sessions (id, user_id, expires_at, user_agent, ip) VALUES ($1, $2, $3, $4, $5)',
        [tokenId(token), userId, expires, String(req.headers['user-agent'] || '').slice(0, 300), String(req.ip || '').slice(0, 64)]
    );
    return { token, expires };
}

async function getSessionUserId(pool, token) {
    if (!token || typeof token !== 'string' || token.length > 200) return null;
    const { rows } = await pool.query(
        'SELECT user_id, last_seen_at FROM sessions WHERE id = $1 AND expires_at > now()',
        [tokenId(token)]
    );
    if (!rows.length) return null;
    // Touch at most once an hour so reads stay cheap.
    if (!rows[0].last_seen_at || Date.now() - new Date(rows[0].last_seen_at).getTime() > 3600000) {
        pool.query('UPDATE sessions SET last_seen_at = now() WHERE id = $1', [tokenId(token)]).catch(() => {});
    }
    return rows[0].user_id;
}

async function destroySession(pool, token) {
    if (!token) return;
    await pool.query('DELETE FROM sessions WHERE id = $1', [tokenId(token)]);
}

async function destroyUserSessions(pool, userId, exceptToken) {
    if (exceptToken) {
        await pool.query('DELETE FROM sessions WHERE user_id = $1 AND id <> $2', [userId, tokenId(exceptToken)]);
    } else {
        await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    }
}

function parseCookies(header) {
    const out = {};
    String(header || '').split(';').forEach((part) => {
        const i = part.indexOf('=');
        if (i < 0) return;
        const k = part.slice(0, i).trim();
        if (!k) return;
        try { out[k] = decodeURIComponent(part.slice(i + 1).trim()); } catch (e) { out[k] = part.slice(i + 1).trim(); }
    });
    return out;
}

function cookieFlags(req) {
    const secure = process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https';
    return 'Path=/; HttpOnly; SameSite=Lax' + (secure ? '; Secure' : '');
}

function setSessionCookie(req, res, token) {
    res.append('Set-Cookie', `${SESSION_COOKIE}=${token}; ${cookieFlags(req)}; Max-Age=${SESSION_DAYS * 86400}`);
}

function clearSessionCookie(req, res) {
    res.append('Set-Cookie', `${SESSION_COOKIE}=; ${cookieFlags(req)}; Max-Age=0`);
}

function sessionToken(req) {
    return parseCookies(req.headers.cookie)[SESSION_COOKIE] || null;
}

// ---------------- rate limits ----------------
// Sliding-window counters in memory. Weaver runs a single instance; if it is ever
// scaled out, move these to the database or Redis.

const buckets = new Map();

function hit(key, max, windowMs) {
    const now = Date.now();
    const list = (buckets.get(key) || []).filter((t) => now - t < windowMs);
    if (list.length >= max) {
        buckets.set(key, list);
        const retryMs = windowMs - (now - list[0]);
        return { allowed: false, retryAfterSec: Math.max(1, Math.ceil(retryMs / 1000)) };
    }
    list.push(now);
    buckets.set(key, list);
    return { allowed: true, retryAfterSec: 0 };
}

// Drop stale keys every 10 minutes so memory stays flat.
setInterval(() => {
    const now = Date.now();
    for (const [k, list] of buckets) {
        if (!list.length || now - list[list.length - 1] > 3600000) buckets.delete(k);
    }
}, 600000).unref();

function adminEmails() {
    return String(process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}

function isAdmin(user) {
    return !!(user && user.email && adminEmails().includes(String(user.email).toLowerCase()));
}

module.exports = {
    SESSION_COOKIE,
    hashPassword,
    isHashed,
    verifyPassword,
    passwordProblem,
    createSession,
    getSessionUserId,
    destroySession,
    destroyUserSessions,
    setSessionCookie,
    clearSessionCookie,
    sessionToken,
    hit,
    isAdmin,
};
