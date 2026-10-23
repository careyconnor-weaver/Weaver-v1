#!/usr/bin/env node
/**
 * Local demo mode — runs Weaver with a private, throwaway Postgres database
 * and a sample club, so the app can be shown without touching production.
 *
 *   npm install
 *   npm run demo
 *   open http://localhost:3000   (log in: demo@weaver.app / weaver-demo)
 *
 * Data lives in ./.demo-db next to this file. Delete that folder to start fresh.
 * Optional: put OPENAI_API_KEY=... in a .env file to turn on the assistant.
 */
const path = require('path');
const fs = require('fs');
const http = require('http');
require('dotenv').config(); // read .env first so its keys (e.g. OPENAI_API_KEY) are used

const DATA_DIR = path.join(__dirname, '.demo-db');
const PG_PORT = Number(process.env.DEMO_PG_PORT || 54329);
const APP_PORT = String(process.env.DEMO_PORT || 3000);
const DB_URL = `postgres://postgres:weaver-demo@127.0.0.1:${PG_PORT}/weaver`;

const DEMO_EMAIL = 'demo@weaver.app';
const DEMO_PASSWORD = 'weaver-demo';

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

function call(method, urlPath, payload) {
    return new Promise((resolve, reject) => {
        const data = payload ? JSON.stringify(payload) : null;
        const req = http.request({
            host: '127.0.0.1', port: APP_PORT, method, path: urlPath,
            headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) },
        }, (res) => {
            let body = '';
            res.on('data', (c) => (body += c));
            res.on('end', () => {
                let json = null; try { json = JSON.parse(body); } catch (e) { /* not json */ }
                resolve({ status: res.statusCode, body: json, raw: body });
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function must(method, urlPath, payload) {
    const r = await call(method, urlPath, payload);
    if (r.status >= 400) throw new Error(`${method} ${urlPath} failed (${r.status}): ${r.raw.slice(0, 300)}`);
    return r.body;
}

// ---- Sample data -----------------------------------------------------------

const MEMBERS = [
    { id: 'demo-owner', email: DEMO_EMAIL, first: 'Jordan', last: 'Reyes', type: 'org' },
    { id: 'demo-m1', email: 'priya.shah@bc.edu', first: 'Priya', last: 'Shah', type: 'student' },
    { id: 'demo-m2', email: 'marcus.lee@bc.edu', first: 'Marcus', last: 'Lee', type: 'student' },
    { id: 'demo-m3', email: 'olivia.chen@bc.edu', first: 'Olivia', last: 'Chen', type: 'student' },
    { id: 'demo-m4', email: 'sam.okafor@bc.edu', first: 'Sam', last: 'Okafor', type: 'student' },
    { id: 'demo-m5', email: 'ella.brooks@bc.edu', first: 'Ella', last: 'Brooks', type: 'student' },
];

function contact(prefix, i, name, firm, position, location, priority, emails, notes, extra = {}) {
    const id = `${prefix}-c${i}`;
    return {
        id, name, firm, company: firm, position, location, priority,
        email: name.toLowerCase().replace(/[^a-z]+/g, '.') + '@' + firm.toLowerCase().replace(/[^a-z]+/g, '') + '.com',
        emails: emails.map((e, j) => ({ id: `e_${id}_${j}`, ...e })),
        notes: notes.map((n, j) => ({ id: `n_${id}_${j}`, ...n })),
        ...extra,
    };
}

const sent = (d, subject, type = 'cold') => ({ date: daysAgo(d), direction: 'sent', type, subject });
const recv = (d, subject) => ({ date: daysAgo(d), direction: 'received', type: 'received', subject });
const call_ = (d, summary) => ({ date: daysAgo(d), summary, isTextNote: true });

function ownerContacts(p) {
    return [
        contact(p, 1, 'Alexandra Kim', 'Goldman Sachs', 'Vice President, TMT', 'New York, NY', 'high',
            [sent(21, 'BC student interested in TMT'), recv(19, 'Re: BC student interested in TMT'), sent(9, 'Thank you for your time', 'follow-up')],
            [call_(18, 'Call: 25 min. Covers software M&A. Said the summer analyst process opens in January; offered to pass my resume to the campus recruiter. Follow up in early December.')], { vip: true }),
        contact(p, 2, 'Daniel Ortiz', 'Evercore', 'Associate', 'New York, NY', 'high',
            [sent(16, 'Fellow Eagle reaching out'), recv(14, 'Re: Fellow Eagle reaching out')],
            [call_(12, 'Coffee chat. BC 2021. Recommended reading the Evercore restructuring deal list and reaching out to Rachel Green in the RX group.')]),
        contact(p, 3, 'Rachel Green', 'Evercore', 'Analyst, Restructuring', 'New York, NY', 'medium',
            [sent(6, 'Referred by Daniel Ortiz')], []),
        contact(p, 4, 'Michael Chen', 'Morgan Stanley', 'Managing Director', 'New York, NY', 'high',
            [sent(30, 'Boston College finance student'), sent(17, 'Following up', 'follow-up')], []),
        contact(p, 5, 'Sophie Laurent', 'Lazard', 'Analyst', 'New York, NY', 'medium',
            [sent(11, 'Question about Lazard M&A'), recv(10, 'Re: Question about Lazard M&A')],
            [call_(8, 'Call: 20 min. Superday tips - expect a paper LBO. Happy to do a mock interview in November.')]),
        contact(p, 6, 'Ben Carter', 'J.P. Morgan', 'Associate, Healthcare', 'New York, NY', 'medium',
            [sent(40, 'Healthcare banking question'), recv(38, 'Re: Healthcare banking question')],
            [call_(36, 'Call: discussed healthcare coverage; suggested applying to the JPM diversity program.')]),
        contact(p, 7, 'Hannah Wright', 'Centerview Partners', 'Analyst', 'San Francisco, CA', 'high',
            [sent(4, 'BC junior interested in Centerview')], []),
        contact(p, 8, 'Tom Becker', 'Bain & Company', 'Consultant', 'Boston, MA', 'low',
            [sent(25, 'Consulting vs. banking'), recv(23, 'Re: Consulting vs. banking')],
            [call_(22, 'Coffee in Boston. Talked about case prep; recommended Case in Point and practicing with the BC consulting club.')]),
        contact(p, 9, 'Grace Park', 'PJT Partners', 'Vice President', 'New York, NY', 'medium',
            [], [], { generalNotes: 'Met at the BC Finance career fair. Asked me to email her in November.' }),
    ];
}

const MEMBER_CONTACTS = {
    'demo-m1': (p) => [
        contact(p, 1, 'Leah Thompson', 'Moelis & Company', 'Associate', 'New York, NY', 'high',
            [sent(12, 'BC student reaching out'), recv(11, 'Re: BC student reaching out'), sent(3, 'Thank you!', 'follow-up')],
            [call_(9, 'Call: Moelis culture and the analyst class size.'), call_(2, 'Second call: mock technicals.')]),
        contact(p, 2, 'Kevin Rao', 'Guggenheim', 'Analyst', 'New York, NY', 'medium',
            [sent(8, 'Interest in Guggenheim'), recv(7, 'Re: Interest in Guggenheim')], [call_(5, 'Call: group placement process.')]),
        contact(p, 3, 'Nina Patel', 'Citi', 'Vice President', 'New York, NY', 'medium',
            [sent(6, 'Citi healthcare question'), recv(5, 'Re: Citi healthcare question')], [call_(4, 'Call: healthcare group overview.')]),
        contact(p, 4, 'Chris Allen', 'Jefferies', 'Associate', 'New York, NY', 'low', [sent(2, 'Fellow Eagle')], []),
    ],
    'demo-m2': (p) => [
        contact(p, 1, 'Ava Martinez', 'Blackstone', 'Analyst', 'New York, NY', 'high',
            [sent(15, 'Private equity question'), recv(13, 'Re: Private equity question')], [call_(10, 'Call: on-cycle recruiting timeline.')]),
        contact(p, 2, 'Ryan Scott', 'KKR', 'Associate', 'New York, NY', 'medium', [sent(9, 'BC student interested in PE')], []),
    ],
    'demo-m3': (p) => [
        contact(p, 1, 'Isabel Diaz', 'McKinsey & Company', 'Engagement Manager', 'Boston, MA', 'high',
            [sent(7, 'Consulting interest'), recv(6, 'Re: Consulting interest')], [call_(3, 'Call: case interview advice.')]),
        contact(p, 2, 'Owen Hughes', 'BCG', 'Consultant', 'Boston, MA', 'medium',
            [sent(5, 'BC junior reaching out'), recv(4, 'Re: BC junior reaching out')], [call_(2, 'Coffee chat at the Boston office.')]),
        contact(p, 3, 'Maya Singh', 'Bain & Company', 'Associate Consultant', 'Boston, MA', 'medium', [sent(3, 'Fellow Eagle')], []),
    ],
    'demo-m4': (p) => [
        contact(p, 1, 'Liam Foster', 'Houlihan Lokey', 'Analyst', 'Chicago, IL', 'medium', [sent(26, 'Restructuring question')], []),
    ],
    'demo-m5': (p) => [
        contact(p, 1, 'Zoe Adams', 'Wells Fargo', 'Associate', 'Charlotte, NC', 'low', [sent(50, 'Intro')], []),
    ],
};

// ---- Boot ------------------------------------------------------------------

async function startDatabase() {
    let EmbeddedPostgres;
    try {
        EmbeddedPostgres = (await import('embedded-postgres')).default;
    } catch (e) {
        console.error('\nThe demo database package is missing. Run this first:\n\n    npm install\n');
        process.exit(1);
    }
    const firstRun = !fs.existsSync(path.join(DATA_DIR, 'PG_VERSION'));
    const pg = new EmbeddedPostgres({
        databaseDir: DATA_DIR,
        user: 'postgres',
        password: 'weaver-demo',
        port: PG_PORT,
        persistent: true,
        onLog: (m) => { if (process.env.DEMO_DEBUG) console.log(m); },
        onError: (m) => { if (process.env.DEMO_DEBUG) console.error(m); },
    });
    if (firstRun) {
        console.log('Setting up the demo database (first run only, about 20 seconds)...');
        await pg.initialise();
    }
    await pg.start();
    try { await pg.createDatabase('weaver'); } catch (e) { /* already exists */ }
    return { pg, firstRun };
}

async function applyBaseSchema() {
    const { Client } = require('pg');
    const c = new Client({ connectionString: DB_URL });
    await c.connect();
    try {
        const exists = (await c.query("select to_regclass('public.users') as t")).rows[0].t;
        if (!exists) {
            const sql = fs.readFileSync(path.join(__dirname, 'drizzle', '0000_lean_romulus.sql'), 'utf8');
            for (const stmt of sql.split('--> statement-breakpoint')) if (stmt.trim()) await c.query(stmt);
        }
    } finally {
        await c.end();
    }
}

async function waitFor(check, label, tries = 80) {
    for (let i = 0; i < tries; i++) {
        try { if (await check()) return; } catch (e) { /* not ready yet */ }
        await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error('Timed out waiting for ' + label);
}

async function seed() {
    const { Client } = require('pg');
    const c = new Client({ connectionString: DB_URL });
    await c.connect();
    try {
        const already = (await c.query('select 1 from users where email = $1', [DEMO_EMAIL])).rowCount > 0;
        if (already) return false;

        console.log('Adding a sample club and contacts...');
        for (const m of MEMBERS) {
            const password = m.email === DEMO_EMAIL ? DEMO_PASSWORD : 'demo-member-' + m.id;
            await must('POST', '/api/users/signup', { userId: m.id, email: m.email, password });
            await must('POST', '/api/users/account-type', { userId: m.id, accountType: m.type });
            await must('POST', '/api/users/settings', { userId: m.id, firstName: m.first, lastName: m.last });
        }
        const org = (await must('POST', '/api/orgs', { userId: 'demo-owner', name: 'BC Finance Society', school: 'Boston College' })).org;
        for (const m of MEMBERS.slice(1)) {
            await must('POST', '/api/orgs/join', { userId: m.id, joinCode: org.joinCode, displayName: `${m.first} ${m.last}` });
        }
        await must('POST', '/api/contacts/sync', { userId: 'demo-owner', contacts: ownerContacts('demo-owner') });
        for (const [userId, make] of Object.entries(MEMBER_CONTACTS)) {
            await must('POST', '/api/contacts/sync', { userId, contacts: make(userId) });
        }
        // Make two members' activity older than 30 days so the "active members" count is realistic.
        await c.query("update contacts set created_at = now() - interval '45 days' where user_id in ('demo-m4', 'demo-m5')");
        // Show the club as already on a plan (no real Stripe subscription in demo mode).
        await c.query("update organizations set plan_status = 'active' where id = $1", [org.id]);
        return true;
    } finally {
        await c.end();
    }
}

(async () => {
    const { pg } = await startDatabase();

    let stopping = false;
    const stop = async () => {
        if (stopping) return; stopping = true;
        console.log('\nStopping the demo...');
        try { await pg.stop(); } catch (e) { /* already stopped */ }
        process.exit(0);
    };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);

    await applyBaseSchema();

    // Demo settings win over anything in .env (dotenv never overrides existing values).
    process.env.DATABASE_URL = DB_URL;
    process.env.PORT = APP_PORT;
    process.env.NODE_ENV = 'development';
    process.env.WEAVER_DEMO = '1';
    // The Stripe module needs a key to load. Payments are not part of the demo.
    if (!process.env.STRIPE_SECRET_KEY) process.env.STRIPE_SECRET_KEY = 'sk_test_demo_placeholder';

    require('./server.js');

    await waitFor(async () => (await call('GET', '/api/health')).status === 200, 'the server');
    // The server adds the club/billing tables on startup; wait for them.
    const { Client } = require('pg');
    await waitFor(async () => {
        const c = new Client({ connectionString: DB_URL });
        await c.connect();
        try {
            const r = await c.query("select to_regclass('public.org_invites') as a, to_regclass('public.user_settings') as b");
            return r.rows[0].a && r.rows[0].b;
        } finally { await c.end(); }
    }, 'the database schema');

    try {
        await seed();
    } catch (e) {
        console.error('Could not add the sample data:', e.message);
    }

    console.log('\n------------------------------------------------------------');
    console.log(`  Weaver demo is running:  http://localhost:${APP_PORT}`);
    console.log(`  Log in with:             ${DEMO_EMAIL}  /  ${DEMO_PASSWORD}`);
    if (!process.env.OPENAI_API_KEY) {
        console.log('  Assistant is off: add OPENAI_API_KEY=... to a .env file to turn it on.');
    }
    console.log('  Press Ctrl+C to stop.');
    console.log('------------------------------------------------------------\n');
})().catch((e) => {
    console.error('Demo failed to start:', (e && e.message) || e);
    console.error('Run with DEMO_DEBUG=1 for database logs, or delete the .demo-db folder and try again.');
    process.exit(1);
});
