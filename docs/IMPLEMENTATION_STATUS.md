# Implementation status

Measured on August 1, 2026 against [COMMERCIAL_NORTH_STAR.md](./COMMERCIAL_NORTH_STAR.md). This is the authoritative status ledger for the production transformation. A passing demo test does not prove a production capability.

## Current state

Fortify now has two explicit runtime modes. `sandbox` preserves the deterministic fictional demo in a tenant-marked SQLite `DemoState`; `production` requires PostgreSQL and uses normalized tenant records, OIDC-compatible identity, opaque server sessions, deny-by-default authorization, a private S3-compatible evidence boundary, clean-object-only portfolio imports, durable document processing, and immutable destination playbooks with deterministic evidence-readiness states without falling back to sandbox routes, local blob paths, or role switching. Managed storage, malware scanning, managed workers, live OCR/document-intelligence rights, rights-cleared destination guidance, backup/restore, and deployment validation have not been exercised, so Fortify is still not a customer-data-ready system.

## Milestone ledger

| Milestone | State | Current evidence | Required before complete |
|---|---|---|---|
| M1 Repository, CI, status | Complete locally; remote CI remediation and owner settings pending | Commercial brief, production plan, status ledger, CI workflow, blank-SQLite migration test, repository secret scan, GitHub settings checklist, and responsive-header repair; CodeQL/security checks passed remotely; quality/container jobs exposed reproducible infrastructure issues | With explicit approval, repair the Node container native-build toolchain and isolate the SQLite/Vitest worker-shutdown issue; apply/read back owner settings. These are repository/CI operations, not evidence that later production milestones pass |
| M2 PostgreSQL and sandbox isolation | Implemented locally; managed PostgreSQL validation pending | 32-table normalized PostgreSQL schema; 43 database triggers; explicit tenant context; transactional audit/idempotency/concurrency controls; deterministic sandbox migration; production routes do not fall back to `DemoState`; 6 PostgreSQL contract tests pass in PGlite | Run the migration and isolation suite against the selected managed PostgreSQL service and record provider-specific backup/restore and operational evidence |
| M3 Identity and authorization | Implemented locally; managed OIDC validation pending | 11 organization roles; OIDC/PKCE/state/nonce adapter; explicit local provider; opaque sessions; invitations; membership/session revocation; service/API, external-case, and support principals; 61-resource deny-by-default registry after M7; direct tenant guards; protected production routes; attack tests pass | Configure the selected managed provider in staging, register redirects, enforce/test its MFA policy, validate secret handling/rate limits, and decide/validate defense-in-depth RLS |
| M4 Object storage | Implemented locally; managed providers and restore drill pending | Private tenant-prefixed S3-compatible adapter; signed PUT/GET; exact size/MIME/SHA-256/encryption checks; quarantine/content-signature/malware lifecycle; clean-only immutable evidence; expiring/revocable grants; retention/legal hold/deletion; audit; exact-byte fixture backup and restore; 4 storage contract tests pass | Validate a selected private bucket, credentials/CORS/KMS, live malware provider, retention/object-lock/lifecycle, operational deletion, independent backup destination, monitored restore drill, and redacted logging in staging |
| M5 Portfolio/SOV import | Implemented locally; managed-provider and rights-cleared external validation pending | Clean-object CSV/XLSX parsing; immutable saved mappings; generic AMS plus Applied Epic-compatible and AMS360-compatible fixture boundaries; stable-ID/address/building reconciliation; dry-run rejected/ambiguous quarantine; explicit human commit; idempotent reruns; immutable receipts; non-destructive transactional rollback; 7 authenticated production APIs; responsive broker workspace with loading/error/empty/populated/review/receipt/rollback states; 6 contract tests and 2 viewport workflow scenarios pass | Exercise a rights-cleared real brokerage export and selected managed storage/scanner/database path; do not represent fixture schemas as certified vendor integrations; production data remains prohibited until the separate deployment/security gates pass |
| M6 Document pipeline | Implemented locally; managed worker/provider and rights-cleared validation pending | Clean-object intake; PostgreSQL leases, retries, stale-lease recovery and dead letter; versioned provider/classifier/extractors; immutable page/segment/region passages and multiple candidates; confidence/model-derived disclosure; human confirmation/correction/rejection; superseding fact versions; 4 authenticated APIs; separately scoped worker; 4 matrix/contract tests and 2 viewport workflows pass | Validate a rights-cleared correspondence matrix and selected managed worker/OCR provider; verify licensing, egress, retention, redaction, credentials, cost/latency/error behavior, rotations/tables/images, and human-review accuracy. The offline provider supports only text and selectable PDFs |
| M7 Playbooks/readiness | Implemented locally; rights-cleared destination validation pending | Six normalized playbook/version/rule/review/link tables; bounded conditions; exact scope/effective-date applicability; source/version/citation/verify-current; author-reviewer separation; immutable successors/diffs; append-only case pins; explicit missing/stale/scope/contradiction/unreviewed/insufficient/not-applicable states; blocker-preserving no-average result; 5 authenticated APIs; responsive administrator workspace; 3 contract tests and 2 viewport workflows pass | Validate tenant-authored playbooks against rights-cleared brokerage/market guidance and a managed database deployment; confirm operational author/reviewer governance and destination mapping with a design partner. No carrier acceptance is inferred |
| M8 Renewal/external evidence | Partial demo only | Guided local workflow, tasks, and demo roles | Production assignments, communications, bulk workflow, scoped contributor access, expiry/revocation/consent |
| M9 Submission/reviewer | Partial demo only | Real deterministic PDF/ZIP, manifest, exhibits, human gates, local read-only underwriter role | Tenant/market templates, immutable versions, secure delivery, scoped reviewer session and receipts |
| M10 Response/outcomes | Partial demo only | Fictional seeded clarification and outcomes | Normalized live event taxonomy, original language, correction/supersession and destination graph |
| M11 Analytics/moat | Not started | Fictional demo reports | Tenant-only measured analytics, consent/data rights, de-identification and disclosure controls |
| M12 Email/AMS | Not started | No production integrations | Microsoft Graph and AMS boundaries, contracts, fixtures, administration, health and credential-gated validation |
| M13 Security/deployment/restore | Not started | Reproducible local Dockerfile and `/api/health`; no production topology | Hardening, staging/production, observability, retention, incident response, encrypted backup and tested restore |
| M14 Design-partner acceptance | Blocked on future external evidence | Discovery materials exist; no rights-cleared production dataset or reviewer evidence | Rights-cleared brokerage import, 10 redacted cases, external reviewer, pilot metrics, discrepancies resolved, paid continuation |

