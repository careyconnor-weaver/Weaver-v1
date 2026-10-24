// Picks the contacts that matter for a request, so the model is sent a few dozen
// relevant people instead of a student's whole network. This is the main lever on
// AI cost per request, and it also keeps answers focused.

const STOP = new Set(['the', 'and', 'for', 'with', 'who', 'what', 'when', 'how', 'should', 'this', 'that', 'from', 'about', 'week', 'today', 'draft', 'email', 'note', 'call', 'my', 'me', 'i', 'a', 'an', 'to', 'of', 'at', 'in', 'on', 'is', 'do', 'know', 'up', 'follow', 'thank', 'you']);

function words(s) {
    return String(s || '').toLowerCase().split(/[^a-z0-9&.]+/).filter((w) => w.length > 1 && !STOP.has(w));
}

function clip(s, n) {
    s = s == null ? '' : String(s);
    return s.length > n ? s.slice(0, n) : s;
}

// network: the client snapshot { totals, follow_up_rules, contacts: [...] }
function selectRelevant(network, message, limit) {
    if (!network || !Array.isArray(network.contacts)) return null;
    const max = Math.max(5, Math.min(limit || 40, 60));
    const q = new Set(words(message));
    const scored = network.contacts.slice(0, 400).map((c, i) => {
        const nameWords = words(c && c.name);
        const firmWords = words(c && c.firm);
        let score = 0;
        if (nameWords.some((w) => q.has(w))) score += 100;
        if (firmWords.some((w) => q.has(w))) score += 60;
        if (c && c.overdue) score += 20;
        if (c && c.vip) score += 15;
        if (c && c.priority === 'high') score += 10;
        const days = c && Number.isFinite(c.days_since) ? c.days_since : 365;
        score += Math.max(0, 30 - days) / 3;
        return { c, i, score };
    });
    scored.sort((a, b) => b.score - a.score || a.i - b.i);
    const picked = scored.slice(0, max).map(({ c }) => ({
        name: clip(c.name, 120),
        firm: c.firm ? clip(c.firm, 120) : null,
        position: c.position ? clip(c.position, 120) : null,
        email: c.email ? clip(c.email, 160) : null,
        priority: c.priority || null,
        vip: !!c.vip,
        status: c.status === 'established' ? 'established' : 'cold',
        emails_sent: +c.emails_sent || 0,
        replies: +c.replies || 0,
        calls: +c.calls || 0,
        last_interaction: c.last_interaction ? clip(c.last_interaction, 30) : null,
        days_since: Number.isFinite(c.days_since) ? c.days_since : null,
        overdue: !!c.overdue,
        recent_notes: Array.isArray(c.recent_notes)
            ? c.recent_notes.slice(-2).map((n) => ({ date: clip(n && n.date, 30), summary: clip(n && n.summary, 300) }))
            : [],
        general_notes: c.general_notes ? clip(c.general_notes, 200) : undefined,
    }));
    const t = network.totals || {};
    return {
        totals: {
            contacts: +t.contacts || network.contacts.length,
            emails_sent: +t.emails_sent || 0,
            replies: +t.replies || 0,
            calls: +t.calls || 0,
            reply_rate: clip(t.reply_rate, 10),
            overdue: network.contacts.filter((c) => c && c.overdue).length,
        },
        follow_up_rules: network.follow_up_rules || null,
        note: picked.length < network.contacts.length
            ? `Showing the ${picked.length} most relevant of ${network.contacts.length} contacts for this request.`
            : undefined,
        contacts: picked,
    };
}

module.exports = { selectRelevant, clip };
