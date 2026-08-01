# Progress

## Current milestone

M2 — Normalized PostgreSQL and sandbox isolation is locally implemented on August 1, 2026. Managed PostgreSQL validation is still external; M3 identity and authorization is the next code milestone.

## Completed baseline

- Preserved the deterministic fictional sandbox and 16-route guided notice-to-packet demo.
- Preserved real PDF/ZIP generation, hashes and provenance, human confirmation gates, append-only demo audit controls, and explicit non-predictive product language.
- The August 1 MVP validation recorded lint, strict typecheck, 9 tests, production build, deterministic 12-check evaluation, and 4 serial Playwright scenarios passing. That evidence describes the imported demo baseline, not the production transformation.

## M1 completed this cycle

- Persisted `docs/COMMERCIAL_NORTH_STAR.md` as the authoritative production brief.
- Replaced the demo roadmap with the ordered M1–M14 production execution plan.
- Added `docs/IMPLEMENTATION_STATUS.md` to separate implemented demo capabilities from production gaps and external validation.
- Added CI and owner-action documentation for repository gates and branch protection.
- Added a blank-database migration test and a deterministic tracked-file secret scan.
- Repaired the 390 px workspace header after real desktop/tablet/mobile browser inspection exposed colliding role text.
- Ran `npm run verify` successfully: lint, strict typecheck, 4 test files/10 tests, 101-file repository secret scan, production build, 12/12 deterministic evaluation checks, and 4/4 serial Playwright scenarios passed.
- Ran `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities.

## M2 completed this cycle

- Added a 32-table normalized PostgreSQL schema for tenant, property, insurance, source, requirement, evidence, workflow, submission, outcome, maintenance, idempotency, and audit records.
- Added database-enforced same-organization references and immutable audit/requirement/evidence/submission-version history.
- Added explicit production runtime configuration, `pg`/Drizzle migration and health adapters, and fail-closed sandbox route boundaries.
- Added a tenant-scoped repository with transactional audit writes, optimistic concurrency, idempotent case creation, and cross-tenant rejection.
- Added a deterministic, replay-safe migration from the fictional sandbox seed into an isolated synthetic organization.
- Added PostgreSQL contract tests using PGlite. The 6 new contract tests cover clean migration, direct and repository tenant isolation, immutable history, concurrency/audit atomicity, idempotency, deterministic seed/replay, and rollback.
- Re-ran `npm run verify`: lint, strict typecheck, 6 test files/18 tests, 120-file secret scan, production build, 12/12 demo evaluation, and 4/4 serial Playwright scenarios passed.
- Re-ran `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities. Desktop and 390 px mobile guided-entry views were visually rechecked.

## Next

- Begin M3 with production identity, sessions, memberships, deny-by-default authorization, and resource-complete cross-tenant policy tests.
- Validate the M2 migration and contract suite against the selected managed PostgreSQL service; PGlite is PostgreSQL-compatible local evidence, not production-provider evidence.
- Validate the new GitHub workflow and configure required checks after publication; owner-only settings remain listed in `docs/GITHUB_SETTINGS_CHECKLIST.md`.
- Do not ingest live customer data. Production identity/resource authorization, secure object storage, malware scanning, retention, backups, incident controls, and managed PostgreSQL validation are not yet complete.

## Status discipline

The current product remains a customer-demo-ready local sandbox. Production readiness, deployment validation, external customer validation, legal correctness, carrier acceptance, renewal, pricing, appeal success, and product-market fit are not claimed.
