/* ═══════════════════════════════════════════════════════════════════
   WEAVER WORKSPACE — the recruiting operating system around the assistant.
     Console     club owners/admins: members, activity, shared outcomes,
                 invites, billing (career centers use the same console)
     Review      tabular review of contacts: data columns + AI columns,
                 every AI answer shows the note or email it came from
     Documents   ready-to-use briefs, emails and reports from your notes
     Checklists  expert templates (Superday, coffee chats, timelines)
     Outcomes    interviews and offers, shared with your club only if you choose
     Plan        allowance, usage and billing in Settings
   Everything is stored server-side and scoped to the signed-in user.
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
    function toast(msg, kind) { if (window.wvToast) window.wvToast(msg, kind); }
    function signal(ms) { try { return typeof weaverTimeoutSignal === 'function' ? weaverTimeoutSignal(ms) : undefined; } catch (e) { return undefined; } }
    function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
    function niceDate(d) {
        if (!d) return '';
        var x = new Date(String(d).length === 10 ? d + 'T12:00:00' : d);
        return isNaN(x) ? String(d) : x.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: x.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
    }
    function ago(d) {
        if (!d) return 'Never';
        var days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
        if (days <= 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 30) return days + ' days ago';
        return niceDate(d);
    }

    // JSON API call. Throws an Error with .status/.code and the server's message.
    async function api(method, path, body, ms) {
        var res = await fetch(path, {
            method: method,
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined,
            signal: signal(ms || 20000),
        });
        var data = await res.json().catch(function () { return {}; });
        if (!res.ok) {
            var err = new Error(data.error || 'Something went wrong. Try again.');
            err.status = res.status; err.code = data.code;
            throw err;
        }
        return data;
    }

    function failMessage(e) {
        if (e && e.name === 'AbortError') return 'That took too long. Try again.';
        return (e && e.message) || 'Something went wrong. Try again.';
    }

    // Show an error, and for an exhausted allowance, offer plans.
    function reportError(e) {
        toast(failMessage(e), 'error');
        if (e && e.status === 402 && window.openSubscriptionModal) setTimeout(function () { openSubscriptionModal(failMessage(e)); }, 300);
    }

    function busy(btn, on, label) {
        if (!btn) return;
        if (on) { btn.dataset.label = btn.textContent; btn.textContent = label || 'Working…'; btn.disabled = true; btn.classList.add('is-busy'); }
        else { btn.textContent = btn.dataset.label || btn.textContent; btn.disabled = false; btn.classList.remove('is-busy'); }
    }

    function go(section) {
        var link = document.querySelector('.nav-link[href="#' + section + '"]');
        if (link) link.click();
    }

    function contacts() { try { return getContacts() || []; } catch (e) { return []; } }

    function contactOptions(selected, placeholder) {
        var list = contacts().slice().sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || '')); });
        return '<option value="">' + esc(placeholder || 'Choose a contact') + '</option>' + list.map(function (c) {
            return '<option value="' + esc(c.id) + '"' + (String(selected) === String(c.id) ? ' selected' : '') + '>' + esc(c.name) + (c.firm ? ' (' + esc(c.firm) + ')' : '') + '</option>';
        }).join('');
    }

    function empty(title, text, actionHtml) {
        return '<div class="wv-empty"><h2>' + esc(title) + '</h2><p>' + esc(text) + '</p>' + (actionHtml || '') + '</div>';
    }

    function loading(text) { return '<p class="wv-loading">' + esc(text || 'Loading…') + '</p>'; }

    // Make sure local contacts have reached the server before server-side features read them.
    function syncFirst() {
        try { if (typeof syncContactsToBackend === 'function') return syncContactsToBackend(contacts()).catch(function () {}); } catch (e) { /* ignore */ }
        return Promise.resolve();
    }

    // ═══════════════════ roles & navigation ═══════════════════
    var roleApplied = false;
    window.wvApplyRole = function (landHome) {
        var u = user();
        if (!u) return;
        var manager = u.role === 'manager';
        document.querySelectorAll('.wv-manager-only').forEach(function (el) { el.hidden = !manager; });
        document.querySelectorAll('.wv-student-only').forEach(function (el) { el.hidden = manager && u.accountType === 'org'; });
        // Managers start in the console the first time the app opens in a session.
        if (manager && (landHome || !roleApplied)) {
            var active = document.querySelector('.section.active');
            if (landHome || !active || active.id === 'assistant') setTimeout(function () { go('console'); }, 0);
        }
        roleApplied = true;
    };

    var RENDER = {
        console: function () { renderConsole(); },
        review: function () { renderReviews(); },
        documents: function () { renderDocuments(); },
        checklists: function () { renderChecklists(); },
        outcomes: function () { renderOutcomes(); },
    };
    document.addEventListener('click', function (e) {
        var link = e.target.closest && e.target.closest('.nav-link'); // mobile items click the sidebar link
        if (!link) return;
        var id = (link.getAttribute('href') || '').replace('#', '');
        if (RENDER[id]) setTimeout(RENDER[id], 0);
    });

    // ═══════════════════ CONSOLE (managers) ═══════════════════
    var consoleState = { orgId: null, tab: 'members', sort: 'score', dir: -1, data: null };

    async function renderConsole() {
        var root = $('wv-console-root');
        if (!root) return;
        var u = user();
        var managed = (u && u.orgs ? u.orgs : []).filter(function (o) { return o.role === 'owner' || o.role === 'admin'; });
        if (!managed.length) { root.innerHTML = createOrgForm(); bindCreateOrg(); return; }
        if (!consoleState.orgId || !managed.some(function (o) { return o.id === consoleState.orgId; })) consoleState.orgId = managed[0].id;
        root.innerHTML = loading('Loading your club…');
        try {
            consoleState.data = await api('GET', '/api/console/' + encodeURIComponent(consoleState.orgId));
        } catch (e) {
            root.innerHTML = empty('The console didn’t load', failMessage(e), '<button type="button" class="wv-btn" onclick="window.wvRefreshConsole()">Try again</button>');
            return;
        }
        drawConsole(managed);
    }
    window.wvRefreshConsole = renderConsole;

    function createOrgForm() {
        return '<div class="wv-panel wv-narrow">' +
            '<h2 class="wv-panel-title">Set up your workspace</h2>' +
            '<p class="wv-panel-sub">Create a workspace for your club or career center, then invite members with a code.</p>' +
            '<form id="wv-create-org" class="wv-form">' +
            '<label class="wv-field"><span>Name</span><input id="wv-org-name" required maxlength="120" placeholder="BC Finance Society"></label>' +
            '<label class="wv-field"><span>School</span><input id="wv-org-school" maxlength="120" placeholder="Boston College"></label>' +
            '<fieldset class="wv-field"><legend>Type</legend><div class="wv-seg">' +
            '<label><input type="radio" name="wv-org-type" value="club" checked> Club</label>' +
            '<label><input type="radio" name="wv-org-type" value="career_center"> Career center</label></div></fieldset>' +
            '<button type="submit" class="wv-btn wv-btn-primary">Create workspace</button></form></div>';
    }

    function bindCreateOrg() {
        var f = $('wv-create-org');
        if (!f) return;
        f.onsubmit = async function (e) {
            e.preventDefault();
            var btn = f.querySelector('button[type=submit]');
            busy(btn, true, 'Creating…');
            try {
                var type = (f.querySelector('input[name=wv-org-type]:checked') || {}).value || 'club';
                var data = await api('POST', '/api/orgs', { name: $('wv-org-name').value, school: $('wv-org-school').value, orgType: type });
                consoleState.orgId = data.org.id;
                await refreshSessionUser();
                if (window.wvApplyRole) window.wvApplyRole();
                updateSidebarUser();
                renderConsole();
            } catch (err) { busy(btn, false); reportError(err); }
        };
    }

    function statusPill(org) {
        var pills = [];
        pills.push(org.verified ? '<span class="wv-pill wv-pill-ok">Verified</span>' : '<span class="wv-pill wv-pill-warn">Pending verification</span>');
        if (org.license === 'campus') pills.push('<span class="wv-pill wv-pill-ok">Campus license</span>');
        else if (org.planStatus === 'active' || org.planStatus === 'trialing') pills.push('<span class="wv-pill wv-pill-ok">Club plan active</span>');
        else if (org.planStatus === 'past_due') pills.push('<span class="wv-pill wv-pill-warn">Payment due</span>');
        return pills.join(' ');
    }

    function drawConsole(managed) {
        var root = $('wv-console-root');
        var d = consoleState.data, org = d.org, k = d.kpis;
        var html = '';
        html += '<div class="wv-console-head">';
        html += '<div class="wv-console-id">';
        if (managed.length > 1) {
            html += '<select id="wv-console-org" class="wv-select" aria-label="Workspace">' + managed.map(function (o) { return '<option value="' + esc(o.id) + '"' + (o.id === org.id ? ' selected' : '') + '>' + esc(o.name) + '</option>'; }).join('') + '</select>';
        } else {
            html += '<h2 class="wv-console-name">' + esc(org.name) + '</h2>';
        }
        html += '<div class="wv-console-meta">' + (org.school ? esc(org.school) + ' · ' : '') + (org.orgType === 'career_center' ? 'Career center' : 'Club') + ' · you are ' + esc(org.role) + ' ' + statusPill(org) + '</div></div>';
        html += '<div class="wv-console-code"><span class="wv-label">Join code</span><code>' + esc(org.joinCode) + '</code><button type="button" class="wv-btn wv-btn-sm" id="wv-copy-code">Copy</button></div>';
        html += '</div>';
        if (!org.verified) {
            html += '<div class="wv-note wv-note-warn">Weaver verifies each club before members get the free club allowance. Email <a href="mailto:info@studentweaver.com?subject=Verify%20' + encodeURIComponent(org.name) + '">info@studentweaver.com</a> from your school address with your club’s page or adviser contact. Members can join and use Weaver in the meantime.</div>';
        }
        html += '<div class="wv-kpis">' +
            kpi('Members', k.members) +
            kpi('Active, last 30 days', k.active30) +
            kpi('Outreach sent', k.outreach) +
            kpi('Reply rate', k.replyRate + '%') +
            kpi('Calls logged', k.calls) +
            kpi('Offers shared', k.offers) + '</div>';
        var tabs = [['members', 'Members'], ['outcomes', 'Outcomes'], ['invites', 'Invites'], ['billing', 'Billing']];
        html += '<div class="wv-tabs" role="tablist">' + tabs.map(function (t) {
            return '<button type="button" role="tab" class="wv-tab' + (consoleState.tab === t[0] ? ' is-on' : '') + '" aria-selected="' + (consoleState.tab === t[0]) + '" data-tab="' + t[0] + '">' + t[1] + '</button>';
        }).join('') + '<span class="wv-tabs-spacer"></span><button type="button" class="wv-btn wv-btn-sm" id="wv-club-report">Create club report</button></div>';
        html += '<div id="wv-console-tab">' + consoleTab() + '</div>';
        root.innerHTML = html;

        var sel = $('wv-console-org');
        if (sel) sel.onchange = function () { consoleState.orgId = sel.value; renderConsole(); };
        $('wv-copy-code').onclick = function () {
            (navigator.clipboard ? navigator.clipboard.writeText(org.joinCode) : Promise.reject()).then(function () { toast('Join code copied.', 'success'); }).catch(function () { toast('Join code: ' + org.joinCode, 'info'); });
        };
        root.querySelectorAll('.wv-tab').forEach(function (b) {
            b.onclick = function () { consoleState.tab = b.getAttribute('data-tab'); drawConsole(managed); };
        });
        $('wv-club-report').onclick = function () { generateDoc({ kind: 'club_report', orgId: org.id }, $('wv-club-report')); };
        bindConsoleTab(managed);
    }

    function kpi(label, value) {
        return '<div class="wv-kpi"><div class="wv-kpi-value">' + esc(value) + '</div><div class="wv-kpi-label">' + esc(label) + '</div></div>';
    }

    var MEMBER_COLS = [
        ['name', 'Member'], ['status', 'Status'], ['lastActiveAt', 'Last active'], ['contacts', 'Contacts'],
        ['outreach', 'Outreach'], ['replies', 'Replies'], ['calls', 'Calls'], ['score', 'Score'], ['role', 'Role'],
    ];

    function consoleTab() {
        var d = consoleState.data;
        if (consoleState.tab === 'members') {
            var rows = d.members.slice().sort(function (a, b) {
                var k = consoleState.sort, x = a[k], y = b[k];
                if (k === 'lastActiveAt') { x = x ? new Date(x).getTime() : 0; y = y ? new Date(y).getTime() : 0; }
                if (typeof x === 'string') return consoleState.dir * x.localeCompare(y);
                return consoleState.dir * ((x || 0) - (y || 0));
            });
            if (!rows.length) return empty('No members yet', 'Share your join code or send invites. Members appear here as soon as they join.');
            var isOwner = d.org.role === 'owner';
            var h = '<div class="wv-table-scroll"><table class="wv-table"><thead><tr>' + MEMBER_COLS.map(function (c) {
                var on = consoleState.sort === c[0];
                return '<th scope="col"><button type="button" class="wv-sort' + (on ? ' is-on' : '') + '" data-sort="' + c[0] + '">' + c[1] + (on ? (consoleState.dir < 0 ? ' <span aria-hidden="true">▾</span>' : ' <span aria-hidden="true">▴</span>') : '') + '</button></th>';
            }).join('') + '<th scope="col"><span class="wv-sr">Actions</span></th></tr></thead><tbody>';
            rows.forEach(function (m) {
                var me = user() && m.userId === user().id;
                h += '<tr><td><div class="wv-cell-strong">' + esc(m.name) + (me ? ' <span class="wv-muted">(you)</span>' : '') + '</div><div class="wv-cell-sub">' + esc(m.email || '') + '</div></td>' +
                    '<td><span class="wv-status wv-status-' + esc(String(m.status).toLowerCase().replace(/\s+/g, '-')) + '">' + esc(m.status) + '</span></td>' +
                    '<td>' + esc(m.lastActiveAt ? ago(m.lastActiveAt) : 'Never') + '</td>' +
                    '<td class="num">' + m.contacts + '</td><td class="num">' + m.outreach + '</td><td class="num">' + m.replies + '</td><td class="num">' + m.calls + '</td><td class="num"><strong>' + m.score + '</strong></td>' +
                    '<td>' + esc(m.role.charAt(0).toUpperCase() + m.role.slice(1)) + '</td><td class="wv-row-actions">';
                if (m.role !== 'owner' && !me) {
                    if (isOwner) h += '<button type="button" class="wv-linkbtn wv-inline" data-role="' + esc(m.userId) + '" data-to="' + (m.role === 'admin' ? 'member' : 'admin') + '">' + (m.role === 'admin' ? 'Make member' : 'Make admin') + '</button>';
                    if (isOwner || m.role === 'member') h += '<button type="button" class="wv-linkbtn wv-inline wv-danger-link" data-remove="' + esc(m.userId) + '" data-name="' + esc(m.name) + '">Remove</button>';
                }
                h += '</td></tr>';
            });
            return h + '</tbody></table></div><p class="wv-fine">Status: Active means networking activity in the last 14 days; Slowing, 15–30 days; Inactive, more than 30. Members see each other’s activity totals but never each other’s contacts, notes or emails.</p>';
        }
        if (consoleState.tab === 'outcomes') {
            var o = d.outcomes;
            var order = ['applied', 'first_round', 'superday', 'offer', 'accepted'];
            var h2 = '<div class="wv-stage-strip">' + order.map(function (s) { return '<div class="wv-stage"><div class="wv-kpi-value">' + (o.byStage[s] || 0) + '</div><div class="wv-kpi-label">' + esc(o.stages[s]) + '</div></div>'; }).join('') + '</div>';
            h2 += '<p class="wv-fine">' + o.sharingMembers + ' member' + (o.sharingMembers === 1 ? '' : 's') + ' shared outcomes. Students decide what to share; outcomes they keep private never appear here.</p>';
            if (!o.rows.length) return h2 + empty('No shared outcomes yet', 'Ask members to log interviews and offers on their Outcomes page and turn on sharing with the club.');
            h2 += '<div class="wv-table-scroll"><table class="wv-table"><thead><tr><th>Member</th><th>Firm</th><th>Role</th><th>Stage</th><th>Date</th></tr></thead><tbody>' +
                o.rows.map(function (r) { return '<tr><td class="wv-cell-strong">' + esc(r.member) + '</td><td>' + esc(r.firm) + '</td><td>' + esc(r.role || '') + '</td><td>' + esc(r.stageLabel) + '</td><td>' + esc(niceDate(r.date)) + '</td></tr>'; }).join('') +
                '</tbody></table></div>';
            return h2;
        }
        if (consoleState.tab === 'invites') {
            var inv = d.invites;
            return '<div class="wv-panel"><form id="wv-invite-form" class="wv-inline-form"><label class="wv-sr" for="wv-invite-email">Email</label>' +
                '<input id="wv-invite-email" type="email" required placeholder="member@school.edu"><button type="submit" class="wv-btn wv-btn-primary">Send invite</button></form>' +
                '<p class="wv-fine">Invitees receive your join code by email. Anyone with the code (' + esc(d.org.joinCode) + ') can join, so share it only with members.</p></div>' +
                (inv.length ? '<h3 class="wv-h3">Pending invites</h3><ul class="wv-list">' + inv.map(function (i) { return '<li><span>' + esc(i.email) + '</span><span class="wv-muted">Sent ' + esc(ago(i.createdAt)) + '</span></li>'; }).join('') + '</ul>' : '');
        }
        return '<div id="club-billing" class="wv-panel">' + loading('Loading billing…') + '</div>';
    }

    function bindConsoleTab(managed) {
        var box = $('wv-console-tab');
        if (!box) return;
        box.querySelectorAll('[data-sort]').forEach(function (b) {
            b.onclick = function () {
                var k = b.getAttribute('data-sort');
                if (consoleState.sort === k) consoleState.dir = -consoleState.dir; else { consoleState.sort = k; consoleState.dir = (k === 'name' || k === 'role' || k === 'status') ? 1 : -1; }
                box.innerHTML = consoleTab(); bindConsoleTab(managed);
            };
        });
        box.querySelectorAll('[data-role]').forEach(function (b) {
            b.onclick = async function () {
                try { await api('POST', '/api/console/' + encodeURIComponent(consoleState.orgId) + '/members/' + encodeURIComponent(b.getAttribute('data-role')) + '/role', { role: b.getAttribute('data-to') }); renderConsole(); }
                catch (e) { reportError(e); }
            };
        });
        box.querySelectorAll('[data-remove]').forEach(function (b) {
            b.onclick = async function () {
                var ok = await wvConfirm(b.getAttribute('data-name') + ' will be removed from the club. Their own Weaver account and data stay with them.', { title: 'Remove member?', confirmLabel: 'Remove', danger: true });
                if (!ok) return;
                try { await api('DELETE', '/api/console/' + encodeURIComponent(consoleState.orgId) + '/members/' + encodeURIComponent(b.getAttribute('data-remove'))); toast('Member removed.', 'success'); renderConsole(); }
                catch (e) { reportError(e); }
            };
        });
        var form = $('wv-invite-form');
        if (form) form.onsubmit = async function (e) {
            e.preventDefault();
            var btn = form.querySelector('button');
            busy(btn, true, 'Sending…');
            try {
                var r = await api('POST', '/api/orgs/' + encodeURIComponent(consoleState.orgId) + '/invite', { email: $('wv-invite-email').value });
                toast(r.emailed ? 'Invite sent.' : 'Invite saved. Email isn’t set up on this server, so share the join code directly.', r.emailed ? 'success' : 'info');
                renderConsole();
            } catch (err) { busy(btn, false); reportError(err); }
        };
        if (consoleState.tab === 'billing' && window.loadClubBilling) window.loadClubBilling(consoleState.orgId);
    }

    // ═══════════════════ REVIEW (tabular review) ═══════════════════
    var reviewState = { open: null, columns: null };

    var PRESETS = [
        { title: 'Referral readiness', desc: 'Who could refer you, and what to do next with each.', rows: 'withNotes', columns: ['firm', 'last_touch', 'strength', 'referral', 'next_step'] },
        { title: 'Who’s going cold', desc: 'Contacts due for a follow-up, with what to bring up.', rows: 'due', columns: ['firm', 'last_touch', 'status', 'talking_points', 'next_step'] },
        { title: 'Open promises', desc: 'Intros, resumes and follow-ups still outstanding.', rows: 'all', columns: ['firm', 'last_touch', 'open_items'] },
    ];

    function rowsFor(kind) {
        var list = contacts();
        if (kind === 'withNotes') return list.filter(function (c) { return (c.notes || []).length; });
        if (kind === 'due') {
            return list.filter(function (c) {
                var dates = (c.emails || []).map(function (e) { return e.date; }).concat((c.notes || []).map(function (n) { return n.date; })).filter(Boolean).sort();
                if (!dates.length) return false;
                var days = Math.floor((Date.now() - new Date(dates[dates.length - 1]).getTime()) / 86400000);
                var est = (c.notes || []).length || (c.emails || []).some(function (e) { return e.direction === 'received'; });
                return days >= (est ? 90 : 12);
            });
        }
        if (kind === 'vip') return list.filter(function (c) { return c.vip || c.priority === 'high'; });
        return list;
    }

    async function columnsCatalog() {
        if (!reviewState.columns) reviewState.columns = (await api('GET', '/api/reviews/columns')).columns;
        return reviewState.columns;
    }

    async function renderReviews() {
        var root = $('wv-review-root');
        if (!root) return;
        if (reviewState.open) return openReview(reviewState.open);
        root.innerHTML = loading();
        var data;
        try { data = await api('GET', '/api/reviews'); } catch (e) { root.innerHTML = empty('Reviews didn’t load', failMessage(e)); return; }
        var h = '<div class="wv-presets"><h2 class="wv-h3">Start from a template</h2><div class="wv-preset-grid">' + PRESETS.map(function (p, i) {
            return '<button type="button" class="wv-preset" data-preset="' + i + '"><span class="wv-preset-title">' + esc(p.title) + '</span><span class="wv-preset-desc">' + esc(p.desc) + '</span></button>';
        }).join('') + '</div></div>';
        if (data.reviews.length) {
            h += '<h2 class="wv-h3">Your reviews</h2><div class="wv-table-scroll"><table class="wv-table wv-table-click"><thead><tr><th>Title</th><th class="num">Contacts</th><th class="num">Columns</th><th>Updated</th></tr></thead><tbody>' +
                data.reviews.map(function (r) { return '<tr data-open="' + esc(r.id) + '" tabindex="0"><td class="wv-cell-strong">' + esc(r.title) + '</td><td class="num">' + r.rowCount + '</td><td class="num">' + r.columnCount + '</td><td>' + esc(ago(r.updatedAt)) + '</td></tr>'; }).join('') +
                '</tbody></table></div>';
        } else if (!contacts().length) {
            h += empty('Add contacts first', 'A review reads across your contacts. Add a few people, then build a table here.', '<button type="button" class="wv-btn" onclick="var l=document.querySelector(\'.nav-link[href=&quot;#upload-notes&quot;]\'); if(l) l.click();">Add contacts</button>');
        }
        root.innerHTML = h;
        root.querySelectorAll('[data-preset]').forEach(function (b) { b.onclick = function () { reviewBuilder(PRESETS[+b.getAttribute('data-preset')]); }; });
        root.querySelectorAll('[data-open]').forEach(function (tr) {
            var open = function () { openReview(tr.getAttribute('data-open')); };
            tr.onclick = open;
            tr.onkeydown = function (e) { if (e.key === 'Enter') open(); };
        });
    }

    window.wvNewReview = function () { reviewBuilder(null); };

    async function reviewBuilder(preset) {
        var root = $('wv-review-root');
        reviewState.open = null;
        var cols;
        try { cols = await columnsCatalog(); } catch (e) { reportError(e); return; }
        var u = user();
        var limit = (u && u.plan && u.plan.reviewRows) || 10;
        var chosenCols = preset ? preset.columns : ['firm', 'last_touch', 'strength', 'next_step'];
        var rowKind = preset ? preset.rows : 'all';
        var list = contacts().slice().sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || '')); });
        var pre = rowsFor(rowKind).slice(0, limit).map(function (c) { return String(c.id); });

        var h = '<div class="wv-panel wv-builder"><div class="wv-builder-head"><h2 class="wv-panel-title">' + (preset ? esc(preset.title) : 'New review') + '</h2>' +
            '<button type="button" class="wv-linkbtn" id="wv-rb-cancel">Cancel</button></div>';
        h += '<label class="wv-field"><span>Title</span><input id="wv-rb-title" maxlength="200" value="' + esc(preset ? preset.title : 'Review, ' + niceDate(today())) + '"></label>';
        h += '<div class="wv-builder-cols"><div><h3 class="wv-h4">Rows</h3><div class="wv-seg wv-seg-quiet" id="wv-rb-filter">' +
            [['all', 'All'], ['vip', 'VIP and high priority'], ['due', 'Follow-up due'], ['withNotes', 'Has call notes']].map(function (f) {
                return '<button type="button" data-f="' + f[0] + '" class="' + (f[0] === rowKind ? 'is-on' : '') + '">' + f[1] + '</button>';
            }).join('') + '</div>' +
            '<input type="search" id="wv-rb-search" class="wv-search" placeholder="Search contacts" aria-label="Search contacts">' +
            '<div class="wv-pick" id="wv-rb-rows">' + (list.length ? list.map(function (c) {
                return '<label class="wv-pick-row" data-name="' + esc(String(c.name || '').toLowerCase() + ' ' + String(c.firm || '').toLowerCase()) + '"><input type="checkbox" value="' + esc(c.id) + '"' + (pre.indexOf(String(c.id)) !== -1 ? ' checked' : '') + '><span>' + esc(c.name) + '</span><span class="wv-muted">' + esc(c.firm || '') + '</span></label>';
            }).join('') : '<p class="wv-muted">No contacts yet.</p>') + '</div>' +
            '<p class="wv-fine" id="wv-rb-count"></p></div>';
        h += '<div><h3 class="wv-h4">Columns</h3><p class="wv-fine">From your data, free.</p>' +
            cols.filter(function (c) { return c.type === 'computed'; }).map(colCheck).join('') +
            '<p class="wv-fine" style="margin-top:14px;">Answered by Weaver from each contact’s notes and emails. Uses your AI allowance.</p>' +
            cols.filter(function (c) { return c.type === 'ai'; }).map(colCheck).join('') +
            '<details class="wv-custom-col"><summary>Add your own question</summary>' +
            '<label class="wv-field"><span>Column name</span><input id="wv-rb-clabel" maxlength="60" placeholder="BC alum?"></label>' +
            '<label class="wv-field"><span>Question for each contact</span><input id="wv-rb-cq" maxlength="300" placeholder="Did this person go to Boston College?"></label></details>' +
            '</div></div>';
        h += '<div class="wv-builder-foot"><button type="button" class="wv-btn wv-btn-primary" id="wv-rb-create">Create and fill table</button></div></div>';
        root.innerHTML = h;

        function colCheck(c) {
            return '<label class="wv-check"><input type="checkbox" value="' + esc(c.key) + '"' + (chosenCols.indexOf(c.key) !== -1 ? ' checked' : '') + '> ' + esc(c.label) + '</label>';
        }
        function updateCount() {
            var n = root.querySelectorAll('#wv-rb-rows input:checked').length;
            var el = $('wv-rb-count');
            el.textContent = n + ' selected. Your plan fills up to ' + limit + ' rows per table.';
            el.classList.toggle('wv-warn-text', n > limit);
        }
        updateCount();
        root.querySelector('#wv-rb-rows') && root.querySelector('#wv-rb-rows').addEventListener('change', updateCount);
        $('wv-rb-search').oninput = function () {
            var q = this.value.trim().toLowerCase();
            root.querySelectorAll('.wv-pick-row').forEach(function (r) { r.hidden = q && r.getAttribute('data-name').indexOf(q) === -1; });
        };
        root.querySelectorAll('#wv-rb-filter button').forEach(function (b) {
            b.onclick = function () {
                root.querySelectorAll('#wv-rb-filter button').forEach(function (x) { x.classList.toggle('is-on', x === b); });
                var ids = rowsFor(b.getAttribute('data-f')).slice(0, limit).map(function (c) { return String(c.id); });
                root.querySelectorAll('#wv-rb-rows input').forEach(function (i) { i.checked = ids.indexOf(i.value) !== -1; });
                updateCount();
            };
        });
        $('wv-rb-cancel').onclick = function () { renderReviews(); };
        $('wv-rb-create').onclick = async function () {
            var btn = this;
            var ids = Array.from(root.querySelectorAll('#wv-rb-rows input:checked')).map(function (i) { return i.value; });
            var columns = Array.from(root.querySelectorAll('.wv-builder-cols .wv-check input:checked')).map(function (i) { return { key: i.value }; });
            var cl = $('wv-rb-clabel').value.trim(), cq = $('wv-rb-cq').value.trim();
            if (cl && cq) columns.push({ key: 'custom', label: cl, question: cq });
            if (!ids.length) { toast('Choose at least one contact.', 'error'); return; }
            if (!columns.length) { toast('Choose at least one column.', 'error'); return; }
            busy(btn, true, 'Creating…');
            try {
                await syncFirst();
                var r = await api('POST', '/api/reviews', { title: $('wv-rb-title').value, contactIds: ids, columns: columns });
                if (r.truncated) toast('Kept the first ' + r.truncated.kept + ' contacts, the limit for your plan.', 'info');
                await openReview(r.review.id, true);
            } catch (e) { busy(btn, false); reportError(e); }
        };
    }

    async function openReview(id, run) {
        var root = $('wv-review-root');
        reviewState.open = id;
        root.innerHTML = loading('Opening review…');
        var data;
        try { data = await api('GET', '/api/reviews/' + encodeURIComponent(id)); }
        catch (e) { reviewState.open = null; root.innerHTML = empty('Review not found', failMessage(e), '<button type="button" class="wv-btn" onclick="window.wvCloseReview()">Back to reviews</button>'); return; }
        drawReview(data.review);
        if (run) fillReview(data.review, false);
    }
    window.wvCloseReview = function () { reviewState.open = null; renderReviews(); };

    function drawReview(r, runningText) {
        var root = $('wv-review-root');
        var hasAi = r.columns.some(function (c) { return c.type === 'ai'; });
        var empties = hasAi && r.rows.some(function (row) { return r.columns.some(function (c) { return c.type === 'ai' && !row.cells[c.key]; }); });
        var h = '<div class="wv-doc-bar"><button type="button" class="wv-linkbtn" onclick="window.wvCloseReview()">All reviews</button></div>';
        h += '<div class="wv-review-head"><h2 class="wv-review-title">' + esc(r.title) + '</h2><div class="wv-review-actions">' +
            (hasAi ? '<button type="button" class="wv-btn wv-btn-primary" id="wv-rv-run">' + (empties ? 'Fill empty cells' : 'Refresh answers') + '</button>' : '') +
            '<button type="button" class="wv-btn" id="wv-rv-csv">Export CSV</button>' +
            '<button type="button" class="wv-btn wv-btn-quiet" id="wv-rv-del">Delete</button></div></div>';
        if (runningText) h += '<p class="wv-running" role="status">' + esc(runningText) + '</p>';
        h += '<div class="wv-table-scroll wv-review-scroll"><table class="wv-table wv-review-table"><thead><tr><th scope="col" class="wv-sticky">Contact</th>' +
            r.columns.map(function (c) { return '<th scope="col">' + esc(c.label) + (c.type === 'ai' ? '<span class="wv-ai-mark" title="Answered by Weaver">AI</span>' : '') + '</th>'; }).join('') + '</tr></thead><tbody>';
        if (!r.rows.length) h += '<tr><td colspan="' + (r.columns.length + 1) + '" class="wv-muted">These contacts are no longer in your network.</td></tr>';
        r.rows.forEach(function (row) {
            h += '<tr><th scope="row" class="wv-sticky wv-cell-strong"><button type="button" class="wv-contact-link" data-contact="' + esc(row.contactId) + '">' + esc(row.name) + '</button></th>';
            r.columns.forEach(function (c) {
                var cell = row.cells[c.key];
                if (!cell) { h += '<td class="wv-cell-empty">' + (runningText ? 'Working…' : 'Not filled') + '</td>'; return; }
                var weak = /^not enough information/i.test(cell.value || '');
                h += '<td' + (weak ? ' class="wv-cell-weak"' : '') + '><div>' + esc(cell.value) + '</div>' + (c.type === 'ai' && cell.source && cell.source !== 'None' ? '<div class="wv-cite">' + esc(cell.source) + '</div>' : '') + '</td>';
            });
            h += '</tr>';
        });
        h += '</tbody></table></div><p class="wv-fine">AI answers come only from what you have logged for each contact, with the source under each answer. Check anything important before acting on it.</p>';
        root.innerHTML = h;
        var run = $('wv-rv-run');
        if (run) run.onclick = function () { fillReview(r, !empties); };
        $('wv-rv-csv').onclick = function () { exportCsv(r); };
        $('wv-rv-del').onclick = async function () {
            if (!(await wvConfirm('“' + r.title + '” will be deleted. Your contacts are not affected.', { title: 'Delete review?', confirmLabel: 'Delete', danger: true }))) return;
            try { await api('DELETE', '/api/reviews/' + encodeURIComponent(r.id)); window.wvCloseReview(); } catch (e) { reportError(e); }
        };
        root.querySelectorAll('[data-contact]').forEach(function (b) { b.onclick = function () { if (typeof showContactDetail === 'function') showContactDetail(b.getAttribute('data-contact')); }; });
    }

    async function fillReview(r, rerun) {
        drawReview(r, 'Reading notes for ' + r.rows.length + ' contact' + (r.rows.length === 1 ? '' : 's') + '…');
        try {
            await syncFirst();
            var res = await api('POST', '/api/reviews/' + encodeURIComponent(r.id) + '/run', { rerun: !!rerun }, 180000);
            if (res.partial) toast(res.partial, 'info');
        } catch (e) { reportError(e); }
        if (reviewState.open === r.id) {
            try { var data = await api('GET', '/api/reviews/' + encodeURIComponent(r.id)); drawReview(data.review); } catch (e) { drawReview(r); }
        }
    }

    function exportCsv(r) {
        var q = function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
        var lines = [['Contact'].concat(r.columns.map(function (c) { return c.label; })).map(q).join(',')];
        r.rows.forEach(function (row) {
            lines.push([row.name].concat(r.columns.map(function (c) { var cell = row.cells[c.key]; return cell ? cell.value + (c.type === 'ai' && cell.source && cell.source !== 'None' ? ' [' + cell.source + ']' : '') : ''; })).map(q).join(','));
        });
        var blob = new Blob([lines.join('\n')], { type: 'text/csv' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = String(r.title || 'review').replace(/[^\w\- ]+/g, '').trim() + '.csv';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }

    // ═══════════════════ DOCUMENTS ═══════════════════
    var docState = { open: null, kinds: null, editing: false };

    async function docKinds() {
        if (!docState.kinds) docState.kinds = (await api('GET', '/api/documents/kinds')).kinds;
        return docState.kinds;
    }

    var KIND_DESC = {
        cold_outreach: 'A short, personal first email to someone you haven’t met. You add the real reason you chose them.',
        coffee_chat_brief: 'Questions to ask, plus a list of what to research yourself before the call.',
        recruiting_plan: 'Your season mapped out: the prep phase, the weeks in the midst, and this week’s moves.',
        thank_you: 'A prompt thank-you that mentions something specific they said.',
        follow_up: 'The right next email for where the relationship stands.',
        referral_request: 'Asks for a referral only when the relationship supports it.',
        firm_brief: 'Everyone you know at one firm, gaps, and your next moves.',
        weekly_report: 'Your week in numbers, who’s going cold, and next week’s plan.',
        club_report: 'Member activity, shared outcomes and actions for leadership.',
    };

    async function renderDocuments() {
        var root = $('wv-documents-root');
        if (!root) return;
        if (docState.open) return openDoc(docState.open);
        root.innerHTML = loading();
        var data, kinds;
        try { var both = await Promise.all([api('GET', '/api/documents'), docKinds()]); data = both[0]; kinds = both[1]; }
        catch (e) { root.innerHTML = empty('Documents didn’t load', failMessage(e)); return; }
        var h = '<div class="wv-presets"><h2 class="wv-h3">Create a document</h2><div class="wv-preset-grid">' + kinds.map(function (k) {
            return '<button type="button" class="wv-preset" data-kind="' + esc(k.key) + '"><span class="wv-preset-title">' + esc(k.label) + '</span><span class="wv-preset-desc">' + esc(KIND_DESC[k.key] || '') + '</span></button>';
        }).join('') + '</div></div>';
        if (data.documents.length) {
            h += '<h2 class="wv-h3">Recent</h2><div class="wv-table-scroll"><table class="wv-table wv-table-click"><thead><tr><th>Title</th><th>Type</th><th>Updated</th></tr></thead><tbody>' +
                data.documents.map(function (d) { return '<tr data-doc="' + esc(d.id) + '" tabindex="0"><td class="wv-cell-strong">' + esc(d.title) + '</td><td>' + esc(d.kindLabel) + '</td><td>' + esc(ago(d.updatedAt)) + '</td></tr>'; }).join('') +
                '</tbody></table></div>';
        }
        root.innerHTML = h;
        root.querySelectorAll('[data-kind]').forEach(function (b) { b.onclick = function () { docForm(kinds.find(function (k) { return k.key === b.getAttribute('data-kind'); })); }; });
        root.querySelectorAll('[data-doc]').forEach(function (tr) {
            var open = function () { openDoc(tr.getAttribute('data-doc')); };
            tr.onclick = open;
            tr.onkeydown = function (e) { if (e.key === 'Enter') open(); };
        });
    }

    function docForm(kind) {
        var root = $('wv-documents-root');
        if (!kind) return;
        var u = user();
        var managed = (u && u.orgs || []).filter(function (o) { return o.role === 'owner' || o.role === 'admin'; });
        var h = '<div class="wv-panel wv-narrow"><div class="wv-builder-head"><h2 class="wv-panel-title">' + esc(kind.label) + '</h2><button type="button" class="wv-linkbtn" id="wv-df-cancel">Cancel</button></div>' +
            '<p class="wv-panel-sub">' + esc(KIND_DESC[kind.key] || '') + '</p><form id="wv-doc-form" class="wv-form">';
        if (kind.needs === 'contact') h += '<label class="wv-field"><span>Contact</span><select id="wv-df-contact" required>' + contactOptions('', 'Choose a contact') + '</select></label>';
        if (kind.needs === 'firm') h += '<label class="wv-field"><span>Firm</span><input id="wv-df-firm" required maxlength="120" placeholder="Evercore"></label>';
        if (kind.needs === 'plan') h +=
            '<label class="wv-field"><span>Class year</span><select id="wv-df-year"><option>Freshman</option><option selected>Sophomore</option><option>Junior</option><option>Senior</option></select></label>' +
            '<label class="wv-field"><span>What you’re recruiting for</span><input id="wv-df-target" maxlength="120" placeholder="Investment banking summer analyst, NYC"></label>' +
            '<label class="wv-field"><span>Where you are now</span><select id="wv-df-stage"><option>Just starting</option><option selected>Prepping and networking</option><option>Applications open</option><option>Interviewing</option></select></label>' +
            '<label class="wv-field"><span>School <em class="wv-optional">optional</em></span><input id="wv-df-school" maxlength="120" placeholder="Boston College"></label>';
        if (kind.needs === 'org') h += '<label class="wv-field"><span>Club</span><select id="wv-df-org">' + managed.map(function (o) { return '<option value="' + esc(o.id) + '">' + esc(o.name) + '</option>'; }).join('') + '</select></label>';
        h += '<label class="wv-field"><span>Anything to add <em class="wv-optional">optional</em></span><textarea id="wv-df-notes" rows="3" maxlength="500" placeholder="e.g. Mention I’m applying to the RX group. Keep it under 100 words."></textarea></label>' +
            '<button type="submit" class="wv-btn wv-btn-primary">Write it</button></form></div>';
        root.innerHTML = h;
        $('wv-df-cancel').onclick = function () { renderDocuments(); };
        $('wv-doc-form').onsubmit = function (e) {
            e.preventDefault();
            var body = { kind: kind.key, instructions: $('wv-df-notes').value };
            if ($('wv-df-contact')) body.contactId = $('wv-df-contact').value;
            if ($('wv-df-firm')) body.firm = $('wv-df-firm').value;
            if ($('wv-df-org')) body.orgId = $('wv-df-org').value;
            if ($('wv-df-year')) body.plan = { classYear: $('wv-df-year').value, target: $('wv-df-target').value, stage: $('wv-df-stage').value, school: $('wv-df-school').value };
            generateDoc(body, this.querySelector('button[type=submit]'));
        };
    }

    async function generateDoc(body, btn) {
        busy(btn, true, 'Writing…');
        try {
            await syncFirst();
            var r = await api('POST', '/api/documents/generate', body, 90000);
            docState.open = r.document.id;
            docState.editing = false;
            if (!$('documents') || !$('documents').classList.contains('active')) go('documents');
            else openDoc(r.document.id);
        } catch (e) { busy(btn, false); reportError(e); }
    }
    window.wvGenerateDoc = generateDoc;

    async function openDoc(id) {
        var root = $('wv-documents-root');
        docState.open = id;
        root.innerHTML = loading('Opening…');
        var d;
        try { d = (await api('GET', '/api/documents/' + encodeURIComponent(id))).document; }
        catch (e) { docState.open = null; root.innerHTML = empty('Document not found', failMessage(e), '<button type="button" class="wv-btn" onclick="window.wvCloseDoc()">Back to documents</button>'); return; }
        drawDoc(d);
    }
    window.wvCloseDoc = function () { docState.open = null; docState.editing = false; renderDocuments(); };

    function splitEmail(body) {
        var m = String(body || '').match(/^\s*Subject:\s*(.*)\n+([\s\S]*)$/i);
        return m ? { subject: m[1].trim(), body: m[2].trim() } : { subject: '', body: String(body || '') };
    }

    function drawDoc(d) {
        var root = $('wv-documents-root');
        var mdr = window.wvMarkdown || function (t) { return '<p>' + esc(t).replace(/\n/g, '<br>') + '</p>'; };
        var em = d.email ? splitEmail(d.body) : null;
        var h = '<div class="wv-doc-bar"><button type="button" class="wv-linkbtn" onclick="window.wvCloseDoc()">All documents</button>' +
            '<div class="wv-doc-actions">' +
            (docState.editing ? '<button type="button" class="wv-btn wv-btn-primary" id="wv-doc-save">Save</button><button type="button" class="wv-btn" id="wv-doc-cancel">Cancel</button>'
                : (d.email ? '<button type="button" class="wv-btn wv-btn-primary" id="wv-doc-mail">Open in email</button>' : '') +
                  '<button type="button" class="wv-btn" id="wv-doc-copy">Copy</button>' +
                  '<button type="button" class="wv-btn" id="wv-doc-edit">Edit</button>' +
                  '<button type="button" class="wv-btn" id="wv-doc-print">Print or save PDF</button>' +
                  '<button type="button" class="wv-btn wv-btn-quiet" id="wv-doc-del">Delete</button>') +
            '</div></div>';
        h += '<article class="wv-doc" id="wv-doc-print-area"><div class="wv-doc-kind">' + esc(d.kindLabel) + ' · ' + esc(niceDate(d.updatedAt)) + '</div>';
        if (docState.editing) {
            h += '<input class="wv-doc-title-input" id="wv-doc-title" value="' + esc(d.title) + '" aria-label="Title">' +
                '<textarea class="wv-doc-editor" id="wv-doc-body" aria-label="Document text">' + esc(d.body) + '</textarea>';
        } else {
            h += '<h1 class="wv-doc-title">' + esc(d.title) + '</h1>';
            if (em) h += (em.subject ? '<div class="wv-doc-subject"><span class="wv-label">Subject</span> ' + esc(em.subject) + '</div>' : '') + '<div class="wv-doc-body wv-doc-email">' + esc(em.body).replace(/\n/g, '<br>') + '</div>';
            else h += '<div class="wv-doc-body wv-ai-body">' + mdr(d.body) + '</div>';
        }
        h += '</article><p class="wv-fine">Written from your notes. Read it through and adjust anything before you send or share it.</p>';
        root.innerHTML = h;

        if (docState.editing) {
            var ed = $('wv-doc-body');
            var fit = function () { ed.style.height = 'auto'; ed.style.height = Math.max(320, ed.scrollHeight + 4) + 'px'; };
            fit(); ed.addEventListener('input', fit);
            $('wv-doc-cancel').onclick = function () { docState.editing = false; drawDoc(d); };
            $('wv-doc-save').onclick = async function () {
                var btn = this; busy(btn, true, 'Saving…');
                try { var r = await api('PUT', '/api/documents/' + encodeURIComponent(d.id), { title: $('wv-doc-title').value, body: ed.value }); docState.editing = false; drawDoc(r.document); toast('Saved.', 'success'); }
                catch (e) { busy(btn, false); reportError(e); }
            };
            return;
        }
        $('wv-doc-edit').onclick = function () { docState.editing = true; drawDoc(d); };
        $('wv-doc-copy').onclick = function () {
            var text = em ? (em.subject ? 'Subject: ' + em.subject + '\n\n' : '') + em.body : d.body;
            (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { toast('Copied.', 'success'); }).catch(function () { toast('Could not copy automatically. Select the text and copy it.', 'error'); });
        };
        $('wv-doc-print').onclick = function () { document.body.classList.add('wv-printing-doc'); window.print(); setTimeout(function () { document.body.classList.remove('wv-printing-doc'); }, 500); };
        var mail = $('wv-doc-mail');
        if (mail) mail.onclick = function () {
            var to = '';
            try { var c = contacts().find(function (x) { return String(x.id) === String(d.contactId); }); if (c && c.email) to = c.email; } catch (e) { /* ignore */ }
            window.location.href = 'mailto:' + encodeURIComponent(to) + '?subject=' + encodeURIComponent(em.subject) + '&body=' + encodeURIComponent(em.body);
        };
        $('wv-doc-del').onclick = async function () {
            if (!(await wvConfirm('“' + d.title + '” will be deleted.', { title: 'Delete document?', confirmLabel: 'Delete', danger: true }))) return;
            try { await api('DELETE', '/api/documents/' + encodeURIComponent(d.id)); window.wvCloseDoc(); } catch (e) { reportError(e); }
        };
    }

    // ═══════════════════ CHECKLISTS ═══════════════════
    var ckState = { open: null, saveTimer: null };

    async function renderChecklists() {
        var root = $('wv-checklists-root');
        if (!root) return;
        if (ckState.open) return openChecklist(ckState.open);
        root.innerHTML = loading();
        var data, tpl;
        try { var both = await Promise.all([api('GET', '/api/checklists'), api('GET', '/api/checklists/templates')]); data = both[0]; tpl = both[1]; }
        catch (e) { root.innerHTML = empty('Checklists didn’t load', failMessage(e)); return; }
        var h = '';
        if (data.checklists.length) {
            h += '<h2 class="wv-h3">Your checklists</h2><ul class="wv-ck-list">' + data.checklists.map(function (c) {
                var pct = c.total ? Math.round(c.done / c.total * 100) : 0;
                return '<li><button type="button" class="wv-ck-open" data-ck="' + esc(c.id) + '"><span class="wv-cell-strong">' + esc(c.title) + '</span>' +
                    '<span class="wv-progress" aria-label="' + c.done + ' of ' + c.total + ' done"><span style="width:' + pct + '%"></span></span><span class="wv-muted">' + c.done + ' of ' + c.total + '</span></button></li>';
            }).join('') + '</ul>';
        }
        h += '<div class="wv-presets"><h2 class="wv-h3">' + (data.checklists.length ? 'Start another' : 'Start from a template') + '</h2><div class="wv-preset-grid">' + tpl.templates.map(function (t) {
            return '<button type="button" class="wv-preset" data-tpl="' + esc(t.key) + '"><span class="wv-preset-title">' + esc(t.title) + '</span><span class="wv-preset-desc">' + esc(t.description) + ' ' + t.count + ' steps.</span></button>';
        }).join('') + '<button type="button" class="wv-preset" data-tpl=""><span class="wv-preset-title">Blank checklist</span><span class="wv-preset-desc">Your own steps.</span></button></div></div>';
        root.innerHTML = h;
        root.querySelectorAll('[data-ck]').forEach(function (b) { b.onclick = function () { openChecklist(b.getAttribute('data-ck')); }; });
        root.querySelectorAll('[data-tpl]').forEach(function (b) {
            b.onclick = async function () {
                try { var r = await api('POST', '/api/checklists', { templateKey: b.getAttribute('data-tpl') }); openChecklist(r.checklist.id, r.checklist); }
                catch (e) { reportError(e); }
            };
        });
    }

    async function openChecklist(id, preloaded) {
        var root = $('wv-checklists-root');
        ckState.open = id;
        var c = preloaded;
        if (!c) {
            root.innerHTML = loading('Opening…');
            try { c = (await api('GET', '/api/checklists')).checklists.find(function (x) { return x.id === id; }); } catch (e) { c = null; }
            if (!c) { ckState.open = null; renderChecklists(); return; }
        }
        drawChecklist(c);
    }
    window.wvCloseChecklist = function () { ckState.open = null; renderChecklists(); };

    function saveChecklist(c, immediate) {
        clearTimeout(ckState.saveTimer);
        var run = function () { api('PUT', '/api/checklists/' + encodeURIComponent(c.id), { title: c.title, items: c.items }).catch(reportError); };
        if (immediate) run(); else ckState.saveTimer = setTimeout(run, 500);
    }

    function drawChecklist(c) {
        var root = $('wv-checklists-root');
        var done = c.items.filter(function (i) { return i.done; }).length;
        var pct = c.items.length ? Math.round(done / c.items.length * 100) : 0;
        var sections = [];
        c.items.forEach(function (i) { var s = i.section || ''; if (sections.indexOf(s) === -1) sections.push(s); });
        var h = '<div class="wv-doc-bar"><button type="button" class="wv-linkbtn" onclick="window.wvCloseChecklist()">All checklists</button><div class="wv-doc-actions"><button type="button" class="wv-btn wv-btn-quiet" id="wv-ck-del">Delete</button></div></div>';
        h += '<div class="wv-panel wv-ck"><input class="wv-ck-title" id="wv-ck-title" value="' + esc(c.title) + '" aria-label="Checklist title">' +
            '<div class="wv-ck-progress"><span class="wv-progress wv-progress-lg"><span style="width:' + pct + '%"></span></span><span class="wv-muted">' + done + ' of ' + c.items.length + ' done</span></div>';
        sections.forEach(function (s) {
            if (s) h += '<h3 class="wv-h4">' + esc(s) + '</h3>';
            h += '<ul class="wv-ck-items">' + c.items.map(function (i, idx) {
                if ((i.section || '') !== s) return '';
                return '<li class="' + (i.done ? 'is-done' : '') + '"><label><input type="checkbox" data-i="' + idx + '"' + (i.done ? ' checked' : '') + '><span>' + esc(i.text) + '</span></label><button type="button" class="wv-ck-x" data-x="' + idx + '" aria-label="Remove step">' + (window.wvIcon ? wvIcon('trash', 14) : '×') + '</button></li>';
            }).join('') + '</ul>';
        });
        h += '<form id="wv-ck-add" class="wv-inline-form"><label class="wv-sr" for="wv-ck-new">New step</label><input id="wv-ck-new" maxlength="300" placeholder="Add a step"><button type="submit" class="wv-btn">Add</button></form></div>';
        root.innerHTML = h;
        root.querySelectorAll('[data-i]').forEach(function (cb) {
            cb.onchange = function () { c.items[+cb.getAttribute('data-i')].done = cb.checked; saveChecklist(c); drawChecklist(c); };
        });
        root.querySelectorAll('[data-x]').forEach(function (b) {
            b.onclick = function () { c.items.splice(+b.getAttribute('data-x'), 1); saveChecklist(c, true); drawChecklist(c); };
        });
        $('wv-ck-title').onchange = function () { c.title = this.value.trim() || c.title; saveChecklist(c, true); };
        $('wv-ck-add').onsubmit = function (e) {
            e.preventDefault();
            var t = $('wv-ck-new').value.trim();
            if (!t) return;
            var last = c.items.length ? c.items[c.items.length - 1].section : null;
            c.items.push({ id: 'i_' + Date.now().toString(36), text: t, section: last, done: false });
            saveChecklist(c, true); drawChecklist(c);
            setTimeout(function () { var n = $('wv-ck-new'); if (n) n.focus(); }, 0);
        };
        $('wv-ck-del').onclick = async function () {
            if (!(await wvConfirm('“' + c.title + '” will be deleted.', { title: 'Delete checklist?', confirmLabel: 'Delete', danger: true }))) return;
            try { await api('DELETE', '/api/checklists/' + encodeURIComponent(c.id)); window.wvCloseChecklist(); } catch (e) { reportError(e); }
        };
    }

    // ═══════════════════ OUTCOMES ═══════════════════
    var ocState = { editing: null };

    async function renderOutcomes() {
        var root = $('wv-outcomes-root');
        if (!root) return;
        root.innerHTML = loading();
        var data;
        try { data = await api('GET', '/api/outcomes'); } catch (e) { root.innerHTML = empty('Outcomes didn’t load', failMessage(e)); return; }
        var u = user();
        var inClub = !!(u && u.orgs && u.orgs.length);
        var count = function (keys) { return data.outcomes.filter(function (o) { return keys.indexOf(o.stage) !== -1; }).length; };
        var h = '<div class="wv-kpis wv-kpis-3">' + kpi('Applications', count(['applied', 'first_round', 'superday', 'offer', 'accepted', 'declined', 'rejected'])) + kpi('Interviews', count(['first_round', 'superday'])) + kpi('Offers', count(['offer', 'accepted', 'declined'])) + '</div>';
        h += outcomeForm(data.stages, null, inClub);
        if (data.outcomes.length) {
            h += '<div class="wv-table-scroll"><table class="wv-table"><thead><tr><th>Firm</th><th>Role</th><th>Stage</th><th>Date</th>' + (inClub ? '<th>Shared with club</th>' : '') + '<th><span class="wv-sr">Actions</span></th></tr></thead><tbody>' +
                data.outcomes.map(function (o) {
                    return '<tr><td class="wv-cell-strong">' + esc(o.firm) + '</td><td>' + esc(o.role || '') + '</td><td>' + esc(o.stageLabel) + '</td><td>' + esc(niceDate(o.stageDate)) + '</td>' +
                        (inClub ? '<td><label class="wv-switch"><input type="checkbox" data-share="' + esc(o.id) + '"' + (o.shareWithClub ? ' checked' : '') + '><span>' + (o.shareWithClub ? 'Shared' : 'Private') + '</span></label></td>' : '') +
                        '<td class="wv-row-actions"><button type="button" class="wv-linkbtn wv-inline" data-edit="' + esc(o.id) + '">Edit</button><button type="button" class="wv-linkbtn wv-inline wv-danger-link" data-del="' + esc(o.id) + '">Delete</button></td></tr>';
                }).join('') + '</tbody></table></div>';
        } else {
            h += '<p class="wv-fine">Log applications, interviews and offers as they happen. Over time this shows what your networking is turning into.</p>';
        }
        root.innerHTML = h;
        bindOutcomeForm(data, inClub);
        root.querySelectorAll('[data-share]').forEach(function (cb) {
            cb.onchange = async function () {
                var o = data.outcomes.find(function (x) { return x.id === cb.getAttribute('data-share'); });
                try { await api('PUT', '/api/outcomes/' + encodeURIComponent(o.id), Object.assign({}, o, { shareWithClub: cb.checked })); renderOutcomes(); }
                catch (e) { cb.checked = !cb.checked; reportError(e); }
            };
        });
        root.querySelectorAll('[data-edit]').forEach(function (b) {
            b.onclick = function () {
                ocState.editing = data.outcomes.find(function (x) { return x.id === b.getAttribute('data-edit'); });
                var holder = $('wv-oc-form-holder');
                holder.outerHTML = outcomeForm(data.stages, ocState.editing, inClub);
                bindOutcomeForm(data, inClub);
                $('wv-oc-firm').focus();
            };
        });
        root.querySelectorAll('[data-del]').forEach(function (b) {
            b.onclick = async function () {
                if (!(await wvConfirm('This outcome will be deleted.', { title: 'Delete outcome?', confirmLabel: 'Delete', danger: true }))) return;
                try { await api('DELETE', '/api/outcomes/' + encodeURIComponent(b.getAttribute('data-del'))); renderOutcomes(); } catch (e) { reportError(e); }
            };
        });
    }

    function outcomeForm(stages, o, inClub) {
        o = o || {};
        return '<div class="wv-panel" id="wv-oc-form-holder"><h2 class="wv-panel-title">' + (o.id ? 'Edit outcome' : 'Log an outcome') + '</h2><form id="wv-oc-form" class="wv-form wv-form-grid">' +
            '<label class="wv-field"><span>Firm</span><input id="wv-oc-firm" required maxlength="255" value="' + esc(o.firm || '') + '" placeholder="Evercore"></label>' +
            '<label class="wv-field"><span>Role or group <em class="wv-optional">optional</em></span><input id="wv-oc-role" maxlength="255" value="' + esc(o.role || '') + '" placeholder="Restructuring summer analyst"></label>' +
            '<label class="wv-field"><span>Stage</span><select id="wv-oc-stage" required>' + Object.keys(stages).map(function (k) { return '<option value="' + k + '"' + (o.stage === k ? ' selected' : '') + '>' + esc(stages[k]) + '</option>'; }).join('') + '</select></label>' +
            '<label class="wv-field"><span>Date</span><input id="wv-oc-date" type="date" value="' + esc(o.stageDate || today()) + '" max="' + today() + '"></label>' +
            '<label class="wv-field wv-span-2"><span>Contact who helped <em class="wv-optional">optional</em></span><select id="wv-oc-contact">' + contactOptions(o.contactId || '', 'None') + '</select></label>' +
            (inClub ? '<label class="wv-check wv-span-2"><input type="checkbox" id="wv-oc-share"' + (o.shareWithClub ? ' checked' : '') + '> Share with my club’s leaders <span class="wv-muted">Off by default. Leaders see the firm, role, stage and date, never your notes.</span></label>' : '') +
            '<div class="wv-span-2 wv-form-actions"><button type="submit" class="wv-btn wv-btn-primary">' + (o.id ? 'Save changes' : 'Log outcome') + '</button>' + (o.id ? '<button type="button" class="wv-btn" id="wv-oc-cancel">Cancel</button>' : '') + '</div>' +
            '</form></div>';
    }

    function bindOutcomeForm(data, inClub) {
        var f = $('wv-oc-form');
        if (!f) return;
        var cancel = $('wv-oc-cancel');
        if (cancel) cancel.onclick = function () { ocState.editing = null; renderOutcomes(); };
        f.onsubmit = async function (e) {
            e.preventDefault();
            var btn = f.querySelector('button[type=submit]');
            var body = { firm: $('wv-oc-firm').value, role: $('wv-oc-role').value, stage: $('wv-oc-stage').value, stageDate: $('wv-oc-date').value, contactId: $('wv-oc-contact').value || null, shareWithClub: inClub ? $('wv-oc-share').checked : false };
            busy(btn, true, 'Saving…');
            try {
                if (ocState.editing) await api('PUT', '/api/outcomes/' + encodeURIComponent(ocState.editing.id), Object.assign({}, body, { notes: ocState.editing.notes }));
                else await api('POST', '/api/outcomes', body);
                ocState.editing = null;
                toast('Outcome saved.', 'success');
                renderOutcomes();
            } catch (err) { busy(btn, false); reportError(err); }
        };
    }

    // ═══════════════════ SETTINGS: plan, security, clubs ═══════════════════
    window.wvRenderPlan = async function () {
        var box = $('wv-plan-card');
        if (!box) return;
        box.innerHTML = '<h3 class="settings-card-title">Plan and usage</h3>' + loading();
        var p;
        try { p = await api('GET', '/api/plan'); } catch (e) { box.innerHTML = '<h3 class="settings-card-title">Plan and usage</h3><p class="wv-muted">' + esc(failMessage(e)) + '</p>'; return; }
        var aiPct = p.usage.percentUsed;
        var cPct = p.contacts.limit ? Math.min(100, Math.round(p.contacts.count / p.contacts.limit * 100)) : 0;
        var isPro = p.plan.key === 'pro';
        var interval = { monthly: 'monthly', quarterly: 'quarterly', annual: 'annual' }[p.subscription.interval] || '';
        var h = '<h3 class="settings-card-title">Plan and usage</h3>';
        h += '<div class="wv-plan-row"><div><div class="wv-plan-name">' + esc(p.plan.label) + (isPro && interval ? ' <span class="wv-muted">billed ' + interval + '</span>' : '') + '</div><div class="wv-muted">' + esc(p.plan.summary) + '</div></div>' +
            '<div class="wv-plan-actions">' + (isPro || p.subscription.hasBillingAccount ? '<button type="button" class="wv-btn" onclick="openCustomerPortal()">Manage billing</button>' : '') +
            (!isPro ? '<button type="button" class="wv-btn wv-btn-primary" onclick="openSubscriptionModal()">Upgrade to Pro</button>' : '') + '</div></div>';
        h += meter('AI allowance this month', aiPct + '% used', aiPct, 'Resets ' + niceDate(p.usage.resetsAt) + '.');
        h += meter('Contacts', p.contacts.count + ' of ' + p.contacts.limit, cPct, '');
        if (!isPro && p.subscription.status !== 'free' && p.subscription.status) h += '<p class="wv-fine">Subscription status: ' + esc(p.subscription.status) + '.</p>';
        h += '<p class="wv-fine">Paid but still seeing the wrong plan? <button type="button" class="wv-linkbtn wv-inline" onclick="syncMyPlan()">Refresh plan</button></p>';
        box.innerHTML = h;
    };

    function meter(label, value, pct, note) {
        return '<div class="wv-meter"><div class="wv-meter-top"><span>' + esc(label) + '</span><span class="wv-muted">' + esc(value) + '</span></div>' +
            '<div class="wv-progress wv-progress-lg' + (pct >= 90 ? ' is-high' : '') + '" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="' + esc(label) + '"><span style="width:' + pct + '%"></span></div>' +
            (note ? '<div class="wv-fine">' + esc(note) + '</div>' : '') + '</div>';
    }

    function renderSecurity() {
        var box = $('wv-security-card');
        if (!box || box.dataset.bound) return;
        box.dataset.bound = '1';
        box.innerHTML = '<h3 class="settings-card-title">Password</h3><form id="wv-pw-form" class="wv-form">' +
            '<label class="wv-field"><span>Current password</span><input type="password" id="wv-pw-current" autocomplete="current-password" required></label>' +
            '<label class="wv-field"><span>New password</span><input type="password" id="wv-pw-new" autocomplete="new-password" minlength="8" required><small class="wv-muted">At least 8 characters.</small></label>' +
            '<button type="submit" class="wv-btn">Change password</button></form>';
        $('wv-pw-form').onsubmit = async function (e) {
            e.preventDefault();
            var btn = this.querySelector('button');
            busy(btn, true, 'Saving…');
            try {
                await api('POST', '/api/auth/change-password', { currentPassword: $('wv-pw-current').value, newPassword: $('wv-pw-new').value });
                this.reset();
                toast('Password changed. Other devices have been signed out.', 'success');
            } catch (err) { reportError(err); }
            busy(btn, false);
        };
    }

    function renderClubs() {
        var box = $('wv-clubs-card');
        if (!box) return;
        var u = user();
        var orgs = (u && u.orgs) || [];
        var h = '<h3 class="settings-card-title">Clubs</h3>';
        if (!orgs.length) {
            h += '<p class="wv-muted">You aren’t in a club. Members of a verified club get a free allowance.</p><button type="button" class="wv-btn" onclick="var l=document.querySelector(\'.nav-link[href=&quot;#club&quot;]\'); if(l) l.click();">Join with a code</button>';
        } else {
            h += '<ul class="wv-list">' + orgs.map(function (o) {
                return '<li><span><span class="wv-cell-strong">' + esc(o.name) + '</span> <span class="wv-muted">' + esc(o.role) + (o.verified ? '' : ', pending verification') + '</span></span>' +
                    (o.role !== 'owner' ? '<button type="button" class="wv-linkbtn wv-inline wv-danger-link" onclick="window.wvLeaveClub(\'' + esc(o.id) + '\', \'' + esc(String(o.name).replace(/'/g, '')) + '\')">Leave</button>' : '') + '</li>';
            }).join('') + '</ul>';
        }
        box.innerHTML = h;
    }

    window.wvLeaveClub = async function (orgId, name) {
        if (!(await wvConfirm('You’ll leave ' + name + '. Your contacts and notes stay with you. Shared outcomes will no longer be visible to the club.', { title: 'Leave club?', confirmLabel: 'Leave', danger: true }))) return;
        try {
            await api('POST', '/api/orgs/' + encodeURIComponent(orgId) + '/leave');
            await refreshSessionUser();
            updateSidebarUser();
            if (window.wvApplyRole) window.wvApplyRole();
            renderClubs();
            if (window.renderClubView) window.renderClubView();
            toast('You left ' + name + '.', 'info');
        } catch (e) { reportError(e); }
    };

    window.wvRenderSettingsExtras = function () {
        window.wvRenderPlan();
        renderSecurity();
        renderClubs();
    };

    // ---------- boot ----------
    function init() {
        if (user()) window.wvApplyRole();
        var hash = (window.location.hash || '').replace('#', '');
        if (hash && document.querySelector('.nav-link[href="#' + hash + '"]') && user()) setTimeout(function () { go(hash); }, 50);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
