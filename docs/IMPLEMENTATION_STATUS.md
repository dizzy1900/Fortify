# Implementation status

Measured on August 1, 2026 against [COMMERCIAL_NORTH_STAR.md](./COMMERCIAL_NORTH_STAR.md). This is the authoritative status ledger for the production transformation. A passing demo test does not prove a production capability.

## Current state

Fortify is a deterministic, customer-demo-ready local sandbox. It is not a secure multi-tenant production system and must not receive live customer data. The current runtime persists one global `DemoState` document in SQLite, exposes an unauthenticated state API, uses demo role switching, applies a fixed readiness heuristic, parses notices with hard-coded local rules, and writes evidence/artifacts to local disk.

## Milestone ledger

| Milestone | State | Current evidence | Required before complete |
|---|---|---|---|
| M1 Repository, CI, status | Complete locally; GitHub run pending publication | Commercial brief, production plan, status ledger, CI workflow, blank-SQLite migration test, repository secret scan, GitHub settings checklist, and responsive-header repair; full local validation passed | Publish the workflow, read back GitHub checks, and apply owner settings; these are repository validation/administration gates, not missing M1 code |
| M2 PostgreSQL and sandbox isolation | Not started | Drizzle/SQLite schema exists, but `app_state.state_json` is the runtime source of truth | Normalized PostgreSQL runtime, transactional tenant repositories, seed migration, no production blob fallback |
| M3 Identity and authorization | Not started | Three server-checked demo roles only | OIDC/local identity, sessions, memberships, deny-by-default policies, resource-complete cross-tenant tests |
| M4 Object storage | Not started | Path-normalized local filesystem adapter | Private tenant-prefixed S3-compatible storage, signed access, scanning/quarantine, retention/legal hold/deletion/backup and audit |
| M5 Portfolio/SOV import | Not started | Three deterministic seeded communities | CSV/XLSX/SOV mapping, preview, identity resolution, quarantine, idempotency, receipts and rollback |
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
| Tenant source of truth | Global `DemoState` JSON in `app_state.state_json` | Not implemented |
| Production database | Local file-backed SQLite | Not implemented |
| Authentication | Client-selectable demo role | Not implemented |
| Server authorization | Coarse mutation guard on demo actions | Partial demo only |
| Tenant isolation | No production organization scope | Not implemented |
| Object storage | Local source-adjacent filesystem paths | Not implemented |
| Durable jobs | Synchronous request processing | Not implemented |
| Notice intelligence | Hard-coded deterministic parser | Partial demo only |
| Readiness | Fixed universal weighted calculation | Must be replaced |
| Import | Deterministic seed/reset only | Not implemented |
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

Current M1 evidence from August 1, 2026:

| Gate | Measured result |
|---|---|
| Consolidated local gate | `npm run verify` exited 0 |
| ESLint | Passed |
| Strict TypeScript | Passed |
| Unit/integration/migration | 4 files, 10 tests passed; blank SQLite migration verified 30 domain tables and both audit immutability triggers |
| Repository secret guard | Passed across 101 tracked and untracked, non-ignored files |
| Production build | Next.js 16.2.12 webpack build passed; public page, 16 product routes, and 7 API routes compiled |
| Deterministic evaluation | 12/12 checks passed; reset digest `db9db21485615453`; PDF 11,602 bytes; ZIP 51,723 bytes; manifest hash `47c5de9b8c2da8dfc040951b57697a2081fec8f1b3817e5148480aefaf9aef9a` |
| Guided browser suite | 4/4 passed serially on desktop Chromium and Pixel 7 profiles |
| Real UI inspection | Desktop 1440 px, tablet 768 px, and mobile 390 px inspected; no horizontal overflow; no browser console errors; mobile header collision repaired and rechecked |
| Production dependency audit | `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities |
| Diff hygiene | `git diff --check` passed after the final documentation update |

The CI workflow, CodeQL job, and Trivy container job are implemented but have not yet executed on GitHub. Branch protection and repository security settings require owner configuration and readback under `GITHUB_SETTINGS_CHECKLIST.md`. Accessibility automation, PostgreSQL migration coverage, tenant-isolation coverage, backup/restore, and deployment checks remain future milestone gates rather than placeholder passes.

## External gates

No rights-cleared brokerage data, ten-case production run, external market-reviewer use, pilot metrics, or paid continuation evidence is present. These remain separate external-validation gates and do not prevent implementation of adapters, fixtures, administration, or other unblocked milestones.
