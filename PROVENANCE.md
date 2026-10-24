# Code Provenance — Club / Enterprise feature

**Author (requested & directed by):** shindon@bc.edu
**Implemented by:** Claude Opus 4.8 (claude-opus-4-8), via Claude Code
**Session:** https://claude.ai/code/session_01J5PZc2FvLyEJ462zYpKyzQ
**Date:** 2026-10-23
**Branch:** `feature/club-enterprise`
**Base commit:** `614b6be`
**Scope:** 8 files changed, 1 file added (+~918 / −20 lines). No production dependencies added.

This record documents what was changed, why, and how it was verified. It is a
human-and-machine-readable account of authorship for this change set.

---

## 1. Summary of requested changes

1. **Club / organization enterprise feature** — on first run, ask whether the user
   is a *Student* or a *Club/Organization*, then give the individual network
   effects and raise switching cost.
2. **Remove the Gmail sync button** — the sync flow does not work right now.
3. **Cookie policy + consent** — add a Cookie Policy page and ask for cookie
   permission.
4. **Write this code-provenance record.**

The network-effect mechanics were chosen by the requester:
- **Org roster + invites** — orgs invite members; students join with a code.
- **Cross-member discovery** — members and their activity are visible to each other.
- **Networking-activity visibility / leaderboard** — members see how much they are
  networking (calls, outreach, replies, contacts) and how they rank, so members
  compare themselves to peers and the club can observe who is working efficiently.

**Switching cost / network effect:** a student who joins a club accumulates a
standing on a shared roster that grows more valuable as more members join; leaving
means losing that roster, visibility and rank. The more members and the more
activity, the stickier the account.

---

## 2. Changes by file

### Data model — `db/schema.js`
- Added `account_type` (`'student' | 'org'`) and `onboarded_at` to `users`.
- Added three tables: `organizations` (name, unique `join_code`, owner, school),
  `org_members` (the roster: org↔user, role, display name), and `org_invites`
  (pending email invites).

### Data access — `db/api.js`
- `setUserAccountType` — persists the onboarding choice.
- `createOrganization` / `getOrganizationById` / `getOrganizationByJoinCode` —
  org CRUD; generates a human-friendly unique code (`WVR-XXXXXX`, ambiguous
  characters removed); owner auto-added as first member.
- `addOrgMember` (idempotent), `getOrgsForUser` (orgs + the user's role).
- `getUserNetworkingStats` — per-user aggregation from existing `contacts` /
  `emails` / `notes`: calls (call notes), outreach (sent), replies (received),
  contacts, response rate, and a composite **activity score**
  = `calls*3 + sent + received*2 + contacts`.
- `getOrgRosterWithStats` — roster with per-member stats, sorted into a ranked
  leaderboard.
- `createOrgInvite` / `getOrgInvites`.

### Server API — `server.js`
- `POST /api/users/account-type` — save Student/Org choice.
- `POST /api/orgs`, `GET /api/orgs/mine`, `POST /api/orgs/join`,
  `GET /api/orgs/:orgId`, `GET /api/orgs/:orgId/members` (roster+leaderboard),
  `POST /api/orgs/:orgId/invite` (records invite, emails via Resend if configured —
  email failure never fails the request).
- Extended `checkAndMigrateDatabase()` (runs on startup) to add the new columns
  and create the org tables idempotently (`ADD COLUMN IF NOT EXISTS` /
  `CREATE TABLE IF NOT EXISTS`).

### Migration script — `migrate-db.js`
- Extended the hand-written `npm run migrate` script with the same idempotent
  column/table provisioning, matching the repo's existing migration convention.

### Frontend — `index.html` + `script.js`
- **Onboarding modal** (`index.html`): Student vs Club/Organization choice →
  student can join a club by code (skippable) → org creates a club and gets a
  shareable code.
- **Triggers** (`script.js`): shown after signup, after login when
  `accountType` is unset, and on page load for not-yet-onboarded users.
- **Club view** (`#club` section + sidebar/mobile nav): club name + join code
  (copy), invite-by-email (admins), the member's own rank/stats (the comparison
  hook), and the ranked leaderboard (cross-member visibility). Students with no
  club see a join prompt; org accounts see a create prompt. Degrades gracefully
  if the API/DB is unavailable.

### Gmail sync removal — `index.html` + `script.js`
- Removed the **sidebar "Gmail Sync"** link, the **mobile "Gmail Sync"** menu item
  (replaced with a Club entry), and the **"Sync from 'Weaver' Label"** button in
  the profile menu.
