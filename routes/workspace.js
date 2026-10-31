// Workspace features (all require a signed-in user; see the auth middleware in server.js):
//   Plan & usage    what the user's plan includes and how much AI allowance is left
//   Outcomes        interviews and offers, shared with the club only if the student opts in
//   Review tables   contacts × questions grid, AI fills cells with cited sources
//   Checklists      expert recruiting checklists from templates
//   Documents       ready-to-use briefs, emails and reports generated from the user's data
//   Console         club / career-center management for owners and admins
//   Admin           Weaver staff: verify clubs, set campus licenses

const express = require('express');
const crypto = require('crypto');
const { resolvePlan, publicPlan } = require('../lib/plans');
const usage = require('../lib/usage');
const { withPlaybook, guardLeak } = require('../lib/playbook');
const { isAdmin } = require('../lib/auth');

const STAGES = [
    { key: 'applied', label: 'Applied' },
    { key: 'first_round', label: 'First round' },
    { key: 'superday', label: 'Superday / final round' },
    { key: 'offer', label: 'Offer' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'declined', label: 'Declined' },
    { key: 'rejected', label: 'Not selected' },
];
const STAGE_KEYS = STAGES.map((s) => s.key);
const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.key, s.label]));

// ---------------- review table columns ----------------
const REVIEW_COLUMNS = {
    firm: { label: 'Firm and role', kind: 'computed' },
    last_touch: { label: 'Last touch', kind: 'computed' },
    touches: { label: 'Touches', kind: 'computed' },
    status: { label: 'Follow-up status', kind: 'computed' },
    strength: { label: 'Relationship strength', kind: 'ai', question: 'How strong is this relationship? Answer exactly one of: New, Warming, Strong, Going cold. Then a dash and a reason under 12 words.' },
    next_step: { label: 'Next step', kind: 'ai', question: 'What is the single best next step with this person and when? Under 20 words.' },
    referral: { label: 'Referral potential', kind: 'ai', question: 'How likely is this person to refer the student right now? Answer Low, Medium or High, then a dash and a reason under 12 words. High only after 2+ good conversations.' },
    talking_points: { label: 'Talking points', kind: 'ai', question: 'Two specific things to bring up next time, drawn from the notes. Under 25 words.' },
    open_items: { label: 'Open promises', kind: 'ai', question: 'List anything still outstanding between the student and this person: intros offered, resumes to send, follow-ups promised, by either side. Under 25 words, or "None" if nothing is open.' },
    ask: { label: 'What to ask for', kind: 'ai', question: 'What is the right ask for the next conversation (advice, intro, referral, resume pass, nothing yet)? Under 15 words.' },
};

// ---------------- checklist templates ----------------
function items(section, list) { return list.map((text) => ({ section, text })); }
const CHECKLISTS = {
    coffee_chat: {
        title: 'Coffee chat',
        description: 'Before, during and after a networking call.',
        audience: 'student',
        items: [
            ...items('Before', [
                'Read their LinkedIn: school, prior roles, current group',
                'Find 2-3 recent deals or news items for their group',
                'Review your notes from any earlier conversation',
                'Write 3 questions you can only ask this person',
                'Prepare a 30-second story: who you are and why this firm',
            ]),
            ...items('During', [
                'Open with thanks and keep to the time you asked for',
                'Ask about their path, the group, and what makes people succeed there',
                'Note one specific thing they said to reference later',
                'Ask who else they suggest you speak with',
            ]),
            ...items('After', [
                'Send a thank-you promptly, referencing one specific thing they said',
                'Log the conversation in Weaver with next steps',
                'Set a follow-up reminder in Weaver so the relationship stays warm',
            ]),
        ],
    },
    superday: {
        title: 'Superday prep',
        description: 'Technicals, behavioral stories and logistics for a final round.',
        audience: 'student',
        items: [
            ...items('Technicals', [
                'Walk through the three financial statements and how they link',
                'Walk through a DCF from revenue to equity value',
                'Explain enterprise value vs. equity value and the bridge',
                'Accretion / dilution: what drives it and a quick numeric example',
                'Paper LBO: practice two timed in under 10 minutes',
                'Know current interest rates, a major index level and one recent deal in your target group',
            ]),
            ...items('Behavioral', [
                'Why banking, why this firm, why this group: one tight answer each',
                'Walk me through your resume in under 2 minutes',
                'Three stories: leadership, teamwork under pressure, a failure and what you learned',
                'Prepare 2 questions for each interviewer',
            ]),
            ...items('Logistics', [
                'Confirm schedule, location or video links and interviewer names',
                'Review notes on every person you have spoken with at the firm',
                'Thank-you notes to each interviewer the same day',
            ]),
        ],
    },
    ib_timeline: {
        title: 'Investment banking recruiting timeline',
        description: 'What to do each term from sophomore fall to junior applications.',
        audience: 'student',
        items: [
            ...items('Sophomore fall', [
                'Build a target list of 15-25 firms and groups',
                'Join the finance club and attend firm info sessions',
                'Start technical basics: accounting and valuation',
            ]),
            ...items('Sophomore winter and spring', [
                'Reach out to 8-12 alumni a month at target firms',
                'Aim for 2+ conversations at each top-choice firm',
                'Polish your resume with the career center',
            ]),
            ...items('Sophomore summer', [
                'Keep warm contacts warm with short updates',
                'Drill technicals weekly',
                'Track application openings: many open late spring to summer',
            ]),
            ...items('Junior year', [
                'Submit applications the week they open',
                'Ask strong contacts whether they would pass your resume along',
                'Run the Superday prep checklist for each final round',
            ]),
        ],
    },
    consulting_case: {
        title: 'Consulting case interview prep',
        description: 'Frameworks, live practice and fit stories.',
        audience: 'student',
        items: [
            ...items('Foundations', [
                'Learn profitability, market sizing and market entry structures',
                'Practice mental math daily: percentages, growth, breakevens',
                'Read 5 cases from your target firms’ case libraries',
            ]),
            ...items('Practice', [
                'Do 20+ live cases with partners, at least 5 with ex-consultants',
                'Practice chart interpretation under time pressure',
                'Record one case and review your structure and synthesis',
            ]),
            ...items('Fit', [
                'Prepare stories for leadership, impact and handling conflict',
                'Know why consulting and why each firm, with a person you spoke with at each',
            ]),
        ],
    },
    offer_decision: {
        title: 'Offer decision',
        description: 'Understand the offer, decide well, close the loop.',
        audience: 'student',
        items: [
            ...items('Understand the offer', [
                'Confirm base, bonus structure, start date and location',
                'Ask about group placement and staffing model',
                'Note the deadline and whether it can move',
            ]),
            ...items('Decide', [
                'Talk to 2 analysts and 1 senior person in the group',
                'Compare exit paths and the culture you saw in interviews',
                'Tell other firms in process about your deadline, politely',
            ]),
            ...items('Close the loop', [
                'Accept or decline in writing, and thank everyone who helped',
                'Log the outcome in Weaver so your club can learn from it',
            ]),
        ],
    },
    landing_referral: {
        title: 'Landing a referral',
        description: 'Earn the referral through the relationship, then make the ask easy.',
        audience: 'student',
        items: [
            ...items('Earn it', [
                'Have more than one real conversation with this person before asking',
                'Show you did the work: reference what they told you and what you did with it',
                'Know exactly which role, group and deadline you are applying for',
            ]),
            ...items('Ask', [
                'Ask directly and politely, and make it easy to say no',
                'Send a short note they can forward: your resume and two lines on why you fit',
                'Reinforce the ask in writing after the call',
            ]),
            ...items('Close the loop', [
                'Thank them whatever they decide',
                'Tell them when you hear back, and how it went',
                'Log the referral in Weaver and set a reminder to update them',
            ]),
        ],
    },
    human_connection: {
        title: 'Turning a call into a relationship',
        description: 'How a single conversation becomes someone in your corner.',
        audience: 'student',
        items: [
            ...items('On the call', [
                'Start with them as a person before getting to recruiting',
                'Listen for one thing they care about outside work and remember it',
                'Share your own story honestly, not a rehearsed pitch',
            ]),
            ...items('After', [
                'Write down specifics while they are fresh, and log them in Weaver',
                'Thank them, mentioning the one thing that stuck with you',
                'Act on their advice and tell them you did',
            ]),
            ...items('Over the season', [
                'Check in with something useful or a real update, not just an ask',
                'Congratulate them on news: a promotion, a deal, a move',
                'Introduce them to someone they would value meeting when you can',
            ]),
        ],
    },
    club_season: {
        title: 'Club recruiting season kickoff',
        description: 'For club leaders: set up, run and measure the season.',
        audience: 'manager',
        items: [
            ...items('Set up', [
                'Invite every member to the club workspace in Weaver',
                'Share the recruiting timeline checklist with sophomores',
                'Assign an alumni-outreach lead for each target firm',
            ]),
            ...items('Run the season', [
                'Weekly: review the console and nudge members inactive 14+ days',
                'Run two technical prep sessions a month',
                'Host one alumni panel per month',
            ]),
            ...items('Measure', [
                'Ask members to log interviews and offers in Outcomes',
                'Share an end-of-season report with the career center',
            ]),
        ],
    },
};

