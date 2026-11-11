# Engineering workflow

This workflow applies to small, approved changes. Architectural proposals in [ARCHITECTURE.md](ARCHITECTURE.md) remain unapproved until explicitly accepted.

## Scope and branches

1. Agree on one concrete problem and its scope before implementation.
2. Work on a purpose-specific branch, never directly on `main`. The initial documentation cleanup uses `docs/architecture`.
3. Read relevant source and preserve unrelated working-tree changes. Commit small, coherent steps locally; inspect staged changes for secrets and accidental files.
4. Obtain explicit permission before pushing. Prepare a PR with the information below and request review from Connor or a designated reviewer. Reviewer assignment remains to be confirmed.
5. Obtain explicit approval before merging or deploying. Confirm Render deploy triggers first: the current build runs migrations and startup also has database and integration side effects.

## Verification

Use checks appropriate to the change. Documentation-only changes need link checks, a diff review, and confirmation that runtime files and configuration are unchanged. Do not start the application just to verify documentation.

Application changes should include focused regression tests. Routine tests must mock OpenAI, Stripe, Gmail, and Resend, use synthetic data, and avoid shared databases. No application test/lint scripts or tracked CI workflows currently exist; do not report checks as passing when they were not run. Analytics Python tests are separate.

Do not install dependencies, call live paid APIs, create hosting resources, or run migrations as an implicit verification step. Triage dependency advisories individually; do not run `npm audit fix --force`.

## PR contents

- Problem and approved scope.
- Resulting behavior or documentation organization.
- Verification performed, with limitations.
- Auth, permissions, AI cost, and billing implications where relevant.
- Schema/configuration changes and deployment impact.
- Proposed reviewer and rollback approach.

For documentation-only work, reverting the documentation commit restores the text. That does not reverse database or provider operations performed by a deployment. Treat deployment authorization separately from code review.

## Operational facts still to establish

- Render's deployed branch/commit, auto-deploy settings, and deployment approver.
- Separate development/test databases and integration isolation.
- Backups, restore procedure, and responsible owner.
- Service budgets, production monitoring, and release constraints.
- GitHub branch protection and designated reviewers.

Record configuration facts and ownership, never credential values. No production access is required for this documentation cleanup.