## Critical architecture gaps

| Requirement | Current implementation | Status |
|---|---|---|
| Tenant source of truth | Normalized tenant-owned PostgreSQL records in production; `DemoState` retained only in explicit sandbox mode | Implemented locally; deployment validation pending |
| Production database | `pg`/Drizzle adapter, generated migration, health query, and deterministic seed migration | Implemented locally; managed PostgreSQL validation pending |
| Authentication | Sandbox role switch is isolated; production uses OIDC-compatible identity and opaque server-side sessions | Implemented locally; managed-provider/MFA validation pending |
| Server authorization | Session/credential-derived principals and deny-by-default role/scope/case policy at route, service, and repository boundaries | Implemented locally; staging attack/rate-limit validation pending |
| Tenant isolation | Required authorized `TenantContext`, organization predicates, 126 same-organization/immutability/governance triggers, and 61-resource cross-tenant policy tests | Implemented locally; managed PostgreSQL/RLS evaluation pending |
| Object storage | Sandbox local adapter is isolated; production uses a private tenant-prefixed S3-compatible adapter and normalized storage lifecycle | Implemented locally; managed provider/scanner/restore validation pending |
| Durable jobs | PostgreSQL queue with service-account claims, leases, stale recovery, bounded retries, dead letter, manual +1 retry, and immutable attempts | Implemented locally; managed-worker operations pending |
| Notice intelligence | Production provider/classifier/extractor contracts with immutable citations, multiple candidates, confidence/model-derived disclosure, and human-confirmed fact versions; legacy hard-coded parser remains sandbox-only | Implemented locally; live OCR/provider rights and external accuracy validation pending |
| Readiness | Production uses exact approved destination versions and named deterministic requirement states; any unresolved blocker makes the result blocked and `averageUsed=false`. The legacy percentage remains isolated to the fictional sandbox/artifact regression | Implemented locally; rights-cleared configuration and external workflow validation pending |
| Import | Clean-object CSV/XLSX parser, saved mappings, dry-run row quarantine, stable-ID reconciliation, human-confirmed commit, receipts, rollback service, authenticated API orchestration, and broker workspace | Implemented locally; managed deployment and rights-cleared external validation pending |
| External collaboration | Shared local demo views | Not implemented |
| Delivery | Local generated files | Not implemented |
| Outcome feedback graph | Fictional in-memory-shaped records | Not implemented |
| Backup/restore | Exact-byte fixture backup/readback contract | Implemented locally; independent managed destination and monitored restore drill pending |

