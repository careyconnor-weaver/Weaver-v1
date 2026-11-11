# Weaver

Weaver is a networking and recruiting platform for students, clubs, and career centers.

## Start here

- [Documentation index](docs/README.md): architecture, engineering workflow, and existing guides.
- [Architecture and proposed direction](docs/ARCHITECTURE.md): current implementation, proposals, and open decisions.
- [Engineering workflow](docs/CONTRIBUTING.md): branches, verification, review, and production boundaries.
- [Agent instructions](AGENTS.md): repository rules for coding agents.

React, TypeScript, a repository restructure, and semantic retrieval remain proposals requiring separate approval.

## Repository map

| Path | Responsibility |
| --- | --- |
| `index.html`, root CSS and browser JavaScript | Vanilla browser UI; `script.js`, `assistant.js`, `workspace-ui.js`, and `router.js` share application behavior |
| `server.js` | Express entry point, static assets, API middleware, many routes, integrations, and scheduled jobs |
| `routes/` | Extracted authentication, billing, and workspace routes |
| `lib/` | Shared authentication, AI context, playbook loading, usage accounting, plans, and schema additions |
| `db/` | PostgreSQL connection, Drizzle schema, and database helpers |
| `drizzle/`, `migrate-db.js` | Existing database migration paths |
| `analytics/` | SQL, Python, and R reporting tools; separate Python tests |
| `docs/` | Architecture, workflow, and documentation navigation |
| `render.yaml` | Declared Render service/database configuration; live settings are unverified |

## Local development status

Local setup is not yet verified end to end. Confirm a separate development PostgreSQL database and an integration configuration that cannot contact production before starting the app. Never copy production credentials into local configuration or commit secrets.

The project uses Node.js and npm; `package.json` does not currently pin a Node version. Dependency installation uses `npm install` and writes local files. No dependency installation is required to read the repository.

| Command | Current behavior and precautions |
| --- | --- |
| `npm start` / `npm run dev` | Starts Express. Startup can alter schema and hash legacy passwords; scheduled jobs can send email and change Stripe seat quantities. Use only after environment isolation is confirmed. |
| `npm run demo` | Installs an additional package, creates a local database, seeds data, and starts the app. It retains configured integration credentials and is not an offline sandbox. |
| `npm run migrate`, `npm run db:migrate`, `npm run db:push` | Can modify the configured database. Shared-database changes require explicit approval. |
| `npm run db:generate` | Generates migration files; review them before any application to a database. |

OpenAI features can incur API charges. Stripe operations can affect billing, and Resend can deliver real messages. Routine tests must mock external integrations and use synthetic data.

There is currently no application test or lint script in `package.json`, and no tracked GitHub Actions workflow. Analytics has [separate Python tests](analytics/python/test_weekly_report.py). Establishing application verification is a proposed follow-up.

## Production boundaries

`render.yaml` declares `npm install && npm run migrate` as the build command. The server also applies schema additions at startup. Even a documentation-only merge could trigger a deployment if Render auto-deploy is enabled; that setting is unknown.

Do not push, merge, deploy, modify production configuration, or run shared-database migrations without explicit approval. Follow the [engineering workflow](docs/CONTRIBUTING.md).

Older guides are grouped under `docs/setup/`, `docs/deployment/`, and `docs/integrations/` and indexed for review. They may describe historical settings or actions that affect production; consult them as references rather than verified runbooks.
