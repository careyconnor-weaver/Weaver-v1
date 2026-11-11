# Weaver — Architecture & Engineering Direction

**Status:** Draft proposal; not yet approved
**Last reviewed:** 2026-11-11
**Source of truth for coding agents:** `AGENTS.md` (repo root) + this document
**Scope:** Architecture and process direction, not authorization to deploy or migrate

## 1. Goals and decision principles

- Keep the existing product running and avoid interrupting users or payments.
- Make it easy for a small engineering team to ship changes safely through branches, PRs, and tests.
- Keep infrastructure simple and predictable; reuse existing services by default.
- Protect user contact data and confidential recruiting information.
- Improve the AI assistant only when improvements can be measured against realistic user tasks.
- Avoid introducing paid services, production database migrations, or large rewrites without a reviewed proposal.

## 2. Current architecture (observed in repository, not runtime-verified)

```text
Browser
  |  HTML / CSS / vanilla JS; fetch('/api/...')
  v
Node.js + Express (`server.js`) — hosted via Render config
  |-- `/routes`                   auth, Stripe billing, workspace APIs
  |-- `/lib`                      auth, AI context, playbook, plans, usage
  |-- `/db`                       PostgreSQL access, Drizzle schema
  |-- OpenAI API                  recruiting assistance, summarization, vision
  |-- Stripe API + webhooks       subscriptions and club/seat billing
  |-- Google APIs                 Gmail integration
  |-- Resend                      transactional/reminder emails
  |-- node-cron                   scheduled jobs
  v
PostgreSQL (Render Postgres is declared in `render.yaml`)
```

| Component | Existing entry points | Notes |
| --- | --- | --- |
| Browser UI | `index.html`, `script.js`, `workspace-ui.js`, `router.js`, root CSS/JS | Not currently React. Static files served by Express. |
| Server | `server.js`, `routes/` | Express serves browser files and `/api` endpoints. |
| Data | `db/index.js`, `db/schema.js`, `db/api.js`, `drizzle.config.js` | PostgreSQL via `pg` and Drizzle. |
| AI | `lib/usage.js`, `lib/context.js`, `lib/playbook.js`, AI routes | Calls an external OpenAI model; does not train a custom one. |
| Billing | `routes/stripe.js`, subscription fields in database | Checkout, subscription events, club billing. |
| Hosting | `render.yaml` | Config describes a Node web service and Postgres. Verify actual plans/autodeploy in Render dashboard. |

The browser also persists contacts and settings in localStorage. Contact edits sync snapshots to PostgreSQL; assistant chat receives a client-supplied network snapshot, while reviews and documents load server records. These paths can disagree when synchronization is incomplete. Most application routes are still in `server.js`.

Schema evolution is split between the original Drizzle migration and additions in `lib/schema-sql.js`, invoked by both the migration script and server startup. The Drizzle schema does not describe every newer table.

**Important operational note:** `render.yaml` currently uses `buildCommand: npm install && npm run migrate`. Review migration contents and target database before deploying. Server startup also attempts schema changes and legacy password hashing, and schedules reminder emails and Stripe seat updates (including a seat sync shortly after startup). Demo mode replaces the database URL but retains configured integration credentials. The repository declares free Render plans, but this file does not verify the live billing plan or deploy triggers.

## 3. Proposed target architecture (incremental)

Keep a **modular monolith** for now: one Node/Express backend, one PostgreSQL database, and clear internal boundaries. This is a direction for incremental cleanup, **not** an instruction to move files immediately.

```text
Browser UI
  |-- CURRENT: HTML/CSS/vanilla JavaScript
  |-- OPTIONAL LATER: React + Vite, if an approved pilot proves its value
  v
Express API
  |-- Authentication and authorization
  |-- Contacts / workspace / recruiting workflows
  |-- AI orchestration + metering + evaluation
  |-- Billing and external integration adapters
  v
PostgreSQL (system of record)

External services: OpenAI, Stripe, Google, Resend
Hosting: Render (retain unless a concrete limitation justifies moving)
```

Suggested **eventual** repo organization (not an immediate migration target):

```text
AGENTS.md
README.md
package.json
render.yaml
server.js                  # retain stable entry point initially
routes/                    # existing Express routes
lib/                       # existing shared backend modules
db/                        # existing database modules and schema
public/                    # future home for served static assets
tests/                     # future automated tests
docs/
  ARCHITECTURE.md
  decisions/               # optional architecture decision records
```

If a React pilot is approved, introduce `client/` for React + Vite and decide how Express serves the built assets. Do not migrate all existing UI at once or move hosting providers as a prerequisite.

## 4. AI: current approach and proposed improvements

### Current (confirmed from code)

- `lib/playbook.js` injects Weaver-specific recruiting guidance when a private playbook is configured; otherwise it uses a generic fallback. Do not put the proprietary playbook in git.
- `lib/context.js` ranks and trims relevant contact records and recent notes for an AI request. This is a **lightweight retrieval/context-selection strategy**, not evidence of an embeddings/vector-search system.
- `lib/usage.js` has model selection, token-cost estimates, per-plan request limits, per-user monthly allowance checks, and an optional global cap (`AI_MONTHLY_GLOBAL_CAP_USD`).
- `lib/plans.js` defines plan-specific AI allowances. Check whether runtime environment overrides are set before quoting actual budgets.

