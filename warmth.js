/* Contact warmth: how strong a relationship is, from what actually happened.
   Shared by the browser (window.WeaverWarmth) and the server (require('./warmth')),
   so the app, the assistant and documents always agree.

   Levels, strongest first:
     strong   – two or more conversations, or a conversation plus replies, recently
     warm     – at least one conversation, or a real back-and-forth by email
     warming  – they have replied, or a conversation that is now old
     cold     – outreach only, no reply yet
     new      – nothing logged yet
   A relationship with no two-way contact for 90+ days drops one level ("going quiet"). */
(function (root, factory) {
    var api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.WeaverWarmth = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var LEVELS = {
        strong: { key: 'strong', label: 'Strong', rank: 4 },
        warm: { key: 'warm', label: 'Warm', rank: 3 },
        warming: { key: 'warming', label: 'Warming', rank: 2 },
        cold: { key: 'cold', label: 'Cold', rank: 1 },
        new: { key: 'new', label: 'New', rank: 0 },
    };
    var ORDER = ['new', 'cold', 'warming', 'warm', 'strong'];
    var QUIET_DAYS = 90;

    function toDate(d) {
        if (!d) return null;
        var s = String(d);
        var t = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T12:00:00') : new Date(s);
        return isNaN(t.getTime()) ? null : t;
    }
    function daysSince(d, now) {
        var t = toDate(d);
        return t ? Math.max(0, Math.floor(((now || new Date()) - t) / 86400000)) : null;
    }
    function latest(list) {
        var best = null;
        (list || []).forEach(function (d) { var t = toDate(d); if (t && (!best || t > best)) best = t; });
        return best;
    }
    function ago(n) {
        if (n == null) return '';
        if (n === 0) return 'today';
        if (n === 1) return 'yesterday';
        if (n < 60) return n + ' days ago';
        var m = Math.round(n / 30);
        return m < 12 ? m + ' months ago' : Math.round(n / 365) + (Math.round(n / 365) === 1 ? ' year ago' : ' years ago');
    }
    function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

    // contact: { emails: [{date, direction}], notes: [{date}] }
    function assess(contact, now) {
        now = now || new Date();
        var emails = (contact && contact.emails) || [];
        var notes = (contact && contact.notes) || [];
        var sent = emails.filter(function (e) { return e && (e.direction === 'sent' || !e.direction); });
        var replies = emails.filter(function (e) { return e && e.direction === 'received'; });
        var calls = notes.length;

        var lastTwoWay = latest(replies.map(function (e) { return e.date; }).concat(notes.map(function (n) { return n.date; })));
        var lastAny = latest(emails.map(function (e) { return e.date; }).concat(notes.map(function (n) { return n.date; })));
        var quietDays = lastTwoWay ? daysSince(lastTwoWay, now) : null;
        var anyDays = lastAny ? daysSince(lastAny, now) : null;

        var level, why = [];
        if (!sent.length && !replies.length && !calls) {
            level = 'new';
        } else if (calls >= 2 || (calls >= 1 && replies.length >= 1)) {
            level = 'strong';
        } else if (calls >= 1 || replies.length >= 2) {
            level = 'warm';
        } else if (replies.length >= 1) {
            level = 'warming';
        } else {
            level = 'cold';
        }

        if (calls) why.push(plural(calls, 'conversation'));
        if (replies.length) why.push(replies.length === 1 ? '1 reply' : replies.length + ' replies');
        if (sent.length && !replies.length && !calls) why.push(plural(sent.length, 'email') + ' sent, no reply yet');

        var quiet = false;
        if (ORDER.indexOf(level) >= 3 && quietDays != null && quietDays >= QUIET_DAYS) {
            level = ORDER[ORDER.indexOf(level) - 1];
            quiet = true;
        }

        var when = '';
        if (lastTwoWay) when = 'last heard from them ' + ago(quietDays);
        else if (lastAny) when = 'last email ' + ago(anyDays);

        var reason = level === 'new' ? 'Nothing logged yet.' :
            (why.join(', ') + (when ? '; ' + when : '') + '.' + (quiet ? ' Going quiet: worth a check-in.' : ''));
        reason = reason.charAt(0).toUpperCase() + reason.slice(1);

        var next = {
            new: 'Send a short, specific first email.',
            cold: anyDays != null && anyDays >= 7 ? 'One brief, friendly follow-up.' : 'Give it a few days before following up.',
            warming: 'Ask for a short call.',
            warm: quiet ? 'Reconnect with a genuine update.' : 'Keep in touch; share an update when you have one.',
            strong: quiet ? 'Reconnect with a genuine update.' : 'Ready for a bigger ask, like a referral, if the timing fits.',
        }[level];

        return {
            level: level,
            label: LEVELS[level].label,
            rank: LEVELS[level].rank,
            reason: reason,
            next: next,
            quiet: quiet,
            calls: calls,
            replies: replies.length,
            sent: sent.length,
            daysSinceTwoWay: quietDays,
            daysSinceAny: anyDays,
        };
    }

    return { assess: assess, LEVELS: LEVELS, ORDER: ORDER, QUIET_DAYS: QUIET_DAYS };
});
