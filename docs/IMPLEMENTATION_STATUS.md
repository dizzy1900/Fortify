# Implementation status

Measured on August 1, 2026 against [COMMERCIAL_NORTH_STAR.md](./COMMERCIAL_NORTH_STAR.md). This is the authoritative status ledger for the production transformation. A passing demo test does not prove a production capability.

## Current state

Fortify now has two explicit runtime modes. `sandbox` preserves the deterministic fictional demo in a tenant-marked SQLite `DemoState`; `production` requires PostgreSQL and uses normalized tenant records, OIDC-compatible identity, opaque server sessions, deny-by-default authorization, a private S3-compatible evidence boundary, and a clean-object-only portfolio import service without falling back to sandbox routes, local blob paths, or role switching. Managed storage, malware scanning, backup/restore, and deployment validation have not been exercised, so Fortify is still not a customer-data-ready system.

## Milestone ledger

| Milestone | State | Current evidence | Required before complete |
|---|---|---|---|
| M1 Repository, CI, status | Complete locally; GitHub run pending publication | Commercial brief, production plan, status ledger, CI workflow, blank-SQLite migration test, repository secret scan, GitHub settings checklist, and responsive-header repair; full local validation passed | Publish the workflow, read back GitHub checks, and apply owner settings; these are repository validation/administration gates, not missing M1 code |
| M2 PostgreSQL and sandbox isolation | Implemented locally; managed PostgreSQL validation pending | 32-table normalized PostgreSQL schema; 43 database triggers; explicit tenant context; transactional audit/idempotency/concurrency controls; deterministic sandbox migration; production routes do not fall back to `DemoState`; 6 PostgreSQL contract tests pass in PGlite | Run the migration and isolation suite against the selected managed PostgreSQL service and record provider-specific backup/restore and operational evidence |
| M3 Identity and authorization | Implemented locally; managed OIDC validation pending | 11 organization roles; OIDC/PKCE/state/nonce adapter; explicit local provider; opaque sessions; invitations; membership/session revocation; service/API, external-case, and support principals; 49-resource deny-by-default registry after the M5 foundation; direct tenant guards; protected production routes; attack tests pass | Configure the selected managed provider in staging, register redirects, enforce/test its MFA policy, validate secret handling/rate limits, and decide/validate defense-in-depth RLS |
| M4 Object storage | Implemented locally; managed providers and restore drill pending | Private tenant-prefixed S3-compatible adapter; signed PUT/GET; exact size/MIME/SHA-256/encryption checks; quarantine/content-signature/malware lifecycle; clean-only immutable evidence; expiring/revocable grants; retention/legal hold/deletion; audit; exact-byte fixture backup and restore; 4 storage contract tests pass | Validate a selected private bucket, credentials/CORS/KMS, live malware provider, retention/object-lock/lifecycle, operational deletion, independent backup destination, monitored restore drill, and redacted logging in staging |
| M5 Portfolio/SOV import | Backend foundation implemented locally; UI and external validation pending | Clean-object CSV/XLSX parsing; immutable saved mappings; generic AMS plus Applied Epic-compatible and AMS360-compatible fixture boundaries; stable-ID/address/building reconciliation; dry-run rejected/ambiguous quarantine; explicit human commit; idempotent reruns; immutable receipts; non-destructive transactional rollback; 5 contract tests pass | Add authenticated broker-visible import UI and route orchestration; exercise a rights-cleared real brokerage export; validate the selected managed storage/scanner/database path; do not represent fixture schemas as certified vendor integrations |
| M6 Document pipeline | Not started | Text/text-PDF deterministic notice parser with human confirmation | Durable scan/classify/OCR/extract/review/version pipeline with source-region provenance |
| M7 Playbooks/readiness | Not started | Versioned demo references plus one fixed six-component weighted heuristic | Versioned market playbooks and destination-specific deterministic blockers/statuses |
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
| Tenant isolation | Required authorized `TenantContext`, organization predicates, 72 same-organization/immutability triggers, and 49-resource cross-tenant policy tests | Implemented locally; managed PostgreSQL/RLS evaluation pending |
| Object storage | Sandbox local adapter is isolated; production uses a private tenant-prefixed S3-compatible adapter and normalized storage lifecycle | Implemented locally; managed provider/scanner/restore validation pending |
| Durable jobs | Synchronous request processing | Not implemented |
| Notice intelligence | Hard-coded deterministic parser | Partial demo only |
| Readiness | Fixed universal weighted calculation | Must be replaced |
| Import | Clean-object CSV/XLSX parser, saved mappings, dry-run row quarantine, stable-ID reconciliation, human-confirmed commit, receipts, and rollback service | Backend foundation implemented locally; authenticated UI, managed deployment, and rights-cleared external validation pending |
| External collaboration | Shared local demo views | Not implemented |
| Delivery | Local generated files | Not implemented |
| Outcome feedback graph | Fictional in-memory-shaped records | Not implemented |
| Backup/restore | None | Not implemented |

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

Current M1-M5-foundation evidence from August 1, 2026:

| Gate | Measured result |
|---|---|
| Consolidated local gate | `npm run verify` exited 0 |
| ESLint | Passed |
| Strict TypeScript | Passed |
| Unit/integration/migration | 9 files, 36 tests passed; M5 adds CSV/XLSX parsing, mapping/version immutability, duplicate and ambiguity quarantine, cross-tenant import guards, idempotency, normalized graph commit, receipt immutability, and transactional rollback coverage |
| Repository secret guard | Passed across 167 tracked and untracked, non-ignored files |
| Production build | Next.js 16.2.12 webpack build passed; 16 page routes and 21 API routes compiled |
| Deterministic evaluation | 12/12 checks passed; reset digest `db9db21485615453`; PDF 11,602 bytes; ZIP 51,723 bytes; manifest hash `47c5de9b8c2da8dfc040951b57697a2081fec8f1b3817e5148480aefaf9aef9a` |
| Guided browser suite | 4/4 passed serially on desktop Chromium and Pixel 7 profiles |
| Real UI inspection | Preserved sign-in and guided workspace regression-tested at desktop Chromium and Pixel 7 sizes; all public/workspace routes healthy; M4 adds protected APIs rather than a new visible control |
| Production dependency audit | `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities |
| Diff hygiene | `git diff --check` passed after the final documentation update |

The CI workflow, CodeQL job, and Trivy container job are implemented but have not yet executed on GitHub. Branch protection and repository security settings require owner configuration and readback under `GITHUB_SETTINGS_CHECKLIST.md`. The PostgreSQL contract suite uses PGlite locally; it is not proof of a selected managed provider, network policy, monitoring, or production deployment. The OIDC adapter has no live provider credentials, so discovery, redirect registration, MFA policy, and operational revocation are not deployment-validated. The storage suite uses deterministic bytes and an injected AWS SDK command boundary; it is not proof of a private managed bucket, live malware scanner, provider retention controls, or a disaster-recovery restore. Accessibility automation and the remaining operational checks are future gates.

## External gates

No rights-cleared brokerage data, ten-case production run, external market-reviewer use, pilot metrics, or paid continuation evidence is present. These remain separate external-validation gates and do not prevent implementation of adapters, fixtures, administration, or other unblocked milestones.
