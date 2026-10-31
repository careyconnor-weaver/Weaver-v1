-- Weaver analytics views (PostgreSQL)
-- ------------------------------------------------------------------
-- Turns Weaver's app tables into tidy tables for reporting and modeling.
-- Read-only: lives in its own "analytics" schema and never changes app data.
-- Privacy: no email subjects, call notes or contact names leave these views;
-- only counts, dates, firms and outcomes.
--
-- Install or update:   psql "$DATABASE_URL" -f analytics/sql/views.sql
-- Techniques used: CTEs, window functions (ROW_NUMBER, LAG, running SUM),
-- LATERAL joins, FILTER aggregates, date_trunc, defensive date parsing.

CREATE SCHEMA IF NOT EXISTS analytics;

-- Interaction dates are stored as text ('YYYY-MM-DD' or ISO timestamps).
-- Parse defensively: anything that isn't a date becomes NULL instead of an error.
CREATE OR REPLACE FUNCTION analytics.to_day(t text) RETURNS date
LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE WHEN t ~ '^\d{4}-\d{2}-\d{2}' THEN substr(t, 1, 10)::date END
$$;

-- 1. Every interaction as one long table: who, which contact, what kind, which day.
CREATE OR REPLACE VIEW analytics.interactions AS
SELECT c.user_id, c.id AS contact_id, COALESCE(NULLIF(c.firm, ''), c.company) AS firm,
       CASE WHEN e.direction = 'received' THEN 'reply' ELSE 'email_sent' END AS kind,
       COALESCE(e.type, CASE WHEN e.direction = 'received' THEN 'received' ELSE 'cold' END) AS email_type,
       analytics.to_day(e.date) AS day
FROM emails e JOIN contacts c ON c.id = e.contact_id
UNION ALL
SELECT c.user_id, c.id, COALESCE(NULLIF(c.firm, ''), c.company), 'call', NULL, analytics.to_day(n.date)
FROM notes n JOIN contacts c ON c.id = n.contact_id;

-- 2. One row per email sent, with what happened next. This is the modeling table.
--    replied          : the contact replied within 14 days of this email
--    nth_email        : 1 = first email to this person, 2 = first follow-up, ...
--    prior_call       : the student had already spoken with them before this email
CREATE OR REPLACE VIEW analytics.outreach_outcomes AS
WITH sent AS (
    SELECT i.*, ROW_NUMBER() OVER (PARTITION BY i.contact_id ORDER BY i.day) AS nth_email
    FROM analytics.interactions i
    WHERE i.kind = 'email_sent' AND i.day IS NOT NULL
)
SELECT s.user_id, s.contact_id, s.firm, s.email_type, s.day AS sent_day,
       EXTRACT(ISODOW FROM s.day)::int AS weekday,          -- 1 = Monday ... 7 = Sunday
       s.nth_email,
       (r.first_reply IS NOT NULL) AS replied,
       (r.first_reply - s.day) AS days_to_reply,
       EXISTS (SELECT 1 FROM analytics.interactions k
               WHERE k.contact_id = s.contact_id AND k.kind = 'call' AND k.day < s.day) AS prior_call
FROM sent s
LEFT JOIN LATERAL (
    SELECT MIN(i.day) AS first_reply
    FROM analytics.interactions i
    WHERE i.contact_id = s.contact_id AND i.kind = 'reply'
      AND i.day >= s.day AND i.day <= s.day + 14
) r ON true;

-- 3. Each club member's activity by week, with running totals and week-over-week change.
CREATE OR REPLACE VIEW analytics.member_weekly AS
WITH weekly AS (
    SELECT m.org_id, m.user_id, date_trunc('week', i.day)::date AS week,
           COUNT(*) FILTER (WHERE i.kind = 'email_sent') AS outreach,
           COUNT(*) FILTER (WHERE i.kind = 'reply')      AS replies,
           COUNT(*) FILTER (WHERE i.kind = 'call')       AS calls
    FROM org_members m
    JOIN analytics.interactions i ON i.user_id = m.user_id
    WHERE i.day IS NOT NULL
    GROUP BY 1, 2, 3
)
SELECT w.*,
       SUM(outreach) OVER (PARTITION BY org_id, user_id ORDER BY week) AS outreach_to_date,
       SUM(calls)    OVER (PARTITION BY org_id, user_id ORDER BY week) AS calls_to_date,
       outreach - LAG(outreach, 1, 0::bigint) OVER (PARTITION BY org_id, user_id ORDER BY week) AS outreach_change
FROM weekly w;

-- 4. One row per club: size, activity in the last 30 days, and shared results.
CREATE OR REPLACE VIEW analytics.club_summary AS
WITH recent AS (
    SELECT m.org_id, i.user_id, i.kind
    FROM org_members m JOIN analytics.interactions i ON i.user_id = m.user_id
    WHERE i.day >= CURRENT_DATE - 30
)
SELECT o.id AS org_id, o.name, o.school, o.verified,
       (SELECT COUNT(*) FROM org_members m WHERE m.org_id = o.id)               AS members,
       COUNT(DISTINCT r.user_id)                                              AS active_members_30d,
       COUNT(*) FILTER (WHERE r.kind = 'email_sent')                          AS outreach_30d,
       COUNT(*) FILTER (WHERE r.kind = 'reply')                               AS replies_30d,
       COUNT(*) FILTER (WHERE r.kind = 'call')                                AS calls_30d,
       ROUND(100.0 * COUNT(*) FILTER (WHERE r.kind = 'reply')
             / NULLIF(COUNT(*) FILTER (WHERE r.kind = 'email_sent'), 0), 1)   AS reply_rate_pct_30d,
       (SELECT COUNT(*) FROM outcomes x JOIN org_members m ON m.user_id = x.user_id AND m.org_id = o.id
         WHERE x.share_with_club AND x.stage = 'offer')                       AS offers_shared
FROM organizations o
LEFT JOIN recent r ON r.org_id = o.id
GROUP BY o.id;