### Proposed (measure before implementation)

1. Define a small evaluation suite of realistic recruiting tasks (e.g., drafting follow-ups, comparing advice from call notes, remembering earlier interactions, citing source notes).
2. Measure correctness, source grounding, latency, tokens, cost, and cross-user data isolation with synthetic data.
3. Improve SQL filters and existing context selection first; pass only relevant contacts/notes to the model.
4. Consider **RAG with semantic search** only for cases where existing retrieval repeatedly misses relevant *unstructured* notes or documents.

### Conditional RAG design (not approved)

```text
User question + signed-in user ID
    -> enforce permissions
    -> search user's/authorized org's source notes or documents
       (start with SQL/full-text; optionally embeddings + pgvector)
    -> retrieve a small set of relevant passages with source IDs
    -> assemble prompt using relevant passages + recruiting playbook
    -> OpenAI request through usage-metering/cost-control layer
    -> answer with source references, or admit insufficient evidence
```

- **Never** use retrieval without tenant/user authorization enforced at the data access layer.
- Keep original source IDs, note dates, and any permission information; honor edits and deletion by updating/removing search indexes.
- Avoid embedding or exporting confidential third-party content without permission and a clear data retention policy.
- Limit query results and context size; measure extra token, embedding, and storage costs.
- Do not assume RAG eliminates hallucinations; evaluate answers and citations.
- If vector search is justified, evaluate `pgvector` in the existing development PostgreSQL setup first. Render documents support for this extension, but actual DB version and permissions must be verified. OpenAI hosted file search is an alternative, but it is a separate storage/cost and API integration decision.

**Decision gate:** approve RAG only after a prototype shows materially better answers than a SQL/keyword baseline on a fixed evaluation set, within an agreed cost budget.

## 5. Cost, security, and production safety

1. Separate development and production databases, credentials, and billing environments. Use test mode for Stripe and mocks for routine tests.
2. Don't call live paid APIs in CI or default automated tests. Use synthetic data; never run bulk embeddings by accident.
3. Confirm `AI_MONTHLY_GLOBAL_CAP_USD` in Render and configure account/project-level provider alerts or spending controls. The application's cap relies on its own accounting and is **not** a guaranteed provider billing ceiling under concurrency or delayed usage.
4. Record estimated worst-case cost per AI feature and add limits for request size, output size, and requests per user.
5. Never commit `.env`, secret files, production database URLs, customer data, or the confidential playbook.
6. Verify Stripe webhook signature handling, payment-state changes, account authorization, file upload restrictions, and data deletion behavior before significant changes.
7. Require explicit approval for migrations, billing changes, new service subscriptions, production environment edits, and deployments.

## 6. Delivery workflow

1. Create a focused issue or small approved task.
2. Branch from updated `main` using names such as `docs/architecture-plan`, `fix/auth-session`, or `feat/ai-evals`.
3. Implement one scoped change and add verification/tests.
4. Open a PR with purpose, before/after behavior, test evidence, cost implications, and rollout/rollback notes.
5. Have Connor or a designated reviewer approve high-impact changes before merging; confirm Render deploy triggers.
6. Keep `main` deployable. Use GitHub Actions for CI once configured, and consider branch protection.

## 7. Roadmap (proposed)

| Stage | Work | Success criterion |
| --- | --- | --- |
| 0: Understand | Verify live infrastructure, credentials, and existing user flows | Current architecture and ownership documented |
| 1: Safer shipping | PR conventions, minimal tests/CI, dev/test isolation, dependency triage | No routine direct-to-main changes; tests do not incur paid API usage |
| 2: Maintainability | Move files incrementally, improve boundaries and error handling | Small changes are easier to review with no behavior regressions |
| 3: AI quality | Add offline evaluation cases, optimize context and cost | Better grounded answers at an approved cost |
| 4: Optional pilots | Try React for one UI surface; RAG for document-heavy use cases | Adopt only if measurable benefits outweigh migration/operating cost |

## 8. Open decisions for Connor / engineering

- What are the current monthly Render, OpenAI, Stripe, and email-service costs and budgets?
- Is Render automatically deploying `main`? Who can approve and trigger production deployments?
- Is there a separate non-production Postgres database, Stripe test account, and development OpenAI project?
- What product workflows are currently most painful for users?
- Which code areas are safe to refactor now, and what release or launch constraints exist?
- Are there enough user-authored notes/documents to justify semantic search?
- Should a small React pilot be approved, or should the current UI remain vanilla JS for now?

## 9. Reference links

- Repository: https://github.com/careyconnor-weaver/Weaver-v1
- Render's Postgres extensions: https://render.com/docs/postgresql-extensions
- OpenAI file-search guide: https://developers.openai.com/api/docs/guides/tools-file-search
- pgvector: https://github.com/pgvector/pgvector

Update this document when a proposal is approved, rejected, or replaced. Keep the **current** and **proposed** architecture sections distinct.
