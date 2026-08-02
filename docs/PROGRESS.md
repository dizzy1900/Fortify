# Progress

## Current milestone

M3 — The live California brokerage wedge is locally validated on August 1, 2026 and published as draft PR #10, stacked directly after draft PR #9. The prior M1–M7 renewal implementation remains a locally validated reusable foundation and published stacked PR series; it is not evidence that governed California sources, profiles, interventions, capital plans, funding, verification, model mapping, recognition commitments, live recognition delivery/outcomes, programme administration, deployment, or external validation exist.

## Replacement north-star M3 locally validated

- Expanded production persistence from 75 to 78 tables and from 157 to 168 guards/triggers with stable governed evidence requests, immutable request versions, and immutable exact generated submission artifacts. The deny-by-default registry now covers all 74 resource classes.
- Added `BrokerageCaseService` and four authenticated APIs for tenant/assignment-scoped workspace readback, human-confirmed request creation, controlled issue/expiry, and human-confirmed packet generation. Service-account principals cannot perform the governed member actions.
- Packet generation composes only normalized production records, exact-readback evidence versions, human-confirmed case-linked notice facts, governed requests, and explicit contradictions. It writes deterministic PDF/ZIP/manifest/letter objects under the tenant prefix, reads each back independently, and commits clean-object, scan, submission, artifact, audit, and idempotency records transactionally. Request versions and artifacts reject update/delete.
- The complete fixture proof begins with the real `PortfolioImportService`: a fictional California CSV creates normalized client/community/property/building/policy records, then an appeal case, durable notice intake/extraction and human review, governed request, evidence version, and immutable versioned packet. No production service imports or reads legacy `DemoState`.
- Added the responsive `/brokerage` workspace with explicit sandbox versus production API behavior, case/policy/property and notice provenance, request draft/issue controls, human packet confirmation, exact artifact hashes, and meaningful populated/loading/error/empty states. No production role switch or dead control was introduced.
- Full local gates passed: ESLint, strict TypeScript, 15 files/60 tests, 250-file secret scan, 22-page/46-API build, 12/12 deterministic sandbox evaluation, 18-pattern claims scan, 18/18 serial desktop/mobile Playwright scenarios, 78-table schema generation/no drift, exactly 168 migrated guards/triggers, and `npm audit --audit-level=moderate` with 0 vulnerabilities.
- Browser inspection covered 1280-pixel desktop, 834-pixel tablet, and Pixel 7 mobile. The first inspection found local-time date drift and a clipped mobile tab; UTC date-only display and a four-column mobile tab grid were implemented, rebuilt, rerun, and re-inspected with no measured document overflow.
- The production fixture generated a five-page Letter PDF and a four-entry ZIP containing the exact PDF, manifest, letter, and evidence exhibit. All pages were rendered; a right-edge footer overflow was repaired, regenerated, and re-inspected. ZIP integrity, manifest semantics, artifact sizes, and SHA-256 readback passed.
- Rights-cleared brokerage data, ten-case customer operation, managed PostgreSQL/OIDC/private-storage/scanner deployment, live request delivery, brokerage acceptance, and any insurance/recognition outcome remain explicit external or deployment gates.
- Publication used `codex/m3-live-brokerage-wedge` stacked on refreshed `origin/codex/m2-resilience-access-control`. The exact local merge tree `99eda38cf22b0a8ae3e62636cd3621b3e61bfb90` completed without conflicts; remote readback matched implementation commit `9eb70ab217d3cb16ba9fb070da000c2d693c031a`; and GitHub draft PR #10 reported the intended base/head and `mergeable=true`.

## Replacement north-star M2 locally validated