- Left intact: Gmail *Connect/Disconnect* (not a sync button), the backend Gmail
  endpoints, and the `syncGmailLabel` function (now simply unreferenced from the
  removed buttons). See Known limitations.

### Cookie policy & consent — `cookies.html` (new) + `index.html`
- New `cookies.html` policy page (matches the privacy/terms page style): what
  cookies/localStorage are used, a table of specific keys, strictly-necessary vs
  non-essential, and how to manage preferences.
- Consent **banner + settings modal** in `index.html`, driven by a self-contained
  inline script (works even if `script.js` errors): records the choice in
  `weaver_cookie_consent`, shows on first visit, and exposes
  `window.weaverCookieConsent.analyticsAllowed()` as a gate any future
  non-essential script must check before loading. Strictly-necessary storage
  (auth/session/contacts) is always on.
- Added Cookie Policy links to the landing, in-app, privacy and terms footers;
  updated the Privacy Policy cookies section to reference it.

---

## 3. Verification performed

- `node --check` passes on `server.js`, `db/api.js`, `db/schema.js`, `script.js`,
  `migrate-db.js`.
- Server **boots cleanly** with all new routes registered (no runtime/require
  errors on startup).
- **Logic unit-tested**: activity-score formula, response-rate math, and
  leaderboard ranking verified (alice=11 #1, bob=2 #2, owner=0 #3).
- DB functions use the same Drizzle idioms as the existing, production-proven
  functions in `db/api.js`; the generated SQL for the new schema was confirmed
  correct.

**Not run here:** an end-to-end test against a live Postgres (the sandbox blocks
listening sockets, and the in-memory `pg-mem` mock does not implement the
node-postgres wire features Drizzle uses — `rowMode`/`types`). Recommended before
production: run `npm run migrate` (or let the server's startup migration run)
against a staging database and click through onboarding → create club → join by
code → leaderboard.

## 4. Known limitations / suggested follow-ups

- The collapsed "Want to connect your Gmail?" instructions in `index.html` still
  say "Click 'Gmail Sync' in the sidebar," which no longer exists. Left as-is per
  the narrow scope (remove the button); worth updating or hiding when Gmail sync
  is either fixed or fully retired.
- Invites are recorded and emailed but not yet enforced as an allow-list on join
  (anyone with the code can join). Join codes are not yet rotatable from the UI.
- Member stats are computed on demand per request; for large orgs this is worth
  caching or moving to a single aggregate SQL query.
- Passwords remain stored in plaintext (pre-existing; out of scope here) — should
  be hashed before any real launch.

---

# Change set 2 — AI-native assistant, per-active-member B2B billing, redesign

**Author (requested & directed by):** shindon@bc.edu
**Implemented by:** Claude (claude-opus-4-8 for the interrupted first pass; claude-opus-5-5 to completion), via Claude Code
**Session:** https://claude.ai/code/session_01J5PZc2FvLyEJ462zYpKyzQ
**Date:** 2026-10-23
**Branch:** `feature/ai-native` · **Base commit:** `cb08703` (merge of PR #1)
**Scope:** 9 files changed, 3 files added. No new production dependencies.

## Requests

1. Fix: after logging in, the page sat still until a manual reload.
2. Make Weaver AI-native like Harvey/Legora, with their features mapped onto
   Weaver's own: assistant jobs = log from plain text, suggest + draft
   follow-ups, answer questions about your network, club/B2B insights.
3. Outcome-based pricing → chosen model: **per active member (B2B seats)**.
4. Reposition B2B for **student clubs** and **university career centers**.
5. Make it look more professional.

## Bug fixes (root causes)

| Symptom | Root cause | Fix |
| --- | --- | --- |
| Login froze until reload | `GET /api/contacts` ran 2 DB queries **per contact** (N+1), and login **awaited** it with no timeout | Batched into 2 queries total (`db/api.js`); login enters the app immediately and hydrates in the background; fetch timeouts; Stripe refresh at login capped at 3s |
| Page rendered but controls were dead for seconds | Startup **awaited** contacts + settings before attaching the rest of the event handlers | Hydration moved to the background (`script.js`) |
| Many controls never worked at all | A null `subscribe-form` lookup threw inside the startup handler, **aborting all initialization after it** (pre-existing) | Guarded the lookup |
| Leaderboard "calls" stuck at 0 | Notes created in the UI had no `id`, so the server sync skipped them | Stable ids assigned on save |
| Profile name/photo failed to save on a fresh deploy | `user_settings` was only created by `npm run migrate`, not the startup migration | Added to the startup migration |
| **Plaintext passwords written to server logs** at every login (pre-existing) | Leftover debug logging | Removed |

## Features

- **Assistant home** (`assistant.js`, `index.html`, `app-theme.css`): prompt-first
  home with greeting, composer, and Weaver-specific mappings of Harvey/Legora
  features — Sources (My network, Follow-ups, Club data, Playbook, Web search),
  Files → "Notes photo" (handwritten call notes via the existing OCR endpoint),
  Improve prompt, Library of recruiting workflows (+ saved workflows), recent
  chats in the sidebar, club/school workspace switcher.
- **Grounded agent** (`server.js` `/api/assistant/chat`, `/api/assistant/improve`):
  JSON-mode responses with structured actions (`log_interaction`,
  `update_contact`, `draft_email`), server-side whitelist/sanitization, grounding
  rules, per-user free daily limit (Pro and club-covered members unlimited).
  Contact changes are applied on the client (the source of truth) with **Undo**;
  drafts are never sent automatically ("Open in email" / "Copy" / "Mark as sent").
- **Per-active-member billing** (`routes/stripe.js`, `server.js`, `db/*`): one
  Stripe subscription per club on a per-seat price; seats = members active in the
  trailing 30 days (min 1); daily + post-startup seat sync without proration;
  admin-only checkout/portal; webhook routes org vs individual subscriptions
  (previously an org event would have 500'd and retried forever); members of a
  paying club get Pro (`clubCovered`). Setup: `CLUB_BILLING_SETUP.md`.
- **Redesign + repositioning**: neutral, hairline-structured app theme (Newsreader
  + IBM Plex Sans, single "ledger green" accent), light sidebar, sentence-case
  labels, no emoji medals; landing reframed for clubs and career centers, new
  "For clubs" section, org-first pricing with the live Stripe seat price.
  Removed all marketing/UI claims of the broken Gmail sync (hero, feature card,
  Pro plan bullet, and the step-by-step sync guide).
- **Disclosures**: Privacy Policy now discloses what the assistant sends to OpenAI
  and what club members can see; Cookie Policy lists the assistant's storage keys.

## Verification

- `node --check` on all JS; the page loads with **zero page errors** (it previously
  threw on startup).
- **17 route tests** booting the real `server.js` with a fake OpenAI endpoint:
  action sanitization (bad kinds/dates/fields/types), Playbook/club source
  handling, JSON mode, rate limit per user, Improve, billing routes refuse
  cleanly when unconfigured, webhook still rejects unsigned events.
- **17 database tests on a real Postgres** (embedded, local): startup migration,
  org create/join (case-insensitive, idempotent, 404), contact sync with string
  ids, batched contact load, stats, active-member counting (1 of 3 with stale and
  idle members), leaderboard, club coverage incl. lifting/restoring the free cap,
  Stripe-id redaction, admin-only billing (403 for members), login returns in
  ~1s with `clubCovered`, profile settings save on a fresh DB.
- **UI rendered in Chromium** (desktop + 390px mobile) with stubbed APIs and
  checked visually: assistant home, conversation with table + applied log + draft,
  Undo restores data, Club with billing, Library, Dashboard, landing hero,
  B2B section, pricing.

## Not verified here / follow-ups

- Live OpenAI and live Stripe calls (sandbox has no keys); verify in Stripe test
  mode per `CLUB_BILLING_SETUP.md`. Web search uses the existing DuckDuckGo
  helper, which returns limited results.
- Google Fonts couldn't load in the sandbox; screenshots used fallbacks.
- **The app has no server-side authentication** (pre-existing): APIs trust the
  `userId` sent by the browser, including the new admin checks. This should be
  fixed (sessions/JWT) before selling to career centers.
- Passwords are still stored in plaintext (pre-existing) — hash before launch.
- Assistant chats are stored per device (localStorage), not synced across devices.
- Members who were already logged in see club-covered Pro after their next login.

---

# Change set 3: Security, metering, plans and roles, outcomes, Legora-style workspace, polish

**Author (requested & directed by):** shindon@bc.edu
**Implemented by:** Claude (claude-opus-5-5, with a brief claude-haiku-4-5 stretch for deployment support), via Claude Code
**Session:** https://claude.ai/code/session_01J5PZc2FvLyEJ462zYpKyzQ
**Date:** 2026-10-24
**Branch:** `feature/ai-native` · **Base:** `4ce93e5`

## Requests

Professional-grade product modeled on Legora's workflow; the four builds (accounts and
security, usage metering with hard caps, plan structure, opt-in outcome tracking);
manager vs student account types; and a polish pass (type, distracting bugs,
animations, emoji). Reference products: Legora, AskStanley.

## Security (lib/auth.js, routes/auth.js, server.js)

| Problem found | Fix |
| --- | --- |
| The whole project folder was served publicly, including server code, `render.yaml` (which held the production database URL) and `gmail_tokens.json` (every connected user's Gmail read/send keys) | Only an allowlist of page, script, style and image files is served; the Gmail token file is no longer written |
| No server-side authentication: every API trusted the user id the browser sent | Server sessions in an HttpOnly, SameSite=Lax, Secure (in production) cookie; only a SHA-256 of each token is stored; every `/api` route requires a session except sign-in, pricing, webhook, health; any `userId` sent must match the session (403 otherwise) |
| Plaintext passwords | scrypt hashes; legacy passwords hashed in the background at startup and on next sign-in; 8-character minimum for new passwords; change-password signs out other devices |
| Anyone could add notes/emails to another user's contact; edits could overwrite ids | Ownership checks; whitelisted, length-limited contact fields |
| Gmail OAuth `state` was the raw user id | Single-use random state bound to the signed-in user, 10-minute expiry |
| Stripe checkout accepted any price id; plan refresh matched Stripe customers by (unverified) email | Only the configured Pro prices can be bought; refresh uses the customer id saved on the account |
| `/api/migrate`, test and diagnostic endpoints open to anyone | Admin-only (`ADMIN_EMAILS`) |
| Org routes didn't check membership; members could see each other's emails | Members-only; emails, billing and invites manager-only |
| Contact names, firms and notes inserted into the page unescaped (Gmail sync made this reachable by any email sender) | Escaped in the network table, contact detail, notes and pickers |
| Sign-in brute force, join-code guessing, invite spam | Rate limits per IP and per account |

## Metering and cost control (lib/usage.js, lib/context.js)

Every OpenAI call goes through `meteredCompletion`: global monthly kill switch, one
request at a time per user, per-minute limit per plan, then the **worst-case** cost of
the request is checked against the monthly allowance before sending. Actual token cost
is written to `ai_usage`. Default model moved to gpt-4o-mini (the legacy `gpt-4` and
`gpt-4-turbo` calls, ~100× the price, are gone). The assistant now sends the ≤40 most
relevant contacts instead of up to 400. Firm detection is cached per domain.

## Plans and roles (lib/plans.js)

Starter / Club (verified club) / Club sponsored (paid club plan or campus license) /
Pro (monthly, quarterly, annual; prices read live from Stripe; promotion codes on).
Clubs must be verified by Weaver before members get the free allowance. Users are
`manager` (club/career-center account or owner/admin) or `student`; managers land in
the Club console and see manager-only workflows.

## Workspace features (routes/workspace.js, workspace-ui.js)

- **Club console** (managers): KPIs, sortable member table with status, role changes
  (owner-only) and removal, invites, consented outcomes, billing, club report.
- **Review tables** (Legora's Tabular Review): contacts × questions; computed columns
  free, AI columns cite the interaction they came from; only empty cells are re-filled;
  CSV export.
- **Documents**: coffee-chat brief, thank-you, follow-up, referral request, firm brief,
  weekly report, club report; edit, copy, open in email, print/PDF.
- **Checklists**: expert templates (coffee chat, Superday, IB timeline, consulting case
  prep, offer decision, club season kickoff) plus blank.
- **Outcomes**: applications through offers; private by default, shared per outcome.

## Polish

Emoji and browser pop-ups removed app-wide (toasts and in-app dialogs instead);
sentence case throughout; My network rebuilt as a table; contact detail, Club,
Settings and Follow-ups restyled to the shared components; ALL-CAPS labels, monospace
email, full-width badges and mismatched button styles removed; Follow-ups shows who is
due first; Stripe return pages rebuilt; landing pricing uses drawn check marks.

## Verification

- 18 end-to-end checks against a real Postgres (public files, 401/403 rules, hashing,
  cookie flags, roles, console visibility, outcome consent, contact limits incl.
  batch-sync bypass, unverified-club loophole, admin lockout, rate limits, logout).
- 6 metering checks with a fake OpenAI endpoint (model choice, context trimming, exact
  cost ledger, cached re-runs, per-minute limit, hard monthly cap refusing before sending).
- 25 screens rendered in Chromium (desktop and phone) with zero page errors, console
  errors or native dialogs; each reviewed visually.

## Notes

- During this session, work from an interrupted turn kept running and an early version
  of `routes/workspace.js` was overwritten by a rewrite. The rewrite was then aligned to
  the front end's contract and covered by the tests above.
- Not verified here: live OpenAI, live Stripe, live Gmail, Windows-native demo database
  start. Email verification at signup and password reset are not built yet.