## Preserved regression surface

The production rewrite must continue to prove:

- deterministic sandbox reset and fictional-data labeling;
- current guided notice-to-packet route story or a superior production route;
- human confirmation of extracted fields and every submission;
- real PDF and ZIP generation, evidence hashes, manifest, provenance, caveats, and exhibits;
- append-only audit behavior and evidence supersession;
- explicit missing, stale, contradictory, scoped, and unreviewed evidence states;
- non-predictive language with no Fortify risk score or outcome guarantee;
- institutional light-theme UI with populated, loading, error, and empty states.

## Validation evidence

Current M1-M7 local evidence from August 1, 2026:

| Gate | Measured result |
|---|---|
| Consolidated local gate | `npm run verify` exited 0 against the M7 tree with approved localhost-bind permission; no remote status is counted as local evidence |
| ESLint | Passed |
| Strict TypeScript | Passed |
| Unit/integration/migration | 11 files, 44 tests passed; M7 adds exact applicability, author/reviewer separation, source-current approval gate, immutable versions/rules/reviews/links, successor diffs, cross-tenant links, all eight requirement states, and proof a ready recommendation cannot offset a missing blocker |
| Repository secret guard | Passed across 209 tracked and untracked, non-ignored files |
| Production build | Next.js 16.2.12 webpack build passed; 19 product page routes and 37 API routes compiled |
| Deterministic evaluation | 12/12 checks passed; reset digest `db9db21485615453`; PDF 11,602 bytes; ZIP 51,723 bytes; manifest hash `47c5de9b8c2da8dfc040951b57697a2081fec8f1b3817e5148480aefaf9aef9a` |
| Guided browser suite | 10/10 passed serially on desktop Chromium and Pixel 7 profiles, including portfolio, document, and playbook author/review/version-history/blocker workflows |
| Real UI inspection | Playbook readiness, builder, approved successor history, source/hash/reviewer evidence, and desktop/mobile layouts were inspected; mobile tabs were tightened after inspection; no document-width overflow remained and all public/workspace routes were healthy |
| Production dependency audit | `npm audit --omit=dev`: 0 vulnerabilities |
| Diff hygiene | `git diff --check` passed after the final documentation update |

GitHub checks have now executed on the stacked M5 PR. CodeQL/security passed; the container job fails before Trivy because the slim Node image lacks the native build toolchain required by `better-sqlite3`, and the quality job reports three SQLite/Vitest workers exiting after their tests while the PGlite suites pass. Those CI fixes require explicit approval and are not included in M6 or M7. Branch protection and repository security settings still require owner configuration/readback under `GITHUB_SETTINGS_CHECKLIST.md`. PGlite, fictional playbooks, injected storage/provider fixtures, and the local selectable-text adapter are not proof of a selected managed database, private bucket, malware service, OCR provider, rights-cleared destination guidance, worker topology, monitoring, or production deployment. Accessibility automation and the remaining operational checks are future gates.

## External gates

No rights-cleared brokerage data, ten-case production run, external market-reviewer use, pilot metrics, or paid continuation evidence is present. These remain separate external-validation gates and do not prevent implementation of adapters, fixtures, administration, or other unblocked milestones.