// ---------------- document kinds ----------------
const DOCUMENTS = {
    cold_outreach: { label: 'First email to an alum', needs: 'contact', email: true, maxTokens: 500,
        brief: 'The first email to someone the student has not spoken with. Short and human: who the student is, the specific and true reason they chose this person (shared school, club, hometown, path), and one easy ask for a brief call. If the data has no specific reason, leave a bracketed placeholder such as [why you chose them: shared club, a deal they worked on] instead of inventing one. Include a subject line that makes the thread easy to find. Under 120 words.' },
    coffee_chat_brief: { label: 'Coffee chat prep: questions and research', needs: 'contact', email: false, maxTokens: 1100,
        brief: 'A one-page prep sheet for an upcoming call. Sections: ## Who they are (only what the data says); ## Our history (dates and what was discussed, or "First conversation"); ## Do your own research (a checklist of 4-6 specific things the student must look up themselves before the call, e.g. their career path, their group, recent deals or news; never state these as facts); ## Questions to ask (6-8 questions specific to this person and their path, ordered from light openers to deeper ones, plus 2 follow-up prompts to go deeper on whatever they say); ## Your story (3 bullet prompts to help the student share their own background naturally); ## Building the relationship (2-3 short reminders on making a genuine connection and closing the call well). Questions must be ones a search engine cannot answer.' },
    thank_you: { label: 'Thank-you note', needs: 'contact', email: true, maxTokens: 500,
        brief: 'A thank-you email for the most recent conversation. Reference one specific thing from the latest note and any next step offered. Under 120 words.' },
    follow_up: { label: 'Follow-up email', needs: 'contact', email: true, maxTokens: 500,
        brief: 'A short follow-up email appropriate to where this relationship stands (an update for a warm contact, or a brief nudge for an unanswered cold email). Under 110 words.' },
    referral_request: { label: 'Referral request', needs: 'contact', email: true, maxTokens: 550,
        brief: 'An email asking, respectfully and specifically, whether they would be comfortable referring the student or passing their resume to the recruiting team. Only appropriate after real conversations; if the history is thin, write a relationship-building email instead and say so in one line at the top. Under 140 words.' },
    firm_brief: { label: 'Firm relationship brief', needs: 'firm', email: false, maxTokens: 900,
        brief: 'A brief on the student\'s relationships at one firm. Sections: Summary; People (one line each: role, last touch, strength); Gaps (groups or seniority levels with no contact); Next 3 actions.' },
    recruiting_plan: { label: 'Recruiting season plan', needs: 'plan', email: false, maxTokens: 1400,
        brief: 'A personal recruiting plan for this student, built from their PLAN inputs and their current network. Sections: ## Where you are (one paragraph); ## Prep phase (before applications open: monthly goals for target list, outreach volume, conversations and technical prep, with the months named); ## In the midst (applications and interviews: what to do each week, how to keep contacts updated, preparing for each round); ## This week (5 concrete actions, naming people from their network when possible); ## Staying human (3 short reminders on building real relationships rather than collecting contacts). Assume a semi-target student without an on-campus pipeline unless told otherwise: consistency and relationships win. Use typical timelines for their industry, and say "check each firm\'s dates" where timing varies.' },
    weekly_report: { label: 'Weekly recruiting report', needs: 'none', email: false, maxTokens: 900,
        brief: 'The student\'s weekly recruiting report. Sections: This week in numbers; Momentum (relationships moving forward); Going cold (who needs a follow-up); Next week\'s plan (5 specific actions with names).' },
    club_report: { label: 'Club weekly report', needs: 'org', email: false, maxTokens: 1100,
        brief: 'A report for a club leader. Sections: Club in numbers; Top performers; Members who need support (inactive 14+ days, with a suggested message); Outcomes shared this season; Three actions for leadership this week.' },
};

// Look up a key in one of the fixed tables above. Only the table's own keys count, so
// request values like "__proto__" or "constructor" never match.
function own(table, key) {
    return typeof key === 'string' && Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;
}

function newId(prefix) {
    return prefix + crypto.randomBytes(9).toString('base64url');
}
function clip(s, n) { s = s == null ? '' : String(s); return s.length > n ? s.slice(0, n) : s; }
function daysSince(d) { const t = new Date(d); return isNaN(t) ? null : Math.max(0, Math.floor((Date.now() - t.getTime()) / 86400000)); }
function today() { return new Date().toISOString().slice(0, 10); }

