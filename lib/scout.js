// Scout reports: recent public news about a contact's FIRM and GROUP, for call prep.
// By design this never searches for the person's name: Weaver prepares students to talk
// about the firm and the work, and anything about the person comes only from what the
// student pastes in (for example their public bio) or has logged.

const axios = require('axios');

const cache = new Map(); // query -> { at, items }
const TTL = 6 * 3600000;

function decode(s) {
    return String(s || '')
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/<[^>]+>/g, '').trim();
}

function tag(xml, name) {
    const m = xml.match(new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + name + '>'));
    return m ? decode(m[1]) : '';
}

function parseRss(xml) {
    const items = [];
    const re = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = re.exec(xml)) && items.length < 20) {
        const x = m[1];
        const title = tag(x, 'title');
        const link = tag(x, 'link');
        const source = tag(x, 'source');
        const date = tag(x, 'pubDate');
        if (!title || !/^https?:\/\//.test(link)) continue;
        const d = new Date(date);
        items.push({
            title: title.replace(new RegExp('\\s+-\\s+' + source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'), '').slice(0, 220),
            url: link.slice(0, 600),
            source: source.slice(0, 80) || null,
            date: isNaN(d) ? null : d.toISOString().slice(0, 10),
        });
    }
    return items;
}

async function newsSearch(query) {
    const hit = cache.get(query);
    if (hit && Date.now() - hit.at < TTL) return hit.items;
    const base = process.env.SCOUT_NEWS_BASE || 'https://news.google.com/rss/search'; // override only for tests
    const url = base + '?hl=en-US&gl=US&ceid=US:en&q=' + encodeURIComponent(query);
    const res = await axios.get(url, { timeout: 6000, responseType: 'text', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WeaverScout/1.0)' }, maxContentLength: 2000000 });
    const items = parseRss(String(res.data || ''));
    cache.set(query, { at: Date.now(), items });
    if (cache.size > 300) cache.delete(cache.keys().next().value);
    return items;
}

// Guess the group from a position like "Associate, Healthcare" or "Analyst - TMT".
function groupFrom(position) {
    const p = String(position || '');
    const parts = p.split(/\s*[,\-–|/]\s*|\s+in\s+|\s+on the\s+/i).map((x) => x.trim()).filter(Boolean);
    const titles = /^(senior\s+)?(summer\s+)?(analyst|associate|vice president|vp|director|managing director|md|principal|partner|consultant|manager|engineer|intern|senior associate|engagement manager|ceo|cfo|founder)s?$/i;
    const group = parts.find((x) => !titles.test(x) && x.length > 1);
    return group ? group.slice(0, 60) : null;
}

// Returns { firm, group, sources: [{ n, title, url, source, date }] }, newest first, deduplicated.
async function scoutFirm(firm, position) {
    firm = String(firm || '').trim().slice(0, 100);
    if (!firm || process.env.SCOUT_NEWS === 'off') return { firm, group: null, sources: [] };
    const group = groupFrom(position);
    const queries = [`"${firm}" when:120d`];
    if (group) queries.push(`"${firm}" ${group} when:180d`);
    const results = await Promise.allSettled(queries.map(newsSearch));
    const seen = new Set();
    const all = [];
    for (const r of results) {
        if (r.status !== 'fulfilled') continue;
        for (const it of r.value) {
            const key = it.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 80);
            if (seen.has(key)) continue;
            seen.add(key);
            all.push(it);
        }
    }
    all.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    return { firm, group, sources: all.slice(0, 10).map((s, i) => ({ n: i + 1, ...s })) };
}

module.exports = { scoutFirm, groupFrom, parseRss };