- Expanded production persistence from 73 to 75 tables and from 147 to 157 guards/triggers with purpose-specific portfolio assignments and immutable data-access logs; case assignments now retain the same purpose/data-domain/revocation metadata.
- Expanded the executable role ceiling from 11 compatibility roles to 18 roles including property operator administrator, property manager, contractor evidence contributor, independent verifier, programme administrator, insurer/MGA reviewer, and lender/funder reviewer. Separation-of-duty tests reject policy/submission/funding/market-response mutations outside each role boundary.
- Identity resolution now admits only active, unrevoked, unexpired direct case assignments plus direct/team portfolio assignments. The exact assignment permission set is intersected with the organization-role ceiling for each requested portfolio or case; empty, wrong-scope, expired, and revoked assignments fail closed.
- Added an authorization-enforced `AccessControlService`, three authenticated APIs, purpose/permission/data-domain validation, role-domain constraints, transactional audit events, reason-bound revocation, and immutable access-log recording. Database guards reject cross-tenant portfolio/member/team/external/case references even if service code is bypassed.
- Added the responsive `/access` workspace with meaningful loading, permission/error, empty, and populated states; functional synthetic assignment create/revoke; production API mode; security posture; append-only access ledger; and explicit ecosystem role boundaries. No production role switch exists.
- Added 5 M2 contract tests and expanded the identity matrix. The complete suite is 14 files/56 tests; the focused access/identity/data-plane suite is 21/21.
- Complete local release gates passed: ESLint, strict TypeScript, 237-file secret scan, 21-page/42-API build, 12/12 deterministic evaluation, 18-pattern claims scan, 16/16 serial desktop/mobile Playwright scenarios, 75-table schema regeneration/no drift, exactly 157 migrated guards/triggers, and `npm audit --audit-level=moderate` with 0 vulnerabilities.
- Browser inspection covered 1280-pixel desktop, 834-pixel tablet, and Pixel 7 mobile. The first mobile role matrix used an inner horizontal scroll; it was converted to fully labeled stacked rows, rebuilt, rerun, and re-inspected with no measured document overflow.
- Managed OIDC/MFA, PostgreSQL/RLS, private bucket/KMS/scanner, secrets, rate limits, operational restore, and authorized customer/partner role validation remain deployment/external gates. No live customer, contractor, verifier, insurer, lender, or programme user has validated this slice.
- Publication used `codex/m2-resilience-access-control` stacked on refreshed `origin/codex/m1-california-property-graph`. The exact local merge-tree preflight succeeded, remote SHA readback matched the published head, and GitHub draft PR #9 reported the intended base/head and `MERGEABLE`; its separate `UNSTABLE` aggregate reflected queued checks, not a merge conflict.

## Replacement north-star M1 locally validated

- Expanded production persistence from 65 to 73 tables and from 126 to 147 guards/triggers for property portfolios, portfolio membership, parcels, unit summaries, typed physical scopes, aliases, cross-property relationships, and immutable property versions.
- Added source/source-record, effective-period, confidentiality, data-right classification, and rights-recorded metadata to every new graph record. `docs/DATA_RIGHTS_AND_MOAT.md` defines the ten contract-ready classes and keeps cross-customer use prohibited by default.
- Added an authorization-enforced `PropertyGraphService`, authenticated read/register APIs, bounded runtime input validation, one-transaction audit/idempotency coupling, and database enforcement for tenant references, client/property/building/scope integrity, immediate version lineage, and immutable snapshot history. The deny-by-default registry now covers 69 resource classes.
- Added a deterministic California graph fixture under `org-fortify-california-fixture`, separate from the Colorado `org-fortify-sandbox`. Its two fictional properties retain two explicitly unavailable parcel boundaries, six typed scopes, reviewed aliases/relationship, and hash-bound property versions; replay is exact.
- Added the responsive `/property-graph` workspace with production API loading/error/empty states and an explicit sandbox fixture. Portfolio/property controls and property, scope, version, and rights views are functional; unavailable geometry is never rendered as a map or score.
- One consolidated `npm run verify` passed ESLint, strict TypeScript, 13 files/50 tests, a 225-file secret scan, the 20-page/39-API build, 12/12 deterministic evaluation, the 18-pattern claims scan, and 14/14 serial desktop/mobile Playwright scenarios. Production schema generation reported 73 tables/no drift, `npm audit --omit=dev` reported 0 vulnerabilities, and `git diff --check` passed.
- Visually inspected the property workspace at 1280-pixel desktop, 834-pixel tablet, and Pixel 7 mobile sizes. Identity, insufficient spatial state, scope, rights, and provenance remained legible with no measured overflow or observed clipping.
- Managed PostgreSQL/PostGIS, defense-in-depth RLS, live property boundaries, rights-cleared California input, performance/load testing, and customer validation remain explicit deployment/external gates.
- Exact local merge-tree preflight against refreshed `origin/codex/resilience-os-foundation` succeeded. GitHub readback for draft PR #8 reported the intended base/head and `MERGEABLE`; `UNSTABLE` is the check state, not a merge conflict.

## Replacement north-star M0 locally validated

