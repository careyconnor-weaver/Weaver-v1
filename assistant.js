/* ═══════════════════════════════════════════════════════════════════
   WEAVER ASSISTANT — AI-native home (prompt-first, like Harvey/Legora,
   mapped onto Weaver's own data):
     Sources: My network, Follow-ups, Club data, Playbook, Web search
     Files:   "Notes photo" (handwritten call notes to text)
     Improve: rewrites a rough request into a specific one
     Library: ready-made recruiting workflows
     Threads: recent chats in the sidebar
   The model returns structured actions; logging/updating contacts is
   applied locally (the client is the source of truth for contacts and
   syncs to the server) with Undo. Drafts are never sent automatically.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    // ---------- helpers ----------
    function $(id) { return document.getElementById(id); }
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function user() { try { return getCurrentUser(); } catch (e) { return null; } }
    function store(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
    function load(key, fallback) { try { var v = JSON.parse(localStorage.getItem(key) || 'null'); return v == null ? fallback : v; } catch (e) { return fallback; } }
    function uid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
    function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
    function niceDate(d) { var x = new Date(d + (String(d).length === 10 ? 'T12:00:00' : '')); return isNaN(x) ? d : x.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
    function daysSince(dateStr) { var d = new Date(dateStr); return isNaN(d) ? null : Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000)); }
    function firstName() {
        try { var s = getUserSettings(); if (s && s.firstName) return s.firstName; } catch (e) {}
        var u = user(); if (!u || !u.email) return '';
        var n = u.email.split('@')[0].split(/[._-]/)[0];
        return n ? n.charAt(0).toUpperCase() + n.slice(1) : '';
    }
    function timeout(ms) { try { return (typeof weaverTimeoutSignal === 'function') ? weaverTimeoutSignal(ms) : undefined; } catch (e) { return undefined; } }

    // ---------- sources ----------
    var SOURCES = [
        { id: 'network', label: 'My network', hint: 'Your contacts, emails and call notes' },
        { id: 'followups', label: 'Follow-ups', hint: 'Who is overdue and going cold' },
        { id: 'club', label: 'Club data', hint: 'Your club roster and activity', needsClub: true },
        { id: 'web', label: 'Web search', hint: 'Look up firms and people online' },
    ];
    var state = { club: null, busy: false, threadId: null, sourcesOpen: true };
    // Undo snapshots stay in memory (a full contact list per message would overflow localStorage).
    var undoStore = {};

    function sourcesKey() { var u = user(); return 'weaver_assistant_sources_' + (u ? u.id : 'anon'); }
    function activeSources() {
        var s = load(sourcesKey(), null);
        if (!Array.isArray(s)) s = ['network', 'followups'].concat(state.club ? ['club'] : []);
        return s.filter(function (id) { return id !== 'playbook' && (id !== 'club' || state.club); });
    }
    function setSources(list) { store(sourcesKey(), list); renderSources(); }

    // ---------- threads ----------
    function threadsKey() { var u = user(); return 'weaver_assistant_threads_' + (u ? u.id : 'anon'); }
    function threads() { return load(threadsKey(), []); }
    function saveThreads(t) { store(threadsKey(), t.slice(0, 30)); }
    function currentThread() { return threads().find(function (t) { return t.id === state.threadId; }) || null; }
    function upsertThread(th) {
        var t = threads().filter(function (x) { return x.id !== th.id; });
        th.updatedAt = Date.now();
        t.unshift(th);
        saveThreads(t);
        renderThreadList();
    }

    // ---------- workflows (Library) ----------
    var WORKFLOWS = [
        { group: 'Outreach', title: "Plan this week's follow-ups", desc: 'Who to contact, in what order, with drafts for the top people.', prompt: "Who should I follow up with this week? Prioritize VIPs and anyone going cold, give me a one-line reason for each, and draft the most important emails.", send: true },
        { group: 'Outreach', title: 'Draft a thank-you note', desc: 'A short, specific thank-you after a call or coffee chat.', prompt: 'Draft a thank-you email to [name] for our conversation today. Reference what we discussed from my notes.' },
        { group: 'Outreach', title: 'Write a cold email', desc: 'First outreach to someone at a target firm.', prompt: "Write a cold email to [name], [role] at [firm]. I'm a [year] at [school] interested in [group]. Ask for a short call. The real reason I picked them: [shared school, club, hometown or something they worked on]." },
        { group: 'Relationships', title: 'Ask for a referral', desc: 'Checks the relationship is ready, then drafts the ask.', prompt: 'I want to ask [name] at [firm] for a referral for [role]. Look at our history in my notes: is the relationship ready for the ask? If yes, draft the email. If not, tell me what to do first and draft that instead.' },
        { group: 'Relationships', title: 'Turn a call into a relationship', desc: 'What to send next so they remember you for the right reasons.', prompt: 'I spoke with [name] at [firm]. Based on my notes, what should I do over the next two months to build a real relationship with them, not just follow up? Draft the next message.' },
        { group: 'Relationships', title: 'Reconnect with someone gone cold', desc: 'A warm, honest note that doesn’t feel like an ask.', prompt: "Find the contacts I've let go cold who mattered most, and draft a short, genuine check-in for the top 3 that references what we last talked about." , send: true },
        { group: 'Plan', title: 'Plan my recruiting season', desc: 'Prep phase, the weeks in the midst, and this week’s moves.', prompt: "I'm a [year] at [school] recruiting for [industry / role]. Build my recruiting plan: what to do in the prep phase, what to do once applications open, and five actions for this week using people in my network." },
        { group: 'Plan', title: 'Grinder mode: this week', desc: 'For semi-target students: a concrete weekly target and who to contact.', prompt: "I'm at a semi-target school. Set me a realistic networking target for this week and tell me exactly who in my network to contact first and why. Draft the top two emails.", send: true },
        { group: 'Logging', title: 'Log a conversation', desc: 'Describe it in plain words; Weaver files it to the right contact.', prompt: 'Log this: I had a [call / coffee chat] with [name] at [firm] today. We talked about [topics]. Next step: [next step].' },
        { group: 'Prep', title: 'Prep for a coffee chat', desc: 'Questions to ask, and what to research yourself first.', prompt: 'Help me prepare for my coffee chat with [name] at [firm]: summarize what I know from my notes, list what I should research myself before the call, and give me 6 questions specific to them, from light openers to deeper ones.' },
        { group: 'Prep', title: 'Mock interview', desc: 'Practice one question at a time, with feedback after each answer.', prompt: 'Run a mock [investment banking / consulting] interview for [firm]. Ask one question at a time, mixing technical and behavioral. After each of my answers, give short feedback on structure and accuracy, then ask the next question.' },
        { group: 'Prep', title: 'Technicals drill', desc: 'Five questions on one topic, with model answers.', prompt: 'Give me 5 [accounting / valuation / DCF / LBO / merger model] technical questions, one at a time. Wait for my answer, then show a concise model answer and what I missed.' },
        { group: 'Prep', title: 'Why this firm', desc: 'A specific answer built from the people you have spoken to.', prompt: 'Help me write a 60-second "Why [firm]?" answer using the conversations in my notes with people at [firm]. Name the people and what they said that stood out.' },
        { group: 'Insights', title: 'Who do I know at a firm?', desc: 'Every relationship at one firm and where it stands.', prompt: 'Who do I know at [firm]? Summarize where each relationship stands and what I should do next with each.' },
        { group: 'Insights', title: 'My recruiting pulse', desc: 'Outreach, replies and calls this month, and what to change.', prompt: 'How is my networking going this month? Cover outreach sent, reply rate, calls, and the one thing I should change.', send: true },
        { group: 'Club', title: 'Club weekly report', desc: "Top performers, who's stalling, and what to do as club leader.", prompt: "Summarize our club's networking activity: top performers, members who are stalling, and three concrete actions I should take as club leader.", send: true, club: true },
        { group: 'Club', title: 'Who needs a nudge?', desc: "Members who haven't networked in two weeks, with a message to send.", prompt: "Which club members haven't networked in the last two weeks? Draft a short, encouraging message I can send them.", send: true, club: true },
    ];
    function customWorkflowsKey() { var u = user(); return 'weaver_assistant_saved_' + (u ? u.id : 'anon'); }

    // ---------- network snapshot (sent with each request) ----------
    function buildNetwork() {
        var contacts = [];
        try { contacts = getContacts() || []; } catch (e) {}
        var cold = 12, established = 90;
        try {
            var st = typeof getAssistantSettings === 'function' ? getAssistantSettings() : null;
            if (st && st.coldContactDays) cold = st.coldContactDays;
            if (st && st.establishedContactDays) established = st.establishedContactDays;
        } catch (e) {}
        var sent = 0, received = 0, calls = 0;
        var list = contacts.slice(0, 400).map(function (c) {
            var emails = c.emails || [], notes = c.notes || [];
            var s = emails.filter(function (e) { return e.direction === 'sent'; }).length;
            var r = emails.filter(function (e) { return e.direction === 'received'; }).length;
            sent += s; received += r; calls += notes.length;
            var dates = emails.map(function (e) { return e.date; }).concat(notes.map(function (n) { return n.date; })).filter(Boolean).sort();
            var last = dates.length ? dates[dates.length - 1] : null;
            var since = last ? daysSince(last) : null;
            var isEst = r > 0 || emails.length > 1 || notes.length > 0;
            var warmth = null; try { warmth = window.WeaverWarmth ? window.WeaverWarmth.assess(c) : null; } catch (e) {}
            var threshold = isEst ? established : cold;
            return {
                name: c.name, firm: c.firm || c.company || null, position: c.position || null, email: c.email || null,
                priority: c.priority || null, vip: !!c.vip, status: isEst ? 'established' : 'cold',
                warmth: warmth ? warmth.label : null, warmth_reason: warmth ? warmth.reason : null,
                emails_sent: s, replies: r, calls: notes.length, last_interaction: last, days_since: since,
                overdue: since != null && since >= threshold,
                recent_notes: notes.slice(-2).map(function (n) { return { date: n.date, summary: String(n.summary || '').slice(0, 300) }; }),
                general_notes: c.generalNotes ? String(c.generalNotes).slice(0, 200) : undefined,
            };
        });
        return {
            totals: { contacts: contacts.length, emails_sent: sent, replies: received, calls: calls, reply_rate: sent ? Math.round(received / sent * 100) + '%' : 'n/a' },
            follow_up_rules: { cold_contact_days: cold, established_contact_days: established },
            contacts: list,
        };
    }

    // ---------- tiny safe markdown ----------
    function inline(s) {
        s = esc(s);
        s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
        s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
        s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        // Bare web addresses (for example in a Sources list) become links too.
        s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)"]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
        return s;
    }
    function md(src) {
        var lines = String(src || '').replace(/\r/g, '').split('\n');
        var out = [], i = 0;
        while (i < lines.length) {
            var l = lines[i];
            if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
                var head = l.trim().replace(/^\||\|$/g, '').split('|');
                i += 2;
                var rows = [];
                while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|')); i++; }
                out.push('<div class="wv-table-wrap"><table><thead><tr>' + head.map(function (h) { return '<th>' + inline(h.trim()) + '</th>'; }).join('') + '</tr></thead><tbody>' +
                    rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + inline(c.trim()) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>');
                continue;
            }
            if (/^\s*[-*]\s+/.test(l)) {
                var items = [];
                while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push('<li>' + inline(lines[i].replace(/^\s*[-*]\s+/, '')) + '</li>'); i++; }
                out.push('<ul>' + items.join('') + '</ul>'); continue;
            }
            if (/^\s*\d+[.)]\s+/.test(l)) {
                var oi = [];
                while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { oi.push('<li>' + inline(lines[i].replace(/^\s*\d+[.)]\s+/, '')) + '</li>'); i++; }
                out.push('<ol>' + oi.join('') + '</ol>'); continue;
            }
            var h = l.match(/^(#{1,4})\s+(.*)$/);
            if (h) { out.push('<h4>' + inline(h[2]) + '</h4>'); i++; continue; }
            if (!l.trim()) { i++; continue; }
            var para = [];
            while (i < lines.length && lines[i].trim() && !/^\s*([-*]\s|\d+[.)]\s|#{1,4}\s|\|)/.test(lines[i])) { para.push(inline(lines[i])); i++; }
            if (para.length) out.push('<p>' + para.join('<br>') + '</p>');
            else i++;
        }
        return out.join('');
    }

    // Shared with the Documents view.
    window.wvMarkdown = md;

    // ---------- applying actions to contacts (with undo) ----------
    function findContact(contacts, name) {
        var n = String(name || '').trim().toLowerCase();
        if (!n) return null;
        var exact = contacts.find(function (c) { return String(c.name || '').trim().toLowerCase() === n; });
        if (exact) return exact;
        var parts = n.split(/\s+/);
        var matches = contacts.filter(function (c) {
            var cn = String(c.name || '').toLowerCase();
            return parts.every(function (p) { return cn.indexOf(p) !== -1; });
        });
        return matches.length === 1 ? matches[0] : null;
    }
    var KIND_LABEL = { call: 'call', coffee_chat: 'coffee chat', meeting: 'meeting', email_sent: 'sent email', email_received: 'reply' };

    function applyActions(actions) {
        var contacts;
        try { contacts = JSON.parse(JSON.stringify(getContacts() || [])); } catch (e) { return { results: [], undo: null }; }
        var before = JSON.stringify(contacts);
        var results = [];
        (actions || []).forEach(function (a, idx) {
            if (a.type === 'log_interaction') {
                var c = findContact(contacts, a.contact_name);
                var created = false;
                if (!c) {
                    c = { id: Date.now().toString() + Math.floor(Math.random() * 1000), name: a.contact_name, firm: a.firm || '', position: a.position || '', email: a.email || '', priority: 'medium', vip: false, emails: [], notes: [], numberOfCalls: 0, firstEmailDate: null };
                    contacts.push(c); created = true;
                } else {
                    if (a.firm && !c.firm) c.firm = a.firm;
                    if (a.position && !c.position) c.position = a.position;
                    if (a.email && !c.email) c.email = a.email;
                }
                c.emails = c.emails || []; c.notes = c.notes || [];
                if (a.kind === 'email_sent' || a.kind === 'email_received') {
                    c.emails.push({ id: uid('e_'), date: a.date, direction: a.kind === 'email_sent' ? 'sent' : 'received', type: a.kind === 'email_sent' ? (c.emails.length ? 'follow-up' : 'cold') : 'received', subject: '' });
                    if (a.kind === 'email_sent' && !c.firstEmailDate) c.firstEmailDate = a.date;
                } else {
                    c.notes.push({ id: uid('n_'), date: a.date, summary: (KIND_LABEL[a.kind] ? KIND_LABEL[a.kind].charAt(0).toUpperCase() + KIND_LABEL[a.kind].slice(1) + ': ' : '') + (a.summary || ''), extractedText: null, imageUrl: null, isTextNote: true });
                    c.numberOfCalls = c.notes.length;
                }
                results.push({ idx: idx, text: (created ? 'Added ' : 'Logged for ') + c.name + (c.firm ? ' (' + c.firm + ')' : '') + ': ' + (KIND_LABEL[a.kind] || 'interaction') + ', ' + niceDate(a.date) + (created ? ' — new contact' : '') });
            } else if (a.type === 'update_contact') {
                var u = findContact(contacts, a.contact_name);
                if (!u) { results.push({ idx: idx, text: 'Could not find ' + a.contact_name + ' in your network — nothing changed.', skipped: true }); return; }
                Object.keys(a.fields).forEach(function (k) { u[k] = a.fields[k]; });
                var desc = Object.keys(a.fields).map(function (k) { return k === 'vip' ? (a.fields.vip ? 'marked VIP' : 'removed VIP') : k + ' set to ' + a.fields[k]; }).join(', ');
                results.push({ idx: idx, text: 'Updated ' + u.name + ': ' + desc });
            }
        });
        var changed = results.some(function (r) { return !r.skipped; });
        if (changed) {
            saveContacts(contacts);
            refreshAppViews();
        }
        return { results: results, undo: changed ? before : null };
    }

    function refreshAppViews() {
        ['updateContactDropdown', 'updateFirmFilter', 'filterContacts', 'updateDashboard'].forEach(function (fn) {
            try { if (typeof window[fn] === 'function') window[fn](); } catch (e) {}
        });
    }

    // ---------- rendering ----------
    function renderGreeting() {
        var el = $('wv-greeting');
        if (!el) return;
        var h = new Date().getHours();
        var part = h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
        var n = firstName();
        el.textContent = part + (n ? ', ' + n : '') + '. What should we work on?';
        renderStart();
        var sub = $('wv-home-sub');
        if (sub) {
            var overdue = 0;
            try { overdue = buildNetwork().contacts.filter(function (c) { return c.overdue; }).length; } catch (e) {}
            sub.textContent = overdue > 0
                ? overdue + (overdue === 1 ? ' contact is' : ' contacts are') + ' due for a follow-up. Ask about your network, log a conversation in plain words, or plan this week’s outreach.'
                : 'Ask about your network, log a conversation in plain words, or plan this week’s outreach.';
        }
    }

    // First run: no contacts yet. Start in Weaver itself, no spreadsheet needed.
    function renderStart() {
        var box = $('wv-start');
        if (!box) return;
        var count = 0;
        try { count = (getContacts() || []).length; } catch (e) {}
        var th = currentThread();
        if (count > 0 || (th && th.messages && th.messages.length)) { box.hidden = true; box.innerHTML = ''; return; }
        box.hidden = false;
        box.innerHTML =
            '<h2 class="wv-start-title">Start with one person</h2>' +
            '<p class="wv-start-sub">No spreadsheet needed. Add someone you want to talk to: an alum, a friend of a friend, someone whose path you admire. Weaver keeps track from there.</p>' +
            '<form class="wv-start-form" id="wv-start-form">' +
            '<label class="wv-field"><span>Name</span><input id="wv-st-name" required maxlength="120" placeholder="Jordan Lee"></label>' +
            '<label class="wv-field"><span>Firm</span><input id="wv-st-firm" maxlength="120" placeholder="Evercore"></label>' +
            '<label class="wv-field"><span>Role <em class="wv-optional">optional</em></span><input id="wv-st-role" maxlength="120" placeholder="Analyst, restructuring"></label>' +
            '<label class="wv-field"><span>Email <em class="wv-optional">optional</em></span><input id="wv-st-email" type="email" maxlength="200" placeholder="jordan@firm.com"></label>' +
            '<label class="wv-field wv-start-why"><span>Why them? <em class="wv-optional">optional, but it makes the first email real</em></span><input id="wv-st-why" maxlength="300" placeholder="Also from my school, was in the same finance club"></label>' +
            '<button type="submit" class="wv-btn wv-btn-primary">Add and write my first email</button>' +
            '</form>' +
            '<div class="wv-start-next"><span>Or start another way:</span>' +
            '<button type="button" class="wv-linkbtn" data-start="log">Log a conversation you already had</button>' +
            '<button type="button" class="wv-linkbtn" data-start="plan">Plan my recruiting season</button>' +
            '<button type="button" class="wv-linkbtn" data-start="import">I do have a spreadsheet</button></div>';
        $('wv-start-form').onsubmit = function (e) {
            e.preventDefault();
            var name = $('wv-st-name').value.trim();
            if (!name) return;
            var firm = $('wv-st-firm').value.trim(), role = $('wv-st-role').value.trim(), email = $('wv-st-email').value.trim(), why = $('wv-st-why').value.trim();
            try {
                addContact({ id: Date.now().toString(), name: name, firm: firm, position: role, email: email, generalNotes: why, priority: 'medium', dateAdded: new Date().toISOString() });
            } catch (err) { return; }
            box.hidden = true;
            var input = $('wv-input');
            if (input) {
                input.value = 'Write my first email to ' + name + (firm ? ' at ' + firm : '') + '. ' +
                    (why ? 'Why I chose them: ' + why + '. ' : 'Leave a placeholder for why I chose them. ') +
                    'Keep it short and human, and ask for a brief call.';
            }
            if (window.wvSend) window.wvSend();
        };
        box.querySelectorAll('[data-start]').forEach(function (b) {
            b.onclick = function () {
                var k = b.getAttribute('data-start'), input = $('wv-input');
                if (k === 'import') {
                    var l = document.querySelector('.nav-link[href="#upload-notes"]'); if (l) l.click();
                    var m = document.querySelector('.mode-btn[data-mode="spreadsheet"]'); if (m) m.click();
                    return;
                }
                if (!input) return;
                input.value = k === 'log'
                    ? 'Log this: I had a [call / coffee chat] with [name] at [firm] on [date]. We talked about [topics]. Next step: [next step].'
                    : "I'm a [year] at [school] recruiting for [industry / role]. Build my recruiting plan: the prep phase, what to do once applications open, and five actions for this week.";
                input.focus();
                var i = input.value.indexOf('['); if (i >= 0) input.setSelectionRange(i, input.value.indexOf(']', i) + 1);
            };
        });
    }

    function renderSources() {
        var box = $('wv-sources');
        if (!box) return;
        var on = activeSources();
        box.innerHTML = SOURCES.filter(function (s) { return !s.needsClub || state.club; }).map(function (s) {
            var active = on.indexOf(s.id) !== -1;
            return '<button type="button" class="wv-chip' + (active ? ' is-on' : '') + '" aria-pressed="' + active + '" data-src="' + s.id + '" title="' + esc(s.hint) + '">' +
                '<span class="wv-chip-dot" aria-hidden="true"></span>' + esc(s.label) + '</button>';
        }).join('');
        box.querySelectorAll('.wv-chip').forEach(function (b) {
            b.onclick = function () {
                var id = b.getAttribute('data-src');
                var cur = activeSources();
                setSources(cur.indexOf(id) !== -1 ? cur.filter(function (x) { return x !== id; }) : cur.concat([id]));
            };
        });
        var btn = $('wv-sources-btn');
        if (btn) btn.setAttribute('aria-expanded', state.sourcesOpen ? 'true' : 'false');
    }

    // Club-leader workflows (club reports, nudging members) are for managers only.
    function workflowsFor(includeClub) {
        var u = user();
        var manager = !!(u && u.role === 'manager');
        return WORKFLOWS.filter(function (w) { return !w.club || (includeClub && manager); });
    }

    function renderWorkflows() {
        var box = $('wv-workflows');
        if (!box) return;
        var pick = workflowsFor(!!state.club).filter(function (w) { return w.send || w.group === 'Logging'; }).slice(0, 4);
        box.innerHTML = '<h2 class="wv-wf-title">Start from a workflow</h2><ul class="wv-wf-list">' + pick.map(function (w) {
            return '<li><button type="button" class="wv-wf" data-wf="' + esc(w.title) + '"><span class="wv-wf-name">' + esc(w.title) + '</span><span class="wv-wf-desc">' + esc(w.desc) + '</span></button></li>';
        }).join('') + '</ul><button type="button" class="wv-linkbtn" id="wv-open-library">See all workflows in the Library</button>';
        box.querySelectorAll('.wv-wf').forEach(function (b) { b.onclick = function () { runWorkflow(b.getAttribute('data-wf')); }; });
        var lib = $('wv-open-library');
        if (lib) lib.onclick = function () { var l = document.querySelector('.nav-link[href="#library"]'); if (l) l.click(); };
    }

    function runWorkflow(title, list) {
        var w = (list || WORKFLOWS).find(function (x) { return x.title === title; });
        if (!w) return;
        goToAssistant();
        if (w.sources) setSources(Array.from(new Set(activeSources().concat(w.sources))));
        var input = $('wv-input');
        input.value = w.prompt;
        autoGrow();
        if (w.send) { window.wvSend(); return; }
        input.focus();
        var s = w.prompt.indexOf('['), e = w.prompt.indexOf(']', s);
        if (s !== -1 && e !== -1) input.setSelectionRange(s, e + 1);
    }

    function goToAssistant() {
        var link = document.querySelector('.nav-link[href="#assistant"]');
        var section = $('assistant');
        if (section && !section.classList.contains('active') && link) link.click();
    }

    function renderThreadList() {
        var box = $('wv-threads');
        if (!box) return;
        var t = threads().slice(0, 6);
        box.innerHTML = t.map(function (th) {
            return '<button type="button" class="wv-thread-link' + (th.id === state.threadId ? ' is-current' : '') + '" data-id="' + esc(th.id) + '" title="' + esc(th.title) + '">' + esc(th.title) + '</button>';
        }).join('') + (threads().length > 6 ? '<button type="button" class="wv-thread-link wv-thread-more" id="wv-threads-all">See all chats</button>' : '');
        box.querySelectorAll('.wv-thread-link[data-id]').forEach(function (b) {
            b.onclick = function () { openThread(b.getAttribute('data-id')); };
        });
        var all = $('wv-threads-all');
        if (all) all.onclick = function () { var l = document.querySelector('.nav-link[href="#library"]'); if (l) l.click(); setTimeout(function () { var h = $('wv-lib-history'); if (h) h.scrollIntoView(); }, 50); };
    }

    function openThread(id) {
        state.threadId = id;
        goToAssistant();
        renderThread();
        renderThreadList();
    }

    function renderThread() {
        var wrap = $('wv-assist'), box = $('wv-thread');
        if (!wrap || !box) return;
        var th = currentThread();
        var has = !!(th && th.messages && th.messages.length);
        wrap.classList.toggle('has-thread', has || state.busy);
        if (!has && !state.busy) { box.innerHTML = ''; return; }
        var html = (th ? th.messages : []).map(function (m, mi) {
            if (m.role === 'user') return '<div class="wv-msg wv-user"><div class="wv-bubble">' + esc(m.content).replace(/\n/g, '<br>') + '</div></div>';
            if (m.error) return '<div class="wv-msg wv-ai wv-error"><p>' + esc(m.content) + (m.upgrade ? ' <button type="button" class="wv-linkbtn wv-inline" onclick="window.openSubscriptionModal && openSubscriptionModal()">See plans</button>' : '') + '</p></div>';
            return '<div class="wv-msg wv-ai"><div class="wv-ai-body">' + md(m.content) + '</div>' + renderActions(m, mi) + '</div>';
        }).join('');
        if (state.busy) html += '<div class="wv-msg wv-ai wv-pending"><span class="wv-dots" aria-label="Working"><i></i><i></i><i></i></span><span>Reading your network…</span></div>';
        box.innerHTML = html;
        bindActionButtons(box);
        requestAnimationFrame(function () { box.lastElementChild && box.lastElementChild.scrollIntoView({ block: 'end', behavior: 'smooth' }); });
    }

    function renderActions(m, mi) {
        var out = '';
        if (m.applied && m.applied.length) {
            out += '<div class="wv-applied">' + m.applied.map(function (r) {
                return '<div class="wv-applied-row' + (r.skipped ? ' is-skipped' : '') + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="' + (r.skipped ? 'M12 8v5M12 16h.01' : 'M20 6L9 17l-5-5') + '"/></svg><span>' + esc(r.text) + '</span></div>';
            }).join('');
            if (m.undoKey && undoStore[m.undoKey] && !m.undone) out += '<button type="button" class="wv-linkbtn" data-undo="' + mi + '">Undo these changes</button>';
            if (m.undone) out += '<span class="wv-muted">Changes undone.</span>';
            out += '</div>';
        }
        (m.actions || []).forEach(function (a, ai) {
            if (a.type !== 'draft_email') return;
            var sent = a.sent;
            out += '<div class="wv-draft">' +
                '<div class="wv-draft-head"><span class="wv-draft-kind">Draft email</span>' + (a.contact_name ? '<span class="wv-draft-to">to ' + esc(a.contact_name) + (a.to_email ? ' &lt;' + esc(a.to_email) + '&gt;' : '') + '</span>' : '') + '</div>' +
                '<input class="wv-draft-subject" data-m="' + mi + '" data-a="' + ai + '" value="' + esc(a.subject) + '" aria-label="Subject">' +
                '<textarea class="wv-draft-body" data-m="' + mi + '" data-a="' + ai + '" rows="' + Math.min(14, Math.max(5, String(a.body).split('\n').length + 1)) + '" aria-label="Email body">' + esc(a.body) + '</textarea>' +
                '<p class="wv-draft-note">Make it sound like you before you send it.</p>' +
                '<div class="wv-draft-actions">' +
                '<button type="button" class="wv-btn wv-btn-primary" data-mailto="' + mi + ':' + ai + '">Open in email</button>' +
                '<button type="button" class="wv-btn" data-copy="' + mi + ':' + ai + '">Copy</button>' +
                (a.contact_name ? (sent ? '<span class="wv-muted">Logged as sent</span>' : '<button type="button" class="wv-btn" data-sent="' + mi + ':' + ai + '">Mark as sent</button>') : '') +
                '</div></div>';
        });
        return out;
    }

    function draftFrom(key) {
        var p = key.split(':'), th = currentThread();
        var m = th && th.messages[+p[0]], a = m && m.actions && m.actions[+p[1]];
        if (!a) return null;
        var sub = document.querySelector('.wv-draft-subject[data-m="' + p[0] + '"][data-a="' + p[1] + '"]');
        var body = document.querySelector('.wv-draft-body[data-m="' + p[0] + '"][data-a="' + p[1] + '"]');
        return { th: th, m: m, a: a, subject: sub ? sub.value : a.subject, body: body ? body.value : a.body };
    }

    function bindActionButtons(box) {
        box.querySelectorAll('[data-undo]').forEach(function (b) {
            b.onclick = function () {
                var th = currentThread(), m = th.messages[+b.getAttribute('data-undo')];
                var snap = m && m.undoKey && undoStore[m.undoKey];
                if (!snap) return;
                try { saveContacts(JSON.parse(snap)); } catch (e) {}
                delete undoStore[m.undoKey];
                m.undone = true;
                upsertThread(th); refreshAppViews(); renderThread();
            };
        });
        box.querySelectorAll('[data-copy]').forEach(function (b) {
            b.onclick = function () {
                var d = draftFrom(b.getAttribute('data-copy'));
                if (!d) return;
                var text = (d.subject ? 'Subject: ' + d.subject + '\n\n' : '') + d.body;
                (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () {
                    b.textContent = 'Copied';
                    setTimeout(function () { b.textContent = 'Copy'; }, 1600);
                }).catch(function () { if (window.wvToast) wvToast('Could not copy automatically. Select the text and copy it.', 'error'); });
            };
        });
        box.querySelectorAll('[data-mailto]').forEach(function (b) {
            b.onclick = function () {
                var d = draftFrom(b.getAttribute('data-mailto'));
                if (!d) return;
                var to = d.a.to_email;
                if (!to) { try { var c = findContact(getContacts(), d.a.contact_name); if (c && c.email) to = c.email; } catch (e) {} }
                window.location.href = 'mailto:' + encodeURIComponent(to || '') + '?subject=' + encodeURIComponent(d.subject || '') + '&body=' + encodeURIComponent(d.body || '');
            };
        });
        box.querySelectorAll('[data-sent]').forEach(function (b) {
            b.onclick = function () {
                var d = draftFrom(b.getAttribute('data-sent'));
                if (!d) return;
                var r = applyActions([{ type: 'log_interaction', contact_name: d.a.contact_name, email: d.a.to_email, kind: 'email_sent', date: today(), summary: d.subject }]);
                d.a.sent = true;
                d.m.applied = (d.m.applied || []).concat(r.results);
                if (r.undo && !(d.m.undoKey && undoStore[d.m.undoKey])) { d.m.undoKey = uid('u_'); undoStore[d.m.undoKey] = r.undo; }
                upsertThread(d.th); renderThread();
            };
        });
        box.querySelectorAll('.wv-draft-body').forEach(function (el) {
            var fit = function () { el.style.height = 'auto'; el.style.height = (el.scrollHeight + 2) + 'px'; };
            fit(); el.addEventListener('input', fit);
        });
        box.querySelectorAll('.wv-draft-subject, .wv-draft-body').forEach(function (el) {
            el.onchange = function () {
                var th = currentThread(), m = th && th.messages[+el.getAttribute('data-m')], a = m && m.actions[+el.getAttribute('data-a')];
                if (!a) return;
                if (el.classList.contains('wv-draft-subject')) a.subject = el.value; else a.body = el.value;
                upsertThread(th);
            };
        });
    }

    // ---------- sending ----------
    window.wvSend = async function () {
        var input = $('wv-input'), u = user();
        if (!input || !u || state.busy) return;
        var text = input.value.trim();
        if (!text) { input.focus(); return; }

        var th = currentThread();
        if (!th) { th = { id: uid('t_'), title: text.slice(0, 60), messages: [] }; state.threadId = th.id; }
        var history = th.messages.filter(function (m) { return !m.error; }).slice(-8).map(function (m) { return { role: m.role, content: m.content }; });
        th.messages.push({ role: 'user', content: text });
        upsertThread(th);
        input.value = ''; autoGrow();
        state.busy = true; setBusy(true); renderThread();

        var src = activeSources();
        var reply;
        try {
            var res = await fetch('/api/assistant/chat', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: timeout(90000),
                body: JSON.stringify({ userId: u.id, message: text, history: history, sources: src, network: (src.indexOf('network') !== -1 || src.indexOf('followups') !== -1) ? buildNetwork() : null, profile: { name: firstName(), accountType: u.accountType || null } })
            });
            var data = await res.json().catch(function () { return {}; });
            if (!res.ok) {
                reply = { role: 'assistant', error: true, content: data.error || 'The assistant could not answer that. Try again in a moment.' };
                if (res.status === 402) reply.upgrade = true;
            }
            else {
                var actions = data.actions || [];
                var applied = applyActions(actions.filter(function (a) { return a.type === 'log_interaction' || a.type === 'update_contact'; }));
                reply = { role: 'assistant', content: data.reply || '', actions: actions, applied: applied.results };
                if (applied.undo) { reply.undoKey = uid('u_'); undoStore[reply.undoKey] = applied.undo; }
            }
        } catch (e) {
            reply = { role: 'assistant', error: true, content: e && e.name === 'AbortError' ? 'That took too long, so I stopped waiting. Try a narrower request.' : 'Could not reach Weaver. Check your connection and try again.' };
        }
        th = threads().find(function (x) { return x.id === th.id; }) || th;
        th.messages.push(reply);
        state.busy = false; setBusy(false);
        upsertThread(th);
        renderThread();
        renderGreeting();
    };

    function setBusy(b) {
        var btn = $('wv-send');
        if (btn) { btn.disabled = b; btn.classList.toggle('is-busy', b); }
    }

    window.wvImprove = async function () {
        var input = $('wv-input');
        var text = input && input.value.trim();
        if (!text) { input && input.focus(); return; }
        var btn = $('wv-improve-btn');
        if (btn) { btn.disabled = true; btn.classList.add('is-busy'); }
        try {
            var res = await fetch('/api/assistant/improve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: text }), signal: timeout(30000) });
            var data = await res.json();
            if (res.ok && data.improved) { input.value = data.improved; autoGrow(); }
            else if (!res.ok && window.wvToast) wvToast(data.error || 'Could not improve the request.', 'error');
        } catch (e) { /* keep the original text */ }
        if (btn) { btn.disabled = false; btn.classList.remove('is-busy'); }
        input.focus();
    };

    window.wvAttachNotes = async function (fileInput) {
        var f = fileInput.files && fileInput.files[0];
        fileInput.value = '';
        if (!f) return;
        var input = $('wv-input');
        var prev = input.value;
        input.value = 'Reading your notes photo…'; input.disabled = true;
        try {
            var fd = new FormData();
            fd.append('image', f);
            var res = await fetch('/api/process-call-notes', { method: 'POST', body: fd, signal: timeout(90000) });
            var data = await res.json();
            input.disabled = false;
            if (!res.ok) { input.value = prev; if (window.wvToast) wvToast(data.error || 'Could not read that photo.', 'error'); return; }
            input.value = (prev ? prev + '\n\n' : 'Log this call with [name] at [firm] on ' + today() + '. My notes:\n') + (data.summary || data.extractedText || '');
            autoGrow(); input.focus();
            var s = input.value.indexOf('[name]');
            if (s !== -1) input.setSelectionRange(s, s + 6);
        } catch (e) {
            input.disabled = false; input.value = prev;
            if (window.wvToast) wvToast('Could not read that photo. Try again.', 'error');
        }
    };

    window.wvToggleSources = function () {
        state.sourcesOpen = !state.sourcesOpen;
        var box = $('wv-sources');
        if (box) box.classList.toggle('is-collapsed', !state.sourcesOpen);
        var btn = $('wv-sources-btn');
        if (btn) btn.setAttribute('aria-expanded', state.sourcesOpen ? 'true' : 'false');
    };

    window.wvNewChat = function () {
        state.threadId = null;
        goToAssistant();
        renderThread(); renderThreadList(); renderGreeting();
        var i = $('wv-input'); if (i) { i.value = ''; i.focus(); }
    };

    window.wvShowHome = function () { renderThread(); renderGreeting(); };

    // ---------- Library ----------
    // Two tabs: "Default" (Weaver's built-in prompts) and "Custom" (prompts the user writes).
    // Custom prompts are stored in this browser, per account.
    function libTabKey() { var u = user(); return 'weaver_library_tab_' + (u ? u.id : 'anon'); }
    function customPrompts() {
        var list = load(customWorkflowsKey(), []);
        if (!Array.isArray(list)) return [];
        var changed = false;
        list = list.filter(function (w) { return w && typeof w.prompt === 'string' && w.prompt.trim(); }).map(function (w) {
            if (!w.id) { changed = true; w.id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
            return { id: String(w.id).slice(0, 40), title: String(w.title || 'Untitled prompt').slice(0, 80), desc: String(w.desc || '').slice(0, 160), prompt: String(w.prompt).slice(0, 4000) };
        });
        if (changed) store(customWorkflowsKey(), list);
        return list;
    }
    function runCustom(id) {
        var w = customPrompts().find(function (x) { return x.id === id; });
        if (!w) return;
        goToAssistant();
        var input = $('wv-input');
        input.value = w.prompt;
        autoGrow();
        input.focus();
        var s = w.prompt.indexOf('['), e = w.prompt.indexOf(']', s);
        if (s !== -1 && e !== -1) input.setSelectionRange(s, e + 1);
    }

    var libEditing = null; // id of the custom prompt being edited, or 'new'

    window.wvRenderLibrary = function () {
        var box = $('wv-library');
        if (!box) return;
        var tab = load(libTabKey(), 'default') === 'custom' ? 'custom' : 'default';
        var mine = customPrompts();
        var html = '<div class="wv-tabs" role="tablist" aria-label="Library">' +
            '<button type="button" role="tab" class="wv-tab' + (tab === 'default' ? ' is-active' : '') + '" aria-selected="' + (tab === 'default') + '" data-tab="default">Default</button>' +
            '<button type="button" role="tab" class="wv-tab' + (tab === 'custom' ? ' is-active' : '') + '" aria-selected="' + (tab === 'custom') + '" data-tab="custom">Custom' + (mine.length ? ' <span class="wv-tab-count">' + mine.length + '</span>' : '') + '</button>' +
            '</div><div class="wv-tabpanel" role="tabpanel">';

        if (tab === 'default') {
            var groups = {};
            workflowsFor(!!state.club).forEach(function (w) { (groups[w.group] = groups[w.group] || []).push(w); });
            Object.keys(groups).forEach(function (g) {
                html += '<div class="wv-lib-group"><h2>' + esc(g) + '</h2><ul class="wv-wf-list">' + groups[g].map(function (w) {
                    return '<li class="wv-wf-row"><button type="button" class="wv-wf" data-wf="' + esc(w.title) + '"><span class="wv-wf-name">' + esc(w.title) + '</span><span class="wv-wf-desc">' + esc(w.desc) + '</span></button>' +
                        '<button type="button" class="wv-linkbtn" data-copyto="' + esc(w.title) + '" title="Copy to Custom and edit">Customize</button></li>';
                }).join('') + '</ul></div>';
            });
        } else {
            var editing = libEditing === 'new' ? { id: 'new', title: '', desc: '', prompt: '' } : mine.find(function (w) { return w.id === libEditing; });
            if (editing) {
                html += '<form class="wv-panel wv-prompt-editor" id="wv-prompt-form">' +
                    '<h2 class="wv-panel-title">' + (editing.id === 'new' ? 'New prompt' : 'Edit prompt') + '</h2>' +
                    '<label class="wv-field"><span>Name</span><input id="wv-pe-title" required maxlength="80" value="' + esc(editing.title) + '" placeholder="Monday outreach plan"></label>' +
                    '<label class="wv-field"><span>Short description <em class="wv-optional">optional</em></span><input id="wv-pe-desc" maxlength="160" value="' + esc(editing.desc) + '" placeholder="Who to email this week, with drafts"></label>' +
                    '<label class="wv-field"><span>Prompt</span><textarea id="wv-pe-prompt" required maxlength="4000" rows="7" placeholder="Who should I follow up with at [firm] this week? Draft the two most important emails.">' + esc(editing.prompt) + '</textarea></label>' +
                    '<p class="wv-muted wv-pe-hint">Put anything that changes each time in [square brackets]. Weaver selects the first one so you can type over it.</p>' +
                    '<div class="wv-pe-actions"><button type="submit" class="wv-btn wv-btn-primary">Save prompt</button><button type="button" class="wv-btn" id="wv-pe-cancel">Cancel</button></div></form>';
            } else {
                html += '<div class="wv-custom-head"><p class="wv-muted">Prompts you write yourself. They are saved in this browser for your account.</p><button type="button" class="wv-btn wv-btn-primary" id="wv-pe-new">New prompt</button></div>';
                html += mine.length ? '<ul class="wv-wf-list wv-wf-single">' + mine.map(function (w) {
                    return '<li class="wv-wf-row"><button type="button" class="wv-wf" data-custom="' + esc(w.id) + '"><span class="wv-wf-name">' + esc(w.title) + '</span><span class="wv-wf-desc">' + esc(w.desc || w.prompt) + '</span></button>' +
                        '<button type="button" class="wv-linkbtn" data-edit="' + esc(w.id) + '">Edit</button><button type="button" class="wv-linkbtn" data-del="' + esc(w.id) + '">Delete</button></li>';
                }).join('') + '</ul>' : '<div class="wv-empty"><h2>No custom prompts yet</h2><p>Write a request you use often, or open the Default tab and choose Customize on one of Weaver’s prompts.</p></div>';
            }
        }
        html += '</div>';

        var th = threads();
        html += '<div class="wv-lib-group wv-lib-history" id="wv-lib-history"><h2>Past chats</h2>' + (th.length ? '<ul class="wv-hist">' + th.map(function (t) {
            return '<li><button type="button" class="wv-thread-open" data-id="' + esc(t.id) + '">' + esc(t.title) + '</button><span class="wv-muted">' + new Date(t.updatedAt || Date.now()).toLocaleDateString() + '</span></li>';
        }).join('') + '</ul>' : '<p class="wv-muted">Your chats with the assistant will be listed here.</p>') + '</div>';
        box.innerHTML = html;

        box.querySelectorAll('[data-tab]').forEach(function (b) {
            b.onclick = function () { store(libTabKey(), b.getAttribute('data-tab')); libEditing = null; window.wvRenderLibrary(); };
        });
        box.querySelectorAll('[data-wf]').forEach(function (b) { b.onclick = function () { runWorkflow(b.getAttribute('data-wf'), WORKFLOWS); }; });
        box.querySelectorAll('[data-custom]').forEach(function (b) { b.onclick = function () { runCustom(b.getAttribute('data-custom')); }; });
        box.querySelectorAll('[data-copyto]').forEach(function (b) {
            b.onclick = function () {
                var w = WORKFLOWS.find(function (x) { return x.title === b.getAttribute('data-copyto'); });
                if (!w) return;
                var list = customPrompts();
                var copy = { id: 'c' + Date.now().toString(36), title: w.title + ' (my version)', desc: w.desc, prompt: w.prompt };
                list.unshift(copy);
                store(customWorkflowsKey(), list.slice(0, 60));
                store(libTabKey(), 'custom');
                libEditing = copy.id;
                window.wvRenderLibrary();
            };
        });
        box.querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { libEditing = b.getAttribute('data-edit'); window.wvRenderLibrary(); }; });
        box.querySelectorAll('[data-del]').forEach(function (b) {
            b.onclick = function () {
                var id = b.getAttribute('data-del');
                store(customWorkflowsKey(), customPrompts().filter(function (w) { return w.id !== id; }));
                if (typeof wvToast === 'function') wvToast('Prompt deleted.', 'info');
                window.wvRenderLibrary();
            };
        });
        box.querySelectorAll('.wv-thread-open').forEach(function (b) { b.onclick = function () { openThread(b.getAttribute('data-id')); }; });
        var nb = $('wv-pe-new');
        if (nb) nb.onclick = function () { libEditing = 'new'; window.wvRenderLibrary(); var t = $('wv-pe-title'); if (t) t.focus(); };
        var cancel = $('wv-pe-cancel');
        if (cancel) cancel.onclick = function () { libEditing = null; window.wvRenderLibrary(); };
        var form = $('wv-prompt-form');
        if (form) form.onsubmit = function (e) {
            e.preventDefault();
            var t = $('wv-pe-title').value.trim(), d = $('wv-pe-desc').value.trim(), p = $('wv-pe-prompt').value.trim();
            if (!t || !p) return;
            var list = customPrompts();
            if (libEditing === 'new') list.unshift({ id: 'c' + Date.now().toString(36), title: t, desc: d, prompt: p });
            else list = list.map(function (w) { return w.id === libEditing ? { id: w.id, title: t, desc: d, prompt: p } : w; });
            store(customWorkflowsKey(), list.slice(0, 60));
            libEditing = null;
            if (typeof wvToast === 'function') wvToast('Prompt saved.', 'success');
            window.wvRenderLibrary();
        };
    };

    // ---------- workspace (club / school) ----------
    var VERIFIED = '<svg class="wv-verified" width="14" height="14" viewBox="0 0 24 24" role="img" aria-label="Verified club"><title>Verified by Weaver</title><path fill="currentColor" d="M12 1.5l2.6 1.9 3.2-.2 1 3.1 2.7 1.8-.9 3.1.9 3.1-2.7 1.8-1 3.1-3.2-.2L12 22.5l-2.6-1.9-3.2.2-1-3.1-2.7-1.8.9-3.1-.9-3.1 2.7-1.8 1-3.1 3.2.2z"/><path d="M8 12.2l2.6 2.6L16.2 9" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    window.wvVerifiedIcon = VERIFIED;

    // Club switcher: members of several clubs switch between them, like switching accounts.
    function closeSwitcher() { var m = $('wv-club-switcher'); if (m) m.remove(); document.removeEventListener('click', outside, true); }
    function outside(e) { var m = $('wv-club-switcher'); if (m && !m.contains(e.target) && !($('wv-workspace') || {}).contains(e.target)) closeSwitcher(); }
    window.wvOpenClubSwitcher = function (ev) {
        if (ev) ev.stopPropagation();
        if ($('wv-club-switcher')) { closeSwitcher(); return; }
        var orgs = state.orgs || [], cur = state.club;
        var card = $('wv-workspace');
        var m = document.createElement('div');
        m.id = 'wv-club-switcher'; m.className = 'wv-switcher'; m.setAttribute('role', 'menu');
        m.innerHTML = (orgs.length ? '<div class="wv-switcher-label">Switch club</div>' + orgs.map(function (o) {
            var on = cur && o.id === cur.id;
            return '<button type="button" role="menuitemradio" aria-checked="' + (on ? 'true' : 'false') + '" class="wv-switcher-item' + (on ? ' is-on' : '') + '" data-org="' + esc(o.id) + '">' +
                '<span class="wv-ws-mark">' + esc(String(o.name).trim().charAt(0).toUpperCase()) + '</span>' +
                '<span class="wv-switcher-text"><span class="wv-switcher-name">' + esc(o.name) + (o.verified ? VERIFIED : '') + '</span><span class="wv-switcher-sub">' + esc(o.school || (o.role === 'member' ? 'Member' : o.role === 'owner' ? 'Owner' : 'Admin')) + '</span></span>' +
                (on ? '<svg class="wv-switcher-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12l5 5 9-10"/></svg>' : '') + '</button>';
        }).join('') : '<p class="wv-switcher-empty">You’re not in a club yet.</p>') +
            '<button type="button" role="menuitem" class="wv-switcher-item wv-switcher-join" data-join="1"><span class="wv-ws-mark">+</span><span class="wv-switcher-text"><span class="wv-switcher-name">Join or create a club</span></span></button>';
        card.parentNode.insertBefore(m, card);
        m.querySelectorAll('[data-org]').forEach(function (b) {
            b.onclick = function () {
                var id = b.getAttribute('data-org');
                if (typeof updateCurrentUserFields === 'function') updateCurrentUserFields({ primaryOrgId: id });
                closeSwitcher();
                loadWorkspace().then(function () {
                    var active = document.querySelector('#app-container .section.active');
                    if (active && active.id === 'club' && window.renderClubView) window.renderClubView();
                    if (active && active.id === 'console') { var l = document.querySelector('.nav-link[href="#console"]'); if (l) l.click(); }
                    if (window.wvToast) wvToast('Switched to ' + ((state.club && state.club.name) || 'your club') + '.', 'info');
                });
            };
        });
        var j = m.querySelector('[data-join]');
        if (j) j.onclick = function () { closeSwitcher(); var l = document.querySelector('.nav-link[href="#club"]'); if (l) l.click(); };
        setTimeout(function () { document.addEventListener('click', outside, true); }, 0);
        var first = m.querySelector('button'); if (first) first.focus();
        m.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeSwitcher(); card.focus(); } });
    };
    window.wvReloadWorkspace = function () { return loadWorkspace(); };
    async function loadWorkspace() {
        var u = user();
        if (!u) return;
        try {
            var res = await fetch('/api/orgs/mine?userId=' + encodeURIComponent(u.id), { signal: timeout(8000) });
            var data = await res.json();
            var orgs = (data && data.orgs) || [];
            state.orgs = orgs;
            state.club = orgs.find(function (o) { return o.id === u.primaryOrgId; }) || orgs[0] || null;
        } catch (e) { state.club = null; state.orgs = []; }
        var name = $('wv-ws-name'), sub = $('wv-ws-sub'), mark = $('wv-ws-mark');
        if (state.club) {
            if (name) name.innerHTML = esc(state.club.name) + (state.club.verified ? VERIFIED : '');
            if (sub) sub.textContent = state.club.school || (state.club.role === 'member' ? 'Club member' : 'Club ' + state.club.role);
            if (mark) mark.textContent = String(state.club.name).trim().charAt(0).toUpperCase();
        } else {
            if (name) name.textContent = 'Personal workspace';
            if (sub) sub.textContent = 'Join a club to share a workspace';
            if (mark) mark.textContent = (firstName() || 'W').charAt(0).toUpperCase();
        }
        renderSources(); renderWorkflows();
    }

    // ---------- composer behavior ----------
    function autoGrow() {
        var i = $('wv-input');
        if (!i) return;
        i.style.height = 'auto';
        i.style.height = Math.min(i.scrollHeight, 260) + 'px';
    }

    function bindComposer() {
        var i = $('wv-input');
        if (!i || i.dataset.bound) return;
        i.dataset.bound = '1';
        i.addEventListener('input', autoGrow);
        i.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); window.wvSend(); }
        });
    }

    window.renderAssistantHome = function () {
        if (!user()) return;
        bindComposer();
        renderGreeting();
        renderSources();
        renderWorkflows();
        renderThreadList();
        renderThread();
        loadWorkspace();
    };

    function init() {
        if (user()) window.renderAssistantHome();
        var box = $('wv-sources');
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

    // Re-render when the app is entered (login, onboarding) without a reload.
    var _show = window.showAppView;
    if (typeof _show === 'function') {
        window.showAppView = function () { _show.apply(this, arguments); setTimeout(window.renderAssistantHome, 0); };
    }
})();
