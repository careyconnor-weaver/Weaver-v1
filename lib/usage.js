// Metered AI calls. Every OpenAI request in Weaver goes through meteredCompletion(),
// which enforces, in order:
//   1. a global monthly spending cap for the whole app (kill switch),
//   2. one AI request at a time per user,
//   3. a per-minute request limit for the user's plan,
//   4. the user's monthly AI budget, checked against the WORST-CASE cost of the
//      request before it is sent (input size + max output), so a budget can never be
//      exceeded, even by a single large request.
// The actual cost (from the token counts OpenAI returns) is written to ai_usage.

const { hit } = require('./auth');

// USD per 1M tokens. Unknown models are charged at the most expensive known rate.
const PRICES = {
    'gpt-4o-mini': { input: 0.15, cached: 0.075, output: 0.6 },
    'gpt-4o': { input: 2.5, cached: 1.25, output: 10 },
    'gpt-4.1-mini': { input: 0.4, cached: 0.1, output: 1.6 },
    'gpt-4.1': { input: 2, cached: 0.5, output: 8 },
    'gpt-4.1-nano': { input: 0.1, cached: 0.025, output: 0.4 },
};
const FALLBACK_PRICE = { input: 30, cached: 30, output: 60 };

const DEFAULT_MODEL = process.env.OPENAI_ASSISTANT_MODEL || 'gpt-4o-mini';
const QUALITY_MODEL = process.env.OPENAI_QUALITY_MODEL || 'gpt-4o';
const VISION_MODEL = process.env.OPENAI_VISION_MODEL || 'gpt-4o';

function priceFor(model) {
    const m = String(model || '');
    const key = Object.keys(PRICES).sort((a, b) => b.length - a.length).find((k) => m === k || m.startsWith(k + '-'));
    return key ? PRICES[key] : FALLBACK_PRICE;
}

// micro-dollars = tokens × (USD per 1M tokens)
function costMicros(model, usage) {
    const p = priceFor(model);
    const prompt = (usage && usage.prompt_tokens) || 0;
    const cached = (usage && usage.prompt_tokens_details && usage.prompt_tokens_details.cached_tokens) || 0;
    const out = (usage && usage.completion_tokens) || 0;
    return Math.ceil((prompt - cached) * p.input + cached * p.cached + out * p.output);
}

function estimateInputTokens(messages) {
    let chars = 0, images = 0;
    for (const m of messages || []) {
        if (typeof m.content === 'string') chars += m.content.length;
        else if (Array.isArray(m.content)) {
            for (const part of m.content) {
                if (part && part.type === 'text') chars += String(part.text || '').length;
                if (part && part.type === 'image_url') images += 1;
            }
        }
    }
    // ~3.5 characters per token for English/JSON, rounded up; ~1,600 tokens per image at high detail.
    return Math.ceil(chars / 3.5) + images * 1600 + 50;
}

function worstCaseMicros(model, messages, maxTokens) {
    const p = priceFor(model);
    return Math.ceil(estimateInputTokens(messages) * p.input + maxTokens * p.output);
}

class UsageError extends Error {
    constructor(status, code, message, extra) {
        super(message);
        this.status = status;
        this.code = code;
        Object.assign(this, extra || {});
    }
}