function lastTouch(c) {
    const dates = (c.emails || []).map((e) => e.date).concat((c.notes || []).map((n) => n.date)).filter(Boolean).sort();
    return dates.length ? dates[dates.length - 1] : null;
}

// Compact, model-ready view of one contact from the database.
function contactForModel(c) {
    return {
        id: c.id,
        name: c.name,
        firm: c.firm || c.company || null,
        position: c.position || null,
        priority: c.priority || null,
        vip: !!c.vip,
        interactions: []
            .concat((c.emails || []).map((e) => ({ date: e.date, type: e.direction === 'sent' ? 'email sent' : 'email received', detail: clip(e.subject, 120) })))
            .concat((c.notes || []).map((n) => ({ date: n.date, type: 'call note', detail: clip(n.summary, 500) })))
            .sort((a, b) => String(a.date).localeCompare(String(b.date)))
            .slice(-8),
        general_notes: c.generalNotes ? clip(c.generalNotes, 300) : undefined,
    };
}

function computedCell(key, c) {
    if (key === 'firm') return [c.firm || c.company, c.position].filter(Boolean).join(' · ') || 'Not recorded';
    if (key === 'last_touch') {
        const d = lastTouch(c);
        if (!d) return 'No interactions yet';
        const n = daysSince(d);
        return d + (n == null ? '' : n === 0 ? ' (today)' : ` (${n} day${n === 1 ? '' : 's'} ago)`);
    }
    if (key === 'status') {
        const d = lastTouch(c);
        if (!d) return 'Not contacted yet';
        const n = daysSince(d) || 0;
        const established = (c.notes || []).length > 0 || (c.emails || []).some((e) => e.direction === 'received');
        const due = established ? 90 : 12;
        if (n >= due) return `Follow-up due (${n - due} day${n - due === 1 ? '' : 's'} over)`;
        return `On track (due in ${due - n} day${due - n === 1 ? '' : 's'})`;
    }
    if (key === 'touches') {
        const sent = (c.emails || []).filter((e) => e.direction === 'sent').length;
        const rec = (c.emails || []).filter((e) => e.direction === 'received').length;
        const calls = (c.notes || []).length;
        return `${sent} sent, ${rec} replies, ${calls} call${calls === 1 ? '' : 's'}`;
    }
    return '';
}