- Persisted the replacement California-first Resilience Investment and Insurance Recognition OS brief as the authoritative commercial north star.
- Reconciled `AGENTS.md`, the ordered M0–M12 implementation plan, and the measured status ledger. Status now distinguishes not started, in progress, code complete, locally validated, deployment validated, externally blocked, customer validated, market validated, and programme validated.
- Preserved the Colorado renewal workflow as an isolated synthetic sandbox and second-jurisdiction regression fixture; removed only the uncommitted superseded M8 draft created after PR #6.
- Added an enforceable `security:claims` release gate covering direct insurance/funding/loss guarantees, Fortify certification or risk-score claims, automatic model/eligibility/compliance claims, and unsafe/insurable assertions across runtime source and generated text artifacts. The gate is wired into local `verify` and both relevant CI jobs.
- Reconciled README, architecture, data-model, progress, and validation-report boundaries. Existing 65-table/126-trigger/61-resource evidence remains accurately described as renewal foundation rather than the expanded product.
- Repositioned the public entry around the California resilience-recognition direction while labelling the existing renewal workspace as an isolated fictional Colorado sandbox. Added a doctrine/responsiveness browser test and captured desktop, tablet, and mobile evidence with no measured overflow or observed clipping.
- One consolidated `npm run verify` passed ESLint, strict TypeScript, 12 files/45 tests, a 214-file secret scan, the 19-page/37-API production build, 12/12 deterministic evaluation, the 18-pattern claims scan, and 12/12 serial desktop/mobile Playwright scenarios. Production schema generation reported 65 tables/no drift and `npm audit --omit=dev` reported 0 vulnerabilities.
- Re-rendered and inspected all six PDF pages and integrity-checked the 17-entry ZIP. The packet preserves explicit caveats, unresolved evidence, a manifest, 14 exhibits, and byte-identical embedded/standalone PDF hashes.

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

## M5 locally implemented this cycle

- Expanded the production schema from 48 to 53 tables and from 61 to 72 tenant/immutability triggers for saved import mappings and immutable versions, import runs, quarantined rows, and append-only preview/commit/rollback receipts.
- Added real CSV and XLSX parsing with configurable sheet/header rows, typed spreadsheet values, limits, deterministic normalization, ISO currency/unit/year/date validation, stable external identifiers, and explicit row numbers.
- Added generic AMS CSV mapping plus Applied Epic-compatible and AMS360-compatible fixture boundaries. These fixtures are not customer exports, vendor certifications, or live integrations.
- Added dry-run duplicate/ambiguity review, address and building reconciliation, explicit human confirmation, AMS-authoritative stable-ID matching, idempotent reruns, normalized client/community/property/location/building/policy output, immutable receipts, and non-destructive transactional rollback.
- Added 7 authenticated production APIs for organization-scoped workspace options, clean-object mapping suggestion, immutable mapping save, preview, import readback, human-confirmed commit, and rollback. Validation/state/idempotency failures map to explicit 4xx responses.
- Added the responsive `/imports` broker workspace with upload-to-quarantine, scanner-state enforcement, clean-object/book selection, saved mapping review, row filters, explicit confirmation, receipt ledger, recent history, rollback reason, and meaningful loading/error/empty/populated states. The sandbox walkthrough is visibly synthetic and does not persist or claim vendor compatibility.
- Authored and visually inspected the XLSX fixture at `tests/fixtures/import/fortify-sov-fixture.xlsx`; formula/error inspection found no workbook errors. Added edge-case CSV fixtures and 6 service/contract tests.
- Full local validation passed: ESLint, strict TypeScript, 9 files/37 tests, 177-file secret scan, 17-page/28-API production build, 12/12 deterministic evaluation, 6/6 serial desktop/mobile Playwright scenarios, and `npm audit --omit=dev --audit-level=high` with 0 vulnerabilities. The import workspace was visually inspected at both viewports after repairing a measured mobile table-overflow defect.

## M6 locally implemented this cycle

- Expanded the production schema from 53 to 59 tables and from 72 to 100 tenant/immutability triggers for durable jobs, immutable attempts and extraction runs, source passages with regions, multiple extracted candidates, human reviews, and superseding fact versions.
- Added clean-object-only, exact-byte/hash-bound intake and a PostgreSQL job service with idempotency, worker leases, stale-lease recovery, bounded retry schedules, explicit dead letter, and reason-bound manual +1 retry.
- Added deterministic provider/classifier/extractor contracts. The offline production adapter supports plain text and selectable PDFs without invented geometry; exact-hash fixtures cover scans, rotated regions, tables, images, conflicts, low confidence, and model-derived candidates. The external-provider boundary is injection-only and carries no live right or credential claim.
- Added immutable page/segment/region provenance, provider/classifier/extractor versions, multiple candidate ordinals, confidence and derivation disclosure, human confirmation/correction/rejection, and append-only superseding fact versions. Service accounts cannot confirm facts.
- Added 4 authenticated production APIs, a separately scoped one-job worker command, and the responsive `/documents` workspace with quarantine/clean-object boundaries, durable ledger, dead-letter control, filtering/pagination, side-by-side citation review, immutable decisions, fact history, and meaningful production/sandbox states.
- Added 4 service/contract tests covering the document matrix, retry/dead-letter behavior, attempt/candidate immutability, model-derived human gates, corrections/supersession, unscanned/unsupported objects, and cross-tenant rejection.
- Full local validation passed: ESLint, strict TypeScript, 10 files/41 tests, 192-file secret scan, 18-page/32-API production build, 12/12 deterministic evaluation, 8/8 serial desktop/mobile Playwright scenarios, production schema regeneration with no drift, and `npm audit --omit=dev` with 0 vulnerabilities. All six deterministic PDF pages and the 17-entry ZIP were inspected; desktop/mobile document states were visually checked without observed overflow or clipping.

