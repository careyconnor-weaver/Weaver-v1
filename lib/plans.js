// Plans and limits. Every plan has a hard monthly AI budget (in micro-dollars, so
// 1,000,000 = $1.00) that no request can push past, plus contact and request-rate caps.
//
//   Starter          no club, not paying. Almost no AI (1 cent a month) — a taste only.
//   Club member      member of a verified club. Free, with a real AI allowance.
//   Club sponsored   member of a verified club that has a paid plan or campus license.
//   Pro              individual subscription (monthly, quarterly or annual).
//
// Budgets can be tuned per environment without code changes, e.g.
// PLAN_PRO_AI_MICROS=1500000. Keep each paid budget well under the plan's price so
// gross margin stays high even for the heaviest user.

function envInt(name, fallback) {
    const v = parseInt(process.env[name] || '', 10);
    return Number.isFinite(v) && v >= 0 ? v : fallback;
}

const PLANS = {
    starter: {
        key: 'starter',
        label: 'Starter',
        aiBudgetMicros: envInt('PLAN_STARTER_AI_MICROS', 10000),      // $0.01
        contactLimit: envInt('PLAN_STARTER_CONTACTS', 20),
        aiPerMinute: 3,
        reviewRows: 10,
        qualityModel: false,
        summary: 'Join a verified club for a free allowance, or upgrade to Pro.',
    },
    club: {
        key: 'club',
        label: 'Club',
        aiBudgetMicros: envInt('PLAN_CLUB_AI_MICROS', 250000),        // $0.25
        contactLimit: envInt('PLAN_CLUB_CONTACTS', 150),
        aiPerMinute: 6,
        reviewRows: 25,
        qualityModel: false,
        summary: 'Free through your club.',
    },
    club_plus: {
        key: 'club_plus',
        label: 'Club sponsored',
        aiBudgetMicros: envInt('PLAN_CLUB_PLUS_AI_MICROS', 750000),   // $0.75
        contactLimit: envInt('PLAN_CLUB_PLUS_CONTACTS', 1000),
        aiPerMinute: 10,
        reviewRows: 50,
        qualityModel: true,
        summary: 'Your club or career center pays for an expanded allowance.',
    },
    pro: {
        key: 'pro',
        label: 'Pro',
        aiBudgetMicros: envInt('PLAN_PRO_AI_MICROS', 1500000),        // $1.50
        contactLimit: envInt('PLAN_PRO_CONTACTS', 5000),
        aiPerMinute: 12,
        reviewRows: 50,
        qualityModel: true,
        summary: 'The full Weaver workspace.',
    },
};

const PLAN_ORDER = ['starter', 'club', 'club_plus', 'pro'];

function userIsPaying(user) {
    return !!(user && (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing'));
}

function orgIsSponsoring(org) {
    if (!org || !org.verified) return false;
    if (['active', 'trialing', 'past_due'].includes(org.planStatus)) return true;
    if (org.license === 'campus' && (!org.licenseExpiresAt || new Date(org.licenseExpiresAt) > new Date())) return true;
    return false;
}

// orgs: the user's memberships, each with { verified, planStatus, license, licenseExpiresAt }.
function resolvePlan(user, orgs) {
    if (userIsPaying(user)) return PLANS.pro;
    const list = Array.isArray(orgs) ? orgs : [];
    if (list.some(orgIsSponsoring)) return PLANS.club_plus;
    if (list.some((o) => o && o.verified)) return PLANS.club;
    return PLANS.starter;
}

function publicPlan(plan) {
    return {
        key: plan.key,
        label: plan.label,
        contactLimit: plan.contactLimit,
        reviewRows: plan.reviewRows,
        summary: plan.summary,
    };
}

module.exports = { PLANS, PLAN_ORDER, resolvePlan, publicPlan, userIsPaying, orgIsSponsoring };