module.exports = function workspaceRoutes({ pool, dbAPI, getOpenAI }) {
    const router = express.Router();

    async function planFor(user) {
        let orgs = [];
        try { orgs = await dbAPI.getOrgsForUser(user.id); } catch (e) { /* none */ }
        return { plan: resolvePlan(user, orgs), orgs };
    }

    async function firstName(userId) {
        try { const s = await dbAPI.getUserSettingsById(userId); if (s && s.firstName) return s.firstName; } catch (e) { /* none */ }
        return '';
    }

    function fail(res, err, fallback) {
        if (usage.sendUsageError(res, err)) return;
        console.error(fallback + ':', err && err.message);
        res.status(500).json({ error: fallback + '. Try again.' });
    }

    // ================= plan & usage =================
    router.get('/plan', async (req, res) => {
        try {
            const { plan, orgs } = await planFor(req.user);
            const summary = await usage.usageSummary(pool, req.user, plan);
            const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM contacts WHERE user_id = $1', [req.user.id]);
            const pending = orgs.filter((o) => !o.verified).map((o) => o.name);
            res.json({
                success: true,
                plan: publicPlan(plan),
                usage: summary,
                contacts: { count: rows[0].n, limit: plan.contactLimit },
                pendingVerification: pending,
                subscription: {
                    status: req.user.subscriptionStatus || 'free',
                    interval: req.user.subscriptionPlan || null,
                    hasBillingAccount: !!req.user.stripeCustomerId,
                },
            });
        } catch (e) { fail(res, e, 'Could not load your plan'); }
    });

    // ================= outcomes =================
    router.get('/outcomes/stages', (req, res) => res.json({ success: true, stages: STAGE_LABEL }));

    router.get('/outcomes', async (req, res) => {
        try {
            const { rows } = await pool.query('SELECT * FROM outcomes WHERE user_id = $1 ORDER BY COALESCE(stage_date, \'\') DESC, created_at DESC', [req.user.id]);
            res.json({ success: true, outcomes: rows.map(outcomeOut), stages: STAGE_LABEL });
        } catch (e) { fail(res, e, 'Could not load outcomes'); }
    });

    function outcomeOut(r) {
        return { id: r.id, firm: r.firm, role: r.role, stage: r.stage, stageLabel: own(STAGE_LABEL, r.stage) || r.stage, stageDate: r.stage_date, contactId: r.contact_id, notes: r.notes, shareWithClub: r.share_with_club, updatedAt: r.updated_at };
    }

    function outcomeInput(body) {
        const firm = clip(String(body.firm || '').trim(), 255);
        if (!firm) return { error: 'Add the firm.' };
        if (!STAGE_KEYS.includes(body.stage)) return { error: 'Choose a stage.' };
        const date = /^\d{4}-\d{2}-\d{2}$/.test(body.stageDate || '') ? body.stageDate : null;
        return {
            firm, stage: body.stage, date,
            role: body.role ? clip(String(body.role).trim(), 255) : null,
            contactId: body.contactId ? clip(String(body.contactId), 100) : null,
            notes: body.notes ? clip(String(body.notes), 2000) : null,
            share: body.shareWithClub === true,
        };
    }

    router.post('/outcomes', async (req, res) => {
        try {
            const v = outcomeInput(req.body || {});
            if (v.error) return res.status(400).json({ error: v.error });
            const { rows: count } = await pool.query('SELECT COUNT(*)::int AS n FROM outcomes WHERE user_id = $1', [req.user.id]);
            if (count[0].n >= 300) return res.status(400).json({ error: 'You have reached the limit of 300 outcomes.' });
            const { rows } = await pool.query(
                'INSERT INTO outcomes (id, user_id, firm, role, stage, stage_date, contact_id, notes, share_with_club) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
                [newId('oc_'), req.user.id, v.firm, v.role, v.stage, v.date, v.contactId, v.notes, v.share]
            );
            res.json({ success: true, outcome: outcomeOut(rows[0]) });
        } catch (e) { fail(res, e, 'Could not save the outcome'); }
    });

    router.put('/outcomes/:id', async (req, res) => {
        try {
            const v = outcomeInput(req.body || {});
            if (v.error) return res.status(400).json({ error: v.error });
            const { rows } = await pool.query(
                'UPDATE outcomes SET firm=$3, role=$4, stage=$5, stage_date=$6, contact_id=$7, notes=$8, share_with_club=$9, updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING *',
                [req.params.id, req.user.id, v.firm, v.role, v.stage, v.date, v.contactId, v.notes, v.share]
            );
            if (!rows.length) return res.status(404).json({ error: 'Outcome not found.' });
            res.json({ success: true, outcome: outcomeOut(rows[0]) });
        } catch (e) { fail(res, e, 'Could not update the outcome'); }
    });

    router.delete('/outcomes/:id', async (req, res) => {
        try {
            await pool.query('DELETE FROM outcomes WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
            res.json({ success: true });
        } catch (e) { fail(res, e, 'Could not delete the outcome'); }
    });

    // ================= review tables =================
    router.get('/reviews/columns', (req, res) => {
        res.json({ success: true, columns: Object.entries(REVIEW_COLUMNS).map(([key, c]) => ({ key, label: c.label, type: c.kind })) });
    });

    router.get('/reviews', async (req, res) => {
        try {
            const { rows } = await pool.query('SELECT id, title, columns, contact_ids, updated_at FROM reviews WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 100', [req.user.id]);
            res.json({ success: true, reviews: rows.map((r) => ({ id: r.id, title: r.title, columnCount: r.columns.length, rowCount: r.contact_ids.length, updatedAt: r.updated_at })) });
        } catch (e) { fail(res, e, 'Could not load review tables'); }
    });

    async function reviewOut(r, userId) {
        const contacts = await dbAPI.getContactsByUserId(userId);
        const byId = new Map(contacts.map((c) => [String(c.id), c]));
        const rowsOut = r.contact_ids.map((id) => {
            const c = byId.get(String(id));
            if (!c) return null;
            const cells = {};
            r.columns.forEach((col) => {
                if (col.type === 'computed' && own(REVIEW_COLUMNS, col.key)) cells[col.key] = { value: computedCell(col.key, c) };
                else cells[col.key] = (r.cells[id] && r.cells[id][col.key]) || null;
            });
            return { contactId: c.id, name: c.name, cells };
        }).filter(Boolean);
        return { id: r.id, title: r.title, columns: r.columns, rows: rowsOut, updatedAt: r.updated_at };
    }

    router.get('/reviews/:id', async (req, res) => {
        try {
            const { rows } = await pool.query('SELECT * FROM reviews WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
            if (!rows.length) return res.status(404).json({ error: 'Review table not found.' });
            res.json({ success: true, review: await reviewOut(rows[0], req.user.id) });
        } catch (e) { fail(res, e, 'Could not load the review table'); }
    });

    function cleanColumns(list) {
        const out = [];
        const seen = new Set();
        let custom = 0;
        for (const col of Array.isArray(list) ? list : []) {
            if (out.length >= 6) break;
            if (col && col.key === 'custom') {
                const label = clip(String(col.label || '').trim(), 60);
                const question = clip(String(col.question || '').trim(), 300);
                if (!label || !question || custom >= 3) continue;
                custom += 1;
                out.push({ key: 'custom_' + custom, label, question, type: 'ai' });
            } else if (col && own(REVIEW_COLUMNS, col.key) && !seen.has(col.key)) {
                seen.add(col.key);
                out.push({ key: col.key, label: REVIEW_COLUMNS[col.key].label, type: REVIEW_COLUMNS[col.key].kind });
            }
        }
        return out;
    }

    router.post('/reviews', async (req, res) => {
        try {
            const { plan } = await planFor(req.user);
            const title = clip(String((req.body && req.body.title) || '').trim(), 200) || 'Untitled review';
            const columns = cleanColumns(req.body && req.body.columns);
            if (!columns.length) return res.status(400).json({ error: 'Choose at least one column.' });
            const wanted = Array.isArray(req.body && req.body.contactIds) ? req.body.contactIds.map(String) : [];
            const mine = new Set((await dbAPI.getContactsByUserId(req.user.id)).map((c) => String(c.id)));
            const ids = [...new Set(wanted)].filter((id) => mine.has(id));
            if (!ids.length) return res.status(400).json({ error: 'Choose at least one contact.' });
            const kept = ids.slice(0, plan.reviewRows);
            const { rows: count } = await pool.query('SELECT COUNT(*)::int AS n FROM reviews WHERE user_id=$1', [req.user.id]);
            if (count[0].n >= 100) return res.status(400).json({ error: 'You have reached the limit of 100 review tables. Delete one to make room.' });
            const { rows } = await pool.query(
                'INSERT INTO reviews (id, user_id, title, columns, contact_ids) VALUES ($1,$2,$3,$4,$5) RETURNING *',
                [newId('rv_'), req.user.id, title, JSON.stringify(columns), JSON.stringify(kept)]
            );
            const out = { success: true, review: await reviewOut(rows[0], req.user.id) };
            if (kept.length < ids.length) out.truncated = { kept: kept.length, requested: ids.length };
            res.json(out);
        } catch (e) { fail(res, e, 'Could not create the review table'); }
    });

    // Fill the AI columns. Rows are processed in batches; each batch is a metered call.
    router.post('/reviews/:id/run', async (req, res) => {
        try {
            const { rows } = await pool.query('SELECT * FROM reviews WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
            if (!rows.length) return res.status(404).json({ error: 'Review table not found.' });
            const review = rows[0];
            const aiCols = review.columns.filter((c) => c.type === 'ai');
            const rerun = !!(req.body && req.body.rerun);
            if (!aiCols.length) return res.json({ success: true, review: await reviewOut(review, req.user.id) });
            const { plan } = await planFor(req.user);
            const contacts = await dbAPI.getContactsByUserId(req.user.id);
            const byId = new Map(contacts.map((c) => [String(c.id), c]));
            const cells = review.cells || {};
            const questions = aiCols.map((c) => ({ key: c.key, question: c.question || (REVIEW_COLUMNS[c.key] && REVIEW_COLUMNS[c.key].question) }));
            // By default only fill cells that are still empty, so re-opening a table never re-spends allowance.
            const targets = review.contact_ids.map((id) => byId.get(String(id))).filter(Boolean)
                .filter((c) => rerun || questions.some((q) => !(cells[String(c.id)] && cells[String(c.id)][q.key])));
            let stoppedEarly = null;

            for (let i = 0; i < targets.length; i += 12) {
                const batch = targets.slice(i, i + 12);
                const system = `You fill a review table for a student's recruiting network. Today is ${today()}.
For every contact and every column, answer the column's question using ONLY that contact's data.
Return JSON: {"rows":[{"id":"<contact id>","cells":{"<column key>":{"value":"<answer>","source":"<date and type of the interaction you relied on, e.g. 2026-10-03 call note, or none>"}}}]}.
If the data cannot answer a question, the value is exactly "Not enough information" and the source is "none". Never invent facts, names, deals or dates.`;
                const user = JSON.stringify({ columns: questions, contacts: batch.map(contactForModel) });
                try {
                    const completion = await usage.meteredCompletion({
                        pool, openai: getOpenAI(), user: req.user, plan, feature: 'review',
                        model: usage.DEFAULT_MODEL,
                        maxTokens: Math.min(6000, 120 + batch.length * questions.length * 60),
                        params: { temperature: 0.2, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: withPlaybook(system) }, { role: 'user', content: user }] },
                    });
                    let parsed = {};
                    try { parsed = JSON.parse(completion.choices[0].message.content || '{}'); } catch (e) { parsed = {}; }
                    for (const row of Array.isArray(parsed.rows) ? parsed.rows : []) {
                        const id = String(row && row.id);
                        if (!batch.some((c) => String(c.id) === id)) continue;
                        cells[id] = cells[id] || {};
                        for (const q of questions) {
                            const cell = row.cells && row.cells[q.key];
                            if (!cell) continue;
                            const source = clip(cell.source, 80);
                            cells[id][q.key] = { value: guardLeak(clip(cell.value, 400)) || 'Not enough information', source: source && source.toLowerCase() !== 'none' ? source : null };
                        }
                    }
                } catch (err) {
                    if (err instanceof usage.UsageError) { stoppedEarly = err; break; }
                    throw err;
                }
            }
            const { rows: saved } = await pool.query('UPDATE reviews SET cells=$3, updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING *', [review.id, req.user.id, JSON.stringify(cells)]);
            const out = { success: true, review: await reviewOut(saved[0], req.user.id) };
            if (stoppedEarly) { out.partial = 'Some cells were left empty: ' + stoppedEarly.message; out.code = stoppedEarly.code; }
            res.json(out);
        } catch (e) { fail(res, e, 'Could not fill the review table'); }
    });

    router.put('/reviews/:id', async (req, res) => {
        try {
            const title = clip(String((req.body && req.body.title) || '').trim(), 200);
            if (!title) return res.status(400).json({ error: 'Add a title.' });
            const { rows } = await pool.query('UPDATE reviews SET title=$3, updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING *', [req.params.id, req.user.id, title]);
            if (!rows.length) return res.status(404).json({ error: 'Review table not found.' });
            res.json({ success: true, review: await reviewOut(rows[0], req.user.id) });
        } catch (e) { fail(res, e, 'Could not rename the review table'); }
    });

    router.delete('/reviews/:id', async (req, res) => {
        try {
            await pool.query('DELETE FROM reviews WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
            res.json({ success: true });
        } catch (e) { fail(res, e, 'Could not delete the review table'); }
    });

    // ================= checklists =================
    router.get('/checklists/templates', (req, res) => {
        res.json({ success: true, templates: Object.entries(CHECKLISTS).map(([key, t]) => ({ key, title: t.title, description: t.description, audience: t.audience, count: t.items.length })) });
    });

    function checklistOut(r) {
        const done = r.items.filter((i) => i.done).length;
        return { id: r.id, title: r.title, templateKey: r.template_key, items: r.items, done, total: r.items.length, updatedAt: r.updated_at };
    }

    router.get('/checklists', async (req, res) => {
        try {
            const { rows } = await pool.query('SELECT * FROM checklists WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 100', [req.user.id]);
            res.json({ success: true, checklists: rows.map(checklistOut) });
        } catch (e) { fail(res, e, 'Could not load checklists'); }
    });

    router.post('/checklists', async (req, res) => {
        try {
            const key = (req.body && req.body.templateKey) || '';
            const t = key ? own(CHECKLISTS, key) : { title: 'Untitled checklist', items: [] };
            if (!t) return res.status(400).json({ error: 'Choose a checklist.' });
            const { rows: count } = await pool.query('SELECT COUNT(*)::int AS n FROM checklists WHERE user_id=$1', [req.user.id]);
            if (count[0].n >= 100) return res.status(400).json({ error: 'You have reached the limit of 100 checklists.' });
            const title = clip(String((req.body && req.body.title) || '').trim(), 200) || t.title;
            const list = t.items.map((it, i) => ({ id: 'i' + i, section: it.section, text: it.text, done: false }));
            const { rows } = await pool.query('INSERT INTO checklists (id, user_id, title, template_key, items) VALUES ($1,$2,$3,$4,$5) RETURNING *',
                [newId('ck_'), req.user.id, title, key || null, JSON.stringify(list)]);
            res.json({ success: true, checklist: checklistOut(rows[0]) });
        } catch (e) { fail(res, e, 'Could not create the checklist'); }
    });

    router.put('/checklists/:id', async (req, res) => {
        try {
            const body = req.body || {};
            const title = clip(String(body.title || '').trim(), 200);
            const list = Array.isArray(body.items) ? body.items.slice(0, 150).map((it, i) => ({
                id: clip(String((it && it.id) || 'n' + i), 40),
                section: it && it.section ? clip(String(it.section), 60) : null,
                text: clip(String((it && it.text) || '').trim(), 300),
                done: !!(it && it.done),
            })).filter((it) => it.text) : null;
            if (!title || !list) return res.status(400).json({ error: 'A checklist needs a title and items.' });
            const { rows } = await pool.query('UPDATE checklists SET title=$3, items=$4, updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING *',
                [req.params.id, req.user.id, title, JSON.stringify(list)]);
            if (!rows.length) return res.status(404).json({ error: 'Checklist not found.' });
            res.json({ success: true, checklist: checklistOut(rows[0]) });
        } catch (e) { fail(res, e, 'Could not save the checklist'); }
    });

    router.delete('/checklists/:id', async (req, res) => {
        try {
            await pool.query('DELETE FROM checklists WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
            res.json({ success: true });
        } catch (e) { fail(res, e, 'Could not delete the checklist'); }
    });

    // ================= documents =================
    router.get('/documents/kinds', (req, res) => {
        res.json({ success: true, kinds: Object.entries(DOCUMENTS).map(([key, d]) => ({ key, label: d.label, needs: d.needs, email: d.email })) });
    });

    function docOut(r, withBody) {
        const o = { id: r.id, kind: r.kind, kindLabel: (own(DOCUMENTS, r.kind) || {}).label || r.kind, title: r.title, contactId: r.contact_id, orgId: r.org_id, updatedAt: r.updated_at, email: !!(own(DOCUMENTS, r.kind) || {}).email };
        if (withBody) o.body = r.body;
        return o;
    }

    router.get('/documents', async (req, res) => {
        try {
            const { rows } = await pool.query('SELECT id, kind, title, contact_id, org_id, updated_at FROM documents WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 200', [req.user.id]);
            res.json({ success: true, documents: rows.map((r) => docOut(r, false)) });
        } catch (e) { fail(res, e, 'Could not load documents'); }
    });

    router.get('/documents/:id', async (req, res) => {
        try {
            const { rows } = await pool.query('SELECT * FROM documents WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
            if (!rows.length) return res.status(404).json({ error: 'Document not found.' });
            res.json({ success: true, document: docOut(rows[0], true) });
        } catch (e) { fail(res, e, 'Could not load the document'); }
    });

    router.post('/documents/generate', async (req, res) => {
        try {
            const body = req.body || {};
            const kind = own(DOCUMENTS, body.kind);
            if (!kind) return res.status(400).json({ error: 'Choose a document type.' });
            const { plan, orgs } = await planFor(req.user);
            const name = await firstName(req.user.id);
            let data, title, contactId = null, orgId = null;

            if (kind.needs === 'contact') {
                const c = await dbAPI.getContactById(String(body.contactId || ''), req.user.id);
                if (!c) return res.status(400).json({ error: 'Choose a contact.' });
                contactId = c.id;
                data = { contact: contactForModel(c) };
                title = `${kind.label}: ${c.name}`;
            } else if (kind.needs === 'firm') {
                const firm = clip(String(body.firm || '').trim(), 120);
                if (!firm) return res.status(400).json({ error: 'Enter a firm.' });
                const all = await dbAPI.getContactsByUserId(req.user.id);
                const at = all.filter((c) => String(c.firm || c.company || '').toLowerCase().includes(firm.toLowerCase()));
                data = { firm, contacts_at_firm: at.slice(0, 30).map(contactForModel) };
                title = `${kind.label}: ${firm}`;
            } else if (kind.needs === 'plan') {
                const inputs = body.plan || {};
                const all = await dbAPI.getContactsByUserId(req.user.id);
                data = {
                    plan: {
                        class_year: clip(String(inputs.classYear || '').trim(), 40) || 'not given',
                        target: clip(String(inputs.target || '').trim(), 120) || 'investment banking',
                        stage: clip(String(inputs.stage || '').trim(), 60) || 'just starting',
                        school: clip(String(inputs.school || '').trim(), 120) || null,
                    },
                    network_size: all.length,
                    contacts: all.slice(0, 40).map(contactForModel),
                };
                title = `${kind.label}: ${data.plan.target}`;
            } else if (kind.needs === 'org') {
                const org = orgs.find((o) => o.id === body.orgId && (o.role === 'owner' || o.role === 'admin'));
                if (!org) return res.status(403).json({ error: 'Only club owners and admins can create club reports.' });
                orgId = org.id;
                const roster = await dbAPI.getOrgRosterWithStats(org.id);
                const { rows: shared } = await pool.query(
                    `SELECT o.firm, o.role, o.stage, o.stage_date, m.user_id FROM outcomes o JOIN org_members m ON m.user_id = o.user_id AND m.org_id = $1
                     WHERE o.share_with_club = true ORDER BY o.updated_at DESC LIMIT 60`, [org.id]);
                const nameOf = new Map(roster.map((m) => [m.userId, m.name]));
                data = {
                    club: org.name,
                    members: roster.slice(0, 150).map((m) => ({ name: m.name, calls: m.calls, outreach: m.emailsSent, replies: m.emailsReceived, contacts: m.contactsCount, days_since_active: m.lastActivityAt ? daysSince(m.lastActivityAt) : null })),
                    shared_outcomes: shared.map((s) => ({ member: nameOf.get(s.user_id) || 'Member', firm: s.firm, role: s.role, stage: s.stage, date: s.stage_date })),
                };
                title = `${kind.label}: ${org.name}`;
            } else {
                const all = await dbAPI.getContactsByUserId(req.user.id);
                const recent = all
                    .map((c) => ({ c, last: lastTouch(c) }))
                    .sort((a, b) => String(b.last || '').localeCompare(String(a.last || '')))
                    .slice(0, 40)
                    .map(({ c }) => contactForModel(c));
                data = { contacts: recent, total_contacts: all.length };
                title = `${kind.label}: week of ${today()}`;
            }

            const instructions = clip(String(body.instructions || '').trim(), 500);
            const system = `You write ready-to-use recruiting documents for a college student${name ? ' named ' + name : ''}. Today is ${today()}.
Task: ${kind.brief}
${kind.email ? 'Format: first line "Subject: ...", a blank line, then the email body signed with the student\'s first name. Plain text, no markdown.' : 'Format: GitHub-flavored markdown with short "##" section headings and tight bullets. No preamble, no closing remarks.'}
Ground everything in the DATA. Never invent people, deals, numbers or dates; if something is unknown, leave a bracketed placeholder like [their group].
Write like a thoughtful, specific human, never like a template: no buzzwords, no generic flattery, no "I hope this email finds you well". The goal is a real relationship, not a transaction.`;
            const completion = await usage.meteredCompletion({
                pool, openai: getOpenAI(), user: req.user, plan, feature: 'document:' + body.kind,
                model: plan.qualityModel ? usage.QUALITY_MODEL : usage.DEFAULT_MODEL,
                maxTokens: kind.maxTokens,
                params: { temperature: 0.4, messages: [{ role: 'system', content: withPlaybook(system) }, { role: 'user', content: 'DATA:\n' + JSON.stringify(data).slice(0, 60000) + (instructions ? '\n\nEXTRA INSTRUCTIONS FROM THE STUDENT:\n' + instructions : '') }] },
            });
            const text = guardLeak(clip((completion.choices[0].message.content || '').trim(), 20000));
            const { rows } = await pool.query('INSERT INTO documents (id, user_id, kind, title, contact_id, org_id, body) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
                [newId('dc_'), req.user.id, body.kind, clip(title, 200), contactId, orgId, text]);
            res.json({ success: true, document: docOut(rows[0], true) });
        } catch (e) { fail(res, e, 'Could not create the document'); }
    });

    router.put('/documents/:id', async (req, res) => {
        try {
            const title = clip(String((req.body && req.body.title) || '').trim(), 200);
            const text = clip(String((req.body && req.body.body) || ''), 40000);
            if (!title) return res.status(400).json({ error: 'Add a title.' });
            const { rows } = await pool.query('UPDATE documents SET title=$3, body=$4, updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING *', [req.params.id, req.user.id, title, text]);
            if (!rows.length) return res.status(404).json({ error: 'Document not found.' });
            res.json({ success: true, document: docOut(rows[0], true) });
        } catch (e) { fail(res, e, 'Could not save the document'); }
    });

    router.delete('/documents/:id', async (req, res) => {
        try {
            await pool.query('DELETE FROM documents WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
            res.json({ success: true });
        } catch (e) { fail(res, e, 'Could not delete the document'); }
    });

    // ================= manager console =================
    async function managerOrg(req, res) {
        const orgs = await dbAPI.getOrgsForUser(req.user.id);
        const org = orgs.find((o) => o.id === req.params.orgId);
        if (!org) { res.status(404).json({ error: 'Club not found.' }); return null; }
        if (org.role !== 'owner' && org.role !== 'admin') { res.status(403).json({ error: 'Only club owners and admins can open the console.' }); return null; }
        return org;
    }

    function memberStatus(m) {
        const d = m.lastActivityAt ? daysSince(m.lastActivityAt) : null;
        if (d == null) return 'Not started';
        if (d <= 14) return 'Active';
        if (d <= 30) return 'Slowing';
        return 'Inactive';
    }

    router.get('/console/:orgId', async (req, res) => {
        try {
            const org = await managerOrg(req, res);
            if (!org) return;
            const roster = await dbAPI.getOrgRosterWithStats(org.id);
            const since = Date.now() - 30 * 86400000;
            const active = roster.filter((m) => m.lastActivityAt && new Date(m.lastActivityAt).getTime() >= since).length;
            const sum = (k) => roster.reduce((a, m) => a + (+m[k] || 0), 0);
            const sent = sum('emailsSent'), replies = sum('emailsReceived');
            const invites = await dbAPI.getOrgInvites(org.id);
            const { rows: shared } = await pool.query(
                `SELECT o.firm, o.role, o.stage, o.stage_date, o.user_id FROM outcomes o
                 JOIN org_members m ON m.user_id = o.user_id AND m.org_id = $1
                 WHERE o.share_with_club = true ORDER BY COALESCE(o.stage_date, '') DESC LIMIT 200`, [org.id]);
            const nameOf = new Map(roster.map((m) => [m.userId, m.name]));
            const byStage = {};
            STAGES.forEach((s) => { byStage[s.key] = 0; });
            shared.forEach((s) => { byStage[s.stage] = (byStage[s.stage] || 0) + 1; });
            res.json({
                success: true,
                org: {
                    id: org.id, name: org.name, school: org.school, joinCode: org.joinCode, role: org.role,
                    verified: !!org.verified, orgType: org.orgType || 'club', planStatus: org.planStatus || 'none',
                    license: org.license || 'none', licenseExpiresAt: org.licenseExpiresAt || null,
                },
                kpis: {
                    members: roster.length,
                    active30: active,
                    outreach: sent,
                    replies,
                    replyRate: sent ? Math.round((replies / sent) * 100) : 0,
                    calls: sum('calls'),
                    contacts: sum('contactsCount'),
                    offers: (byStage.offer || 0) + (byStage.accepted || 0),
                },
                members: roster.map((m) => ({
                    userId: m.userId, name: m.name, email: m.email, role: m.role, joinedAt: m.joinedAt,
                    lastActiveAt: m.lastActivityAt, status: memberStatus(m),
                    contacts: m.contactsCount, outreach: m.emailsSent, replies: m.emailsReceived, calls: m.calls,
                    responseRate: m.responseRate, score: m.activityScore, rank: m.rank,
                })),
                invites: invites.filter((i) => i.status === 'pending').slice(0, 100).map((i) => ({ email: i.email, createdAt: i.createdAt })),
                outcomes: {
                    stages: STAGE_LABEL,
                    byStage,
                    sharingMembers: new Set(shared.map((s) => s.user_id)).size,
                    rows: shared.slice(0, 100).map((s) => ({ member: nameOf.get(s.user_id) || 'Member', firm: s.firm, role: s.role, stage: s.stage, stageLabel: own(STAGE_LABEL, s.stage) || s.stage, date: s.stage_date })),
                },
            });
        } catch (e) { fail(res, e, 'Could not load the console'); }
    });

    router.post('/console/:orgId/members/:userId/role', async (req, res) => {
        try {
            const org = await managerOrg(req, res);
            if (!org) return;
            const role = req.body && req.body.role;
            if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Choose admin or member.' });
            if (org.role !== 'owner') return res.status(403).json({ error: 'Only the club owner can change roles.' });
            if (req.params.userId === req.user.id) return res.status(400).json({ error: 'You can’t change your own role.' });
            const { rowCount } = await pool.query("UPDATE org_members SET role=$3 WHERE org_id=$1 AND user_id=$2 AND role <> 'owner'", [org.id, req.params.userId, role]);
            if (!rowCount) return res.status(404).json({ error: 'Member not found.' });
            res.json({ success: true });
        } catch (e) { fail(res, e, 'Could not change the role'); }
    });

    router.delete('/console/:orgId/members/:userId', async (req, res) => {
        try {
            const org = await managerOrg(req, res);
            if (!org) return;
            if (req.params.userId === req.user.id) return res.status(400).json({ error: 'You can’t remove yourself.' });
            const { rows } = await pool.query('SELECT role FROM org_members WHERE org_id=$1 AND user_id=$2', [org.id, req.params.userId]);
            if (!rows.length) return res.status(404).json({ error: 'Member not found.' });
            if (rows[0].role === 'owner') return res.status(403).json({ error: 'The club owner can’t be removed.' });
            if (rows[0].role === 'admin' && org.role !== 'owner') return res.status(403).json({ error: 'Only the owner can remove an admin.' });
            await pool.query('DELETE FROM org_members WHERE org_id=$1 AND user_id=$2', [org.id, req.params.userId]);
            res.json({ success: true });
        } catch (e) { fail(res, e, 'Could not remove the member'); }
    });

    // Members can leave a club themselves.
    router.post('/orgs/:orgId/leave', async (req, res) => {
        try {
            const { rows } = await pool.query('SELECT role FROM org_members WHERE org_id=$1 AND user_id=$2', [req.params.orgId, req.user.id]);
            if (!rows.length) return res.status(404).json({ error: 'You are not in this club.' });
            if (rows[0].role === 'owner') return res.status(400).json({ error: 'Owners can’t leave their own club. Contact us to transfer ownership.' });
            await pool.query('DELETE FROM org_members WHERE org_id=$1 AND user_id=$2', [req.params.orgId, req.user.id]);
            res.json({ success: true });
        } catch (e) { fail(res, e, 'Could not leave the club'); }
    });

    // ================= admin (Weaver staff, ADMIN_EMAILS) =================
    function requireAdmin(req, res) {
        if (!isAdmin(req.user)) { res.status(404).json({ error: 'Not found' }); return false; }
        return true;
    }

    // Usage dashboard for Weaver staff. Counts only: no one's contacts, notes or emails.
    // Non-admins get 404 so the page's existence isn't revealed.
    router.get('/admin/stats', async (req, res) => {
        if (!isAdmin(req.user)) return res.status(404).json({ error: 'Not found' });
        try {
            const q = async (sql, params) => (await pool.query(sql, params || [])).rows;
            const [users] = await q(`SELECT COUNT(*)::int AS total,
                    COUNT(*) FILTER (WHERE created_at > now() - interval '1 day')::int AS new_1d,
                    COUNT(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS new_7d,
                    COUNT(*) FILTER (WHERE created_at > now() - interval '30 days')::int AS new_30d,
                    COUNT(*) FILTER (WHERE account_type = 'org')::int AS leaders
                FROM users`);
            const weekly = await q(`SELECT to_char(date_trunc('week', created_at), 'YYYY-MM-DD') AS week, COUNT(*)::int AS n
                FROM users WHERE created_at > date_trunc('week', now()) - interval '11 weeks' GROUP BY 1 ORDER BY 1`);
            const [active] = await q(`SELECT
                    COUNT(DISTINCT user_id) FILTER (WHERE seen > now() - interval '1 day')::int AS daily,
                    COUNT(DISTINCT user_id) FILTER (WHERE seen > now() - interval '7 days')::int AS weekly,
                    COUNT(DISTINCT user_id) FILTER (WHERE seen > now() - interval '30 days')::int AS monthly
                FROM (SELECT user_id, COALESCE(last_seen_at, created_at) AS seen FROM sessions) s`);
            const [engagement] = await q(`SELECT
                    (SELECT COUNT(DISTINCT user_id)::int FROM contacts) AS with_contacts,
                    (SELECT COUNT(*)::int FROM contacts) AS contacts,
                    (SELECT COUNT(DISTINCT c.user_id)::int FROM notes n JOIN contacts c ON c.id = n.contact_id) AS logged_calls,
                    (SELECT COUNT(*)::int FROM notes) AS calls,
                    (SELECT COUNT(*)::int FROM emails WHERE direction = 'sent') AS emails_sent,
                    (SELECT COUNT(DISTINCT user_id)::int FROM ai_usage WHERE created_at > now() - interval '30 days') AS used_ai_30d,
                    (SELECT COUNT(*)::int FROM documents) AS documents,
                    (SELECT COUNT(*)::int FROM outcomes) AS outcomes,
                    (SELECT COUNT(*)::int FROM outcomes WHERE stage = 'offer') AS offers`);
            const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
            const ai = await q(`SELECT feature, COUNT(*)::int AS requests, COALESCE(SUM(cost_micros),0)::bigint AS micros
                FROM ai_usage WHERE created_at >= $1 GROUP BY 1 ORDER BY 3 DESC`, [monthStart]);
            const aiMicros = ai.reduce((t, r) => t + Number(r.micros), 0);
            const capUsd = parseFloat(process.env.AI_MONTHLY_GLOBAL_CAP_USD || '');
            const clubs = await q(`SELECT o.name, o.school, o.verified, o.org_type, o.plan_status, o.license, o.license_expires_at,
                    COUNT(m.user_id)::int AS members,
                    COUNT(DISTINCT s.user_id)::int AS active_30d
                FROM organizations o
                LEFT JOIN org_members m ON m.org_id = o.id
                LEFT JOIN sessions s ON s.user_id = m.user_id AND COALESCE(s.last_seen_at, s.created_at) > now() - interval '30 days'
                GROUP BY o.id ORDER BY members DESC, o.created_at DESC LIMIT 200`);
            // Plans: resolve each user's plan the same way the app does.
            const people = await q(`SELECT id, subscription_status FROM users`);
            const memberships = await q(`SELECT m.user_id, o.verified, o.plan_status, o.license, o.license_expires_at
                FROM org_members m JOIN organizations o ON o.id = m.org_id`);
            const byUser = new Map();
            for (const m of memberships) {
                if (!byUser.has(m.user_id)) byUser.set(m.user_id, []);
                byUser.get(m.user_id).push({ verified: m.verified, planStatus: m.plan_status, license: m.license, licenseExpiresAt: m.license_expires_at });
            }
            const plans = { starter: 0, club: 0, club_plus: 0, pro: 0 };
            for (const u of people) {
                const key = resolvePlan({ subscriptionStatus: u.subscription_status }, byUser.get(u.id) || []).key;
                plans[key] = (plans[key] || 0) + 1;
            }
            res.json({
                success: true,
                generatedAt: new Date().toISOString(),
                users,
                weekly,
                active,
                engagement,
                ai: { monthUsd: aiMicros / 1e6, capUsd: Number.isFinite(capUsd) && capUsd > 0 ? capUsd : null, byFeature: ai.map((r) => ({ feature: r.feature, requests: r.requests, usd: Number(r.micros) / 1e6 })), provider: usage.providerStatus() },
                plans,
                clubs: clubs.map((c) => ({
                    name: c.name, school: c.school, verified: !!c.verified, type: c.org_type || 'club',
                    sponsored: ['active', 'trialing', 'past_due'].includes(c.plan_status) || (c.license === 'campus' && (!c.license_expires_at || new Date(c.license_expires_at) > new Date())),
                    members: c.members, active30d: c.active_30d,
                })),
            });
        } catch (e) { fail(res, e, 'Could not load the stats'); }
    });

    router.get('/admin/orgs', async (req, res) => {
        if (!requireAdmin(req, res)) return;
        try {
            const { rows } = await pool.query(`SELECT o.id, o.name, o.school, o.join_code, o.verified, o.org_type, o.license, o.license_expires_at, o.plan_status, o.created_at,
                u.email AS owner_email, (SELECT COUNT(*)::int FROM org_members m WHERE m.org_id = o.id) AS members
                FROM organizations o JOIN users u ON u.id = o.owner_id ORDER BY o.created_at DESC LIMIT 500`);
            res.json({ success: true, orgs: rows });
        } catch (e) { fail(res, e, 'Could not list clubs'); }
    });

    router.post('/admin/orgs/:orgId', async (req, res) => {
        if (!requireAdmin(req, res)) return;
        try {
            const b = req.body || {};
            const sets = [], vals = [req.params.orgId];
            if (typeof b.verified === 'boolean') { vals.push(b.verified); sets.push(`verified=$${vals.length}`); }
            if (['club', 'career_center'].includes(b.orgType)) { vals.push(b.orgType); sets.push(`org_type=$${vals.length}`); }
            if (['none', 'campus'].includes(b.license)) { vals.push(b.license); sets.push(`license=$${vals.length}`); }
            if (b.licenseExpiresAt === null || /^\d{4}-\d{2}-\d{2}$/.test(b.licenseExpiresAt || '')) { vals.push(b.licenseExpiresAt || null); sets.push(`license_expires_at=$${vals.length}`); }
            if (!sets.length) return res.status(400).json({ error: 'Nothing to change.' });
            const { rows } = await pool.query(`UPDATE organizations SET ${sets.join(', ')} WHERE id=$1 RETURNING id, name, verified, org_type, license, license_expires_at`, vals);
            if (!rows.length) return res.status(404).json({ error: 'Club not found.' });
            res.json({ success: true, org: rows[0] });
        } catch (e) { fail(res, e, 'Could not update the club'); }
    });

    return router;
};

module.exports.STAGES = STAGES;
module.exports.CHECKLISTS = CHECKLISTS;
module.exports.DOCUMENTS = DOCUMENTS;