## M7 locally implemented this cycle

- Expanded the production schema from 59 to 65 tables and from 100 to 126 tenant, governance, and immutability triggers for stable market playbooks, immutable versions, destination requirement rules, bounded applicability conditions, independent reviews, and append-only case/destination links.
- Added exact market/program/jurisdiction/peril/property-class/policy-form and effective-period applicability. Zero approved matches and overlapping approved matches fail closed; no version is silently selected.
- Added source name, URL, version, exact citation, verify-current state, content hash, author, reviewer, predecessor, change summary, and deterministic diff readback. Authors cannot review their own versions, approval requires verify-current, and reviewed configuration is corrected only through a successor.
- Added deterministic `ready`, `missing`, `stale`, `scope_mismatch`, `contradiction`, `unreviewed`, `insufficient`, and `not_applicable` requirement states. Accepted type/source/disposition, scope, freshness, and review checks must be satisfied together; an unresolved blocker always yields `blocked` and no average is calculated.
- Added a 61-resource deny-by-default policy, five authenticated APIs, and the responsive `/playbooks` workspace with populated/loading/error/empty behavior, exact destination evaluation, case pinning, source governance, bounded requirement selection, version history, independent review, and explicit non-score/non-outcome caveats.
- Added `docs/MARKET_PLAYBOOK_GOVERNANCE.md` and 3 service/contract tests covering lifecycle, exact applicability, ambiguity, cross-tenant rejection, immutable links, successor diffs, all requirement states, and proof that completed items cannot average away a blocker.
- The final consolidated `npm run verify` exited 0 with approved localhost-bind permission: ESLint, strict TypeScript, 11 files/44 tests, 209-file secret scan, 19-page/37-API production build, 12/12 deterministic evaluation, and 10/10 serial desktop/mobile Playwright scenarios. Production schema regeneration reported no drift, and `npm audit --omit=dev` reported 0 vulnerabilities. An earlier sandboxed attempt reached Playwright before its bind was denied; that attempt is retained only as environment evidence. Playbook readiness, builder, and approved successor history were visually inspected at both viewports with no document-width overflow.

## Next

- Keep draft PR #7 stacked on M7 until the predecessor is ready; local merge-tree and GitHub both report the exact M0 stack conflict-free at publication.
- Keep draft PR #9 stacked directly on draft PR #8; exact ancestry, local merge-tree preflight, remote head SHA, and GitHub mergeability were verified at publication. Begin the production California brokerage wedge without weakening the tenant or assignment boundary.
- Validate the property graph against the selected managed PostgreSQL/PostGIS provider and evaluate defense-in-depth RLS; the local PGlite and nullable EPSG:4326-ready GeoJSON contracts are not provider, PostGIS, or performance evidence.
- Validate rights-cleared brokerage exports and correspondence against the generic adapters; fixture compatibility is not certification. Validate any external OCR/document-intelligence provider only after licensing, egress, retention, credentials, security, latency, cost, and error behavior are approved.
- Validate the M2 migration and contract suite against the selected managed PostgreSQL service; PGlite is PostgreSQL-compatible local evidence, not production-provider evidence.
- Configure and validate a managed OIDC provider, redirect registration, MFA policy, secrets, session behavior, and rate limits in staging.
- With explicit approval, repair the diagnosed Node slim-image native build prerequisite and isolate the SQLite/Vitest worker-shutdown issue; CodeQL/security already passed. Configure owner-only settings listed in `docs/GITHUB_SETTINGS_CHECKLIST.md`.
- Do not ingest live customer data. Managed object storage/malware/retention/restore validation, incident controls, managed PostgreSQL/OIDC validation, and the remaining production milestones are not yet complete.

## Status discipline

The current product remains a customer-demo-ready local sandbox. Production readiness, deployment validation, external customer validation, legal correctness, carrier acceptance, renewal, pricing, appeal success, and product-market fit are not claimed.
