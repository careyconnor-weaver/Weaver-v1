/* Weaver admin dashboard. Served only to Weaver staff (ADMIN_EMAILS) at /admin;
   everyone else gets "not found", and none of this is part of the public site. */
(function () {
    'use strict';
    function $(id) { return document.getElementById(id); }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function kpi(label, value) { return '<div class="wv-kpi"><div class="wv-kpi-value">' + esc(value) + '</div><div class="wv-kpi-label">' + esc(label) + '</div></div>'; }
    function empty(title, text) { return '<div class="wv-empty"><h2>' + esc(title) + '</h2><p>' + esc(text) + '</p></div>'; }
    function loading(text) { return '<p class="wv-loading">' + esc(text) + '</p>'; }
    function failMessage(e) { return (e && e.message) || 'Something went wrong. Try again.'; }
    async function api(method, path) {
        var res = await fetch(path, { method: method, headers: { Accept: 'application/json' } });
        var data = await res.json().catch(function () { return {}; });
        if (!res.ok) { var err = new Error(res.status === 401 ? 'Your session ended. Sign in on studentweaver.com, then reload this page.' : data.error || 'Something went wrong.'); err.status = res.status; throw err; }
        return data;
    }

    var FEATURE_LABEL = { assistant: 'Assistant', improve: 'Improve prompt', review: 'Review tables', notes_photo: 'Notes from photos', notes_summary: 'Notes summary', detect_firm: 'Firm detection', search: 'Web search' };
    function featureLabel(f) {
        f = String(f || '');
        if (f.indexOf('document:') === 0) return 'Document: ' + f.slice(9).replace(/_/g, ' ');
        return FEATURE_LABEL[f] || f.replace(/_/g, ' ');
    }
    function usd(n) { n = Number(n) || 0; return '$' + (n >= 100 ? n.toFixed(0) : n.toFixed(2)); }
    function pct(a, b) { return b ? Math.round((a / b) * 100) + '%' : '–'; }

    // Sign-ups per week as a small bar chart (last 12 weeks, empty weeks included).
    function weeklyChart(rows) {
        var map = {}; (rows || []).forEach(function (r) { map[r.week] = r.n; });
        var weeks = [], d = new Date();
        var day = (d.getUTCDay() + 6) % 7; // Monday-based, like Postgres date_trunc('week')
        var monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
        for (var i = 11; i >= 0; i--) {
            var w = new Date(monday.getTime() - i * 7 * 86400000);
            var key = w.toISOString().slice(0, 10);
            weeks.push({ key: key, label: w.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), n: map[key] || 0 });
        }
        var max = Math.max(1, Math.max.apply(null, weeks.map(function (w) { return w.n; })));
        var W = 640, H = 170, pad = 26, bw = (W - pad * 2) / weeks.length;
        var bars = weeks.map(function (w, i) {
            var h = Math.round((w.n / max) * (H - 56));
            var x = pad + i * bw + 4, y = H - 28 - h;
            return '<g><title>Week of ' + esc(w.label) + ': ' + w.n + ' sign-up' + (w.n === 1 ? '' : 's') + '</title>' +
                '<rect x="' + x.toFixed(1) + '" y="' + y + '" width="' + (bw - 8).toFixed(1) + '" height="' + Math.max(h, w.n ? 2 : 0) + '" rx="2" class="wv-bar' + (i === weeks.length - 1 ? ' is-current' : '') + '"></rect>' +
                (w.n ? '<text x="' + (x + (bw - 8) / 2).toFixed(1) + '" y="' + (y - 6) + '" class="wv-bar-val">' + w.n + '</text>' : '') +
                (i % 2 === (weeks.length - 1) % 2 ? '<text x="' + (x + (bw - 8) / 2).toFixed(1) + '" y="' + (H - 10) + '" class="wv-bar-label">' + esc(w.label) + '</text>' : '') + '</g>';
        }).join('');
        return '<svg class="wv-chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Sign-ups per week, last 12 weeks">' +
            '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + (H - 28) + '" y2="' + (H - 28) + '" class="wv-axis"></line>' + bars + '</svg>';
    }

    async function renderAdmin() {
        var root = $('wv-admin-root');
        if (!root) return;
        root.innerHTML = loading('Loading usage…');
        var d;
        try { d = await api('GET', '/api/admin/stats'); }
        catch (e) { root.innerHTML = empty('Couldn’t load usage', failMessage(e)); return; }
        var us = d.users, a = d.active, e = d.engagement, total = us.total;
        var h = '';
        h += '<div class="wv-admin-head"><span class="wv-muted">Updated ' + esc(new Date(d.generatedAt).toLocaleString()) + '</span><button type="button" class="wv-btn" id="wv-admin-refresh">Refresh</button></div>';

        h += '<h2 class="wv-admin-h">People</h2><div class="wv-kpis wv-kpis-4">' +
            kpi('Accounts', total) + kpi('Active today', a.daily) + kpi('Active this week', a.weekly) + kpi('Active this month', a.monthly) + '</div>';
        h += '<div class="wv-admin-grid"><div class="wv-panel"><div class="wv-admin-panel-head"><h3>New sign-ups per week</h3><span class="wv-muted">' + us.new_7d + ' this week · ' + us.new_30d + ' in 30 days</span></div>' + weeklyChart(d.weekly) + '</div>' +
            '<div class="wv-panel"><h3>Plans</h3><table class="wv-table wv-table-plain"><tbody>' +
            [['starter', 'Starter (free)'], ['club', 'Club (verified club)'], ['club_plus', 'Club sponsored'], ['pro', 'Pro (paying)']].map(function (p) {
                var n = d.plans[p[0]] || 0;
                return '<tr><th scope="row">' + esc(p[1]) + '</th><td class="num">' + n + '</td><td class="num wv-muted">' + pct(n, total) + '</td></tr>';
            }).join('') + '</tbody></table><p class="wv-muted wv-admin-note">' + us.leaders + ' account' + (us.leaders === 1 ? '' : 's') + ' signed up as a club or career-center leader.</p></div></div>';

        h += '<h2 class="wv-admin-h">What people do</h2><table class="wv-table wv-table-plain wv-admin-funnel"><thead><tr><th>Step</th><th class="num">People</th><th class="num">Of all accounts</th><th class="num">Total</th></tr></thead><tbody>' +
            '<tr><th scope="row">Added at least one contact</th><td class="num">' + e.with_contacts + '</td><td class="num">' + pct(e.with_contacts, total) + '</td><td class="num">' + e.contacts + ' contacts</td></tr>' +
            '<tr><th scope="row">Logged a call or coffee chat</th><td class="num">' + e.logged_calls + '</td><td class="num">' + pct(e.logged_calls, total) + '</td><td class="num">' + e.calls + ' calls</td></tr>' +
            '<tr><th scope="row">Used the AI (last 30 days)</th><td class="num">' + e.used_ai_30d + '</td><td class="num">' + pct(e.used_ai_30d, total) + '</td><td class="num">' + e.documents + ' documents</td></tr>' +
            '<tr><th scope="row">Outreach emails tracked</th><td class="num">–</td><td class="num">–</td><td class="num">' + e.emails_sent + ' sent</td></tr>' +
            '<tr><th scope="row">Outcomes logged</th><td class="num">–</td><td class="num">–</td><td class="num">' + e.outcomes + ' (' + e.offers + ' offer' + (e.offers === 1 ? '' : 's') + ')</td></tr>' +
            '</tbody></table>';

        var ai = d.ai, capTxt = ai.capUsd ? ' of ' + usd(ai.capUsd) + ' cap' : ' (no monthly cap set)';
        h += '<h2 class="wv-admin-h">AI this month</h2>';
        if (ai.provider && ai.provider.paused) h += '<div class="wv-note wv-note-warn">AI is paused right now: ' + esc(ai.provider.kind === 'no_credit' ? 'the OpenAI account is out of credit.' : ai.provider.kind === 'bad_key' ? 'OpenAI rejected the API key.' : 'OpenAI model access.') + ' It resumes on its own once fixed.</div>';
        h += '<p class="wv-admin-spend"><strong>' + usd(ai.monthUsd) + '</strong> spent' + esc(capTxt) + '</p>';
        if (ai.capUsd) h += '<div class="wv-meter" role="img" aria-label="' + pct(ai.monthUsd, ai.capUsd) + ' of cap"><span style="width:' + Math.min(100, Math.round(ai.monthUsd / ai.capUsd * 100)) + '%"></span></div>';
        h += ai.byFeature.length ? '<table class="wv-table wv-table-plain"><thead><tr><th>Feature</th><th class="num">Requests</th><th class="num">Cost</th></tr></thead><tbody>' + ai.byFeature.map(function (f) {
            return '<tr><th scope="row">' + esc(featureLabel(f.feature)) + '</th><td class="num">' + f.requests + '</td><td class="num">' + usd(f.usd) + '</td></tr>';
        }).join('') + '</tbody></table>' : '<p class="wv-muted">No AI requests yet this month.</p>';

        h += '<h2 class="wv-admin-h">Clubs</h2>' + (d.clubs.length ? '<div class="wv-table-scroll"><table class="wv-table"><thead><tr><th>Club</th><th>School</th><th>Status</th><th class="num">Members</th><th class="num">Active (30 days)</th></tr></thead><tbody>' + d.clubs.map(function (c) {
            var status = (c.verified ? 'Verified' : 'Not verified') + (c.sponsored ? ', sponsored' : '') + (c.type === 'career_center' ? ', career center' : '');
            return '<tr><th scope="row">' + esc(c.name) + '</th><td>' + esc(c.school || '') + '</td><td>' + esc(status) + '</td><td class="num">' + c.members + '</td><td class="num">' + c.active30d + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<p class="wv-muted">No clubs yet.</p>');
        h += '<p class="wv-muted wv-admin-note">“Active” means signed in and used Weaver in that period. Everyone was signed out once at the v2 launch, so activity before then isn’t counted.</p>';
        root.innerHTML = h;
        $('wv-admin-refresh').onclick = function () { renderAdmin(); };
    }


    renderAdmin();
})();