function monthStart() {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function nextMonthStart() {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

async function monthSpendMicros(pool, userId) {
    const { rows } = await pool.query(
        'SELECT COALESCE(SUM(cost_micros), 0)::bigint AS spent FROM ai_usage WHERE user_id = $1 AND created_at >= $2',
        [userId, monthStart()]
    );
    return Number(rows[0].spent) || 0;
}

let globalCache = { at: 0, spent: 0 };
async function globalMonthSpendMicros(pool) {
    if (Date.now() - globalCache.at < 30000) return globalCache.spent;
    const { rows } = await pool.query('SELECT COALESCE(SUM(cost_micros), 0)::bigint AS spent FROM ai_usage WHERE created_at >= $1', [monthStart()]);
    globalCache = { at: Date.now(), spent: Number(rows[0].spent) || 0 };
    return globalCache.spent;
}

function globalCapMicros() {
    const usd = parseFloat(process.env.AI_MONTHLY_GLOBAL_CAP_USD || '');
    return Number.isFinite(usd) && usd > 0 ? Math.round(usd * 1e6) : null;
}

const inflight = new Set();

// ---------- AI provider outages ----------
// When OpenAI itself refuses requests (no credit left, a bad or revoked key, the model not
// enabled, OpenAI down), users get a calm message instead of a generic error, the server log
// names the cause and the fix, and Weaver's admins get one email about it. While the cause is
// one that won't fix itself in seconds (credit, key, model), requests are refused for a short
// time without calling OpenAI, so each student's click doesn't repeat the failure.

const PAUSED_MESSAGE = 'Weaver’s AI is paused for a moment. Try again shortly. Everything else in Weaver works as normal.';
const BUSY_MESSAGE = 'Weaver’s AI is busy right now. Try again in a minute.';

function classifyProviderError(err) {
    const status = err && (err.status || (err.response && err.response.status));
    const code = String((err && (err.code || (err.error && err.error.code))) || '');
    const type = String((err && (err.type || (err.error && err.error.type))) || '');
    const msg = String((err && err.message) || '');
    if (status === 429 && (code === 'insufficient_quota' || /quota|credit|billing/i.test(msg))) {
        return { kind: 'no_credit', hold: 120, fix: 'OpenAI has no credit left. Add credit at platform.openai.com → Settings → Billing (and consider auto recharge).' };
    }
    if (status === 401 || code === 'invalid_api_key') {
        return { kind: 'bad_key', hold: 120, fix: 'OpenAI rejected the API key. Create a new key at platform.openai.com → API keys and set OPENAI_API_KEY in Render → Environment.' };
    }
    if (status === 403 || status === 404 || code === 'model_not_found') {
        return { kind: 'model_access', hold: 120, fix: 'The OpenAI project cannot use this model. Allow it under platform.openai.com → project → Limits → Model usage, or change OPENAI_ASSISTANT_MODEL.' };
    }
    if (status === 429) return { kind: 'rate_limited', hold: 0, fix: 'OpenAI rate limit for this account was reached. It clears on its own; raise the usage tier if it keeps happening.', busy: true };
    if (status >= 500 || /ECONNRESET|ETIMEDOUT|ENOTFOUND|socket hang up|Connection error|timed out/i.test(msg) || type === 'server_error') {
        return { kind: 'provider_down', hold: 0, fix: 'OpenAI did not respond or returned a server error. Usually temporary; see status.openai.com.' };
    }
    return null; // a bad request or a bug: let the caller report it as an error
}

const outage = { until: 0, kind: null };
const alertedAt = {};
let outageNotifier = null; // set by the server: (info) => send an email to admins
function onProviderOutage(fn) { outageNotifier = fn; }

function reportOutage(info, err, feature) {
    console.error(`[AI PROVIDER] ${info.kind} during ${feature}: ${(err && err.message) || err}\n[AI PROVIDER] Fix: ${info.fix}`);
    const now = Date.now();
    if (['no_credit', 'bad_key', 'model_access'].includes(info.kind) && outageNotifier && (!alertedAt[info.kind] || now - alertedAt[info.kind] > 6 * 3600000)) {
        alertedAt[info.kind] = now;
        Promise.resolve().then(() => outageNotifier({ kind: info.kind, fix: info.fix, detail: String((err && err.message) || '').slice(0, 300) })).catch((e) => console.error('[AI PROVIDER] alert email failed:', e.message));
    }
}

function providerStatus() {
    return { paused: Date.now() < outage.until, kind: Date.now() < outage.until ? outage.kind : null };
}

async function recordUsage(pool, row) {
    await pool.query(
        'INSERT INTO ai_usage (user_id, feature, model, input_tokens, cached_tokens, output_tokens, cost_micros) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [row.userId, row.feature, row.model, row.input, row.cached, row.output, row.cost]
    );
    globalCache.spent += row.cost;
}

// params: OpenAI chat.completions params WITHOUT model/max_tokens (passed separately).
async function meteredCompletion({ pool, openai, user, plan, feature, model, maxTokens, params }) {
    if (!openai) throw new UsageError(503, 'ai_unavailable', 'AI features are not configured on this server.');
    if (!pool) throw new UsageError(503, 'ai_unavailable', 'AI features need the database for usage metering.');
    const useModel = model || DEFAULT_MODEL;
    const cap = globalCapMicros();
    if (cap != null && (await globalMonthSpendMicros(pool)) >= cap) {
        throw new UsageError(503, 'ai_paused', 'AI features are paused for the rest of the month. Everything else in Weaver works as normal.');
    }
    if (inflight.has(user.id)) {
        throw new UsageError(429, 'ai_busy', 'Your previous request is still running. Wait for it to finish, then try again.');
    }
    const rate = hit('ai:' + user.id, plan.aiPerMinute, 60000);
    if (!rate.allowed) {
        throw new UsageError(429, 'ai_rate_limited', `Too many requests in a minute on the ${plan.label} plan. Try again in ${rate.retryAfterSec} seconds.`, { retryAfterSec: rate.retryAfterSec });
    }
    const spent = await monthSpendMicros(pool, user.id);
    const worst = worstCaseMicros(useModel, params.messages, maxTokens);
    if (spent + worst > plan.aiBudgetMicros) {
        throw new UsageError(402, 'ai_budget_exhausted',
            plan.key === 'pro'
                ? 'You have used this month’s AI allowance. It resets on the 1st.'
                : `You have used this month’s AI allowance on the ${plan.label} plan. It resets on the 1st, or upgrade to Pro for a larger allowance.`,
            { resetsAt: nextMonthStart().toISOString() });
    }

    if (Date.now() < outage.until) throw new UsageError(503, 'ai_unavailable', PAUSED_MESSAGE, { retryAfterSec: Math.ceil((outage.until - Date.now()) / 1000) });

    inflight.add(user.id);
    try {
        let completion;
        try {
            completion = await openai.chat.completions.create({ ...params, model: useModel, max_tokens: maxTokens });
        } catch (err) {
            const info = classifyProviderError(err);
            if (!info) throw err;
            reportOutage(info, err, feature);
            if (info.hold) { outage.until = Date.now() + info.hold * 1000; outage.kind = info.kind; }
            throw new UsageError(503, 'ai_unavailable', info.busy ? BUSY_MESSAGE : PAUSED_MESSAGE, { retryAfterSec: info.hold || 30, providerIssue: info.kind });
        }
        outage.until = 0; outage.kind = null;
        const usage = completion.usage || {};
        const cost = completion.usage ? costMicros(useModel, usage) : worst;
        await recordUsage(pool, {
            userId: user.id,
            feature,
            model: useModel,
            input: usage.prompt_tokens || 0,
            cached: (usage.prompt_tokens_details && usage.prompt_tokens_details.cached_tokens) || 0,
            output: usage.completion_tokens || 0,
            cost,
        });
        return completion;
    } finally {
        inflight.delete(user.id);
    }
}

async function usageSummary(pool, user, plan) {
    const spent = await monthSpendMicros(pool, user.id);
    const pct = plan.aiBudgetMicros > 0 ? Math.min(100, Math.round((spent / plan.aiBudgetMicros) * 100)) : 100;
    return { percentUsed: pct, resetsAt: nextMonthStart().toISOString() };
}

function sendUsageError(res, err) {
    if (err instanceof UsageError) {
        if (err.retryAfterSec) res.set('Retry-After', String(err.retryAfterSec));
        return res.status(err.status).json({ error: err.message, code: err.code, resetsAt: err.resetsAt });
    }
    return null;
}

module.exports = {
    DEFAULT_MODEL,
    QUALITY_MODEL,
    VISION_MODEL,
    PRICES,
    costMicros,
    worstCaseMicros,
    meteredCompletion,
    usageSummary,
    UsageError,
    sendUsageError,
    monthSpendMicros,
    classifyProviderError,
    onProviderOutage,
    providerStatus,
};
