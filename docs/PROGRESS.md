# Progress

## Current milestone

M5 — Portfolio/SOV import backend foundation is locally implemented on August 1, 2026. The authenticated broker UI and rights-cleared external export validation remain incomplete. Managed PostgreSQL, OIDC/MFA, private object storage, malware scanning, and operational restore validation also remain external.

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

## M3 completed this cycle

- Expanded the production schema from 32 to 43 tables for identities, opaque sessions, OIDC attempts, invitations, team membership, case assignments, external principals/grants, service accounts/API credentials, and explicit support access.
- Added an OIDC-compatible authorization-code adapter using discovery, PKCE S256, state, and nonce plus a local provider that fails closed in production.
- Added one-time email-bound invitations, organization-selected sessions, session/invitation/membership expiry and revocation, and no production role switching.
- Added a 39-resource deny-by-default role/scope/case policy and applied it to every existing production repository query/mutation boundary.
- Added case-scoped external access, scoped API credentials, and customer-approved time-bounded support access with raw secrets returned once and only digests stored.
- Added protected production community and membership-invitation routes plus a responsive sign-in surface clearly separating sandbox from organization identity.
- Added 9 identity/authorization tests covering every resource class, direct cross-tenant auth-table references, role denial, OIDC attempt replay, expiry, revocation, service scopes, case scopes, and support controls.
- `npm run verify` passed: lint, strict typecheck, 7 files/27 tests, 142-file secret scan, 16-page/16-API production build, 12/12 deterministic evaluation checks, and 4/4 serial desktop/mobile Playwright scenarios. `npm audit --omit=dev --audit-level=high` reported 0 vulnerabilities. Desktop and 390 px sign-in views were visually inspected with no observed collision or overflow.

## M4 completed this cycle

- Expanded the production schema from 43 to 48 tables with tenant-owned storage objects, expiring access grants, immutable malware-scan results, and immutable backup manifests/items. The migration adds database tenant guards and immutable-history triggers.
- Added a private S3-compatible AWS SDK v3 adapter with explicit region, tenant-prefix validation, provider-compatible endpoint/path settings, short-lived signed PUT/GET commands, SHA-256 binding, exact metadata readback, server-side AES256/KMS settings, and no embedded credentials.
- Added an authorization-enforced storage service for filename normalization, size/MIME/checksum limits, quarantine, byte-signature validation, fail-closed malware results, clean-only evidence registration, one-use download grants, audit, retention/legal holds, retry-safe deletion state, and exact-byte backup/restore readback.
- Added protected production upload/finalize and download-grant issue/redeem/revoke routes. The deterministic local adapter and scanner remain test-only; the sandbox local-file path is not a production fallback.
- Added 4 storage contract tests covering S3 command configuration, traversal and cross-tenant attacks, metadata/content spoofing, infected/error rejection, immutable evidence and backup records, grant expiry/revocation/exhaustion, deletion blocks, and exact-byte restore.
- Added `docs/OBJECT_STORAGE.md` and production configuration/validation gates. This is local adapter evidence, not a claim that a managed bucket, KMS key, malware provider, retention policy, or restore exercise has run.
- `npm run verify` passed: lint, strict typecheck, 8 files/31 tests, 155-file secret scan, 16-page/21-API production build, 12/12 deterministic evaluation, and 4/4 serial desktop/mobile Playwright scenarios. `npm audit --omit=dev --audit-level=high` reported 0 vulnerabilities.

## M5 backend foundation completed this cycle

- Expanded the production schema from 48 to 53 tables and from 61 to 72 tenant/immutability triggers for saved import mappings and immutable versions, import runs, quarantined rows, and append-only preview/commit/rollback receipts.
- Added real CSV and XLSX parsing with configurable sheet/header rows, typed spreadsheet values, limits, deterministic normalization, ISO currency/unit/year/date validation, stable external identifiers, and explicit row numbers.
- Added generic AMS CSV mapping plus Applied Epic-compatible and AMS360-compatible fixture boundaries. These fixtures are not customer exports, vendor certifications, or live integrations.
- Added dry-run duplicate/ambiguity review, address and building reconciliation, explicit human confirmation, AMS-authoritative stable-ID matching, idempotent reruns, normalized client/community/property/location/building/policy output, immutable receipts, and non-destructive transactional rollback.
- Authored and visually inspected the XLSX fixture at `tests/fixtures/import/fortify-sov-fixture.xlsx`; formula/error inspection found no workbook errors. Added edge-case CSV fixtures and 5 service/contract tests.
- Full local validation passed: ESLint, strict TypeScript, 9 files/36 tests, 167-file secret scan, production build, 12/12 deterministic evaluation, 4/4 serial desktop/mobile Playwright scenarios, and `npm audit --omit=dev --audit-level=high` with 0 vulnerabilities.

## Next

- Complete M5 with authenticated route orchestration and a broker-visible import UI covering populated, loading, error, empty, ambiguity-review, confirmation, receipt, and rollback states.
- Validate one rights-cleared real brokerage export against the generic adapter and validate vendor-specific boundaries only with appropriate rights and current vendor documentation; fixture compatibility is not certification.
- Validate the M2 migration and contract suite against the selected managed PostgreSQL service; PGlite is PostgreSQL-compatible local evidence, not production-provider evidence.
- Configure and validate a managed OIDC provider, redirect registration, MFA policy, secrets, session behavior, and rate limits in staging.
- Validate the new GitHub workflow and configure required checks after publication; owner-only settings remain listed in `docs/GITHUB_SETTINGS_CHECKLIST.md`.
- Do not ingest live customer data. Managed object storage/malware/retention/restore validation, incident controls, managed PostgreSQL/OIDC validation, and the remaining production milestones are not yet complete.

## Status discipline

The current product remains a customer-demo-ready local sandbox. Production readiness, deployment validation, external customer validation, legal correctness, carrier acceptance, renewal, pricing, appeal success, and product-market fit are not claimed.
