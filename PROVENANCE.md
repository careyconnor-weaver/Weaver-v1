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
