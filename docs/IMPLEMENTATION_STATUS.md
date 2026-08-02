# Implementation status

Measured on August 1, 2026 against [COMMERCIAL_NORTH_STAR.md](./COMMERCIAL_NORTH_STAR.md). This ledger separates reusable renewal foundations from the broader California Resilience Investment and Insurance Recognition OS. A passing legacy demo or M1–M7 renewal test does not prove profiles, interventions, funding, verification, model mapping, recognition, deployment, or external acceptance.

## Current state

Fortify preserves a deterministic fictional Colorado renewal sandbox and has a substantial locally validated production foundation: normalized tenant-scoped PostgreSQL, OIDC-compatible identity, deny-by-default authorization, private S3-compatible storage contracts, portfolio import, durable document processing, immutable market playbooks, and destination-specific evidence readiness. The current production schema has 65 tables, 126 database guards/triggers, and 61 authorization resource classes at commit `2e92041` / draft PR #6.

The replacement north star makes California the initial production jurisdiction and expands the product into governed resilience investment, funding, independent verification, external-model mapping, explicit market commitments, and insurance-recognition outcomes. Those expanded capabilities are not implied by the existing renewal implementation. No managed deployment, rights-cleared California portfolio, authoritative California source register, real verifier, funding sponsor, model provider, insurer reviewer, backup restore, or paid pilot has been validated.

## Milestone ledger

| Milestone | State | Current evidence | Required next evidence |
|---|---|---|---|
| M0 Product doctrine/release foundation | Locally validated; draft PR #7 published | Authoritative brief and operating contract; reconciled architecture/data/status/validation docs; nine-level evidence hierarchy; external-gate register; empty governed California source register; public California direction with isolated Colorado sandbox; 18-pattern claims gate; full local release baseline | Keep deployment, customer, market, programme, and other external validation separate; begin M1 without implying external readiness |
| M1 Production data plane/sandbox | In progress; renewal foundation locally validated | Explicit sandbox/production modes; normalized PostgreSQL source of truth; tenant repositories; migrations; idempotency/concurrency/audit; PGlite contracts; no production fallback to `DemoState` | Add California fixture organization and property graph gaps including parcel, unit summary, aliases/relationships/versions, confidentiality/data-right fields, and spatial-ready boundaries; validate selected managed PostgreSQL/PostGIS and RLS |
| M2 Identity/secure evidence | In progress; renewal foundation locally validated | OIDC/PKCE/state/nonce boundary, local provider, opaque sessions, memberships, teams, assignments, external principals/grants, service/API credentials, support grants, private storage, quarantine/scanning, retention/legal hold, exact-byte fixture restore | Add resilience roles (operator, contractor, verifier, programme, lender/funder), portfolio assignment, data-access log, scoped purpose-specific experiences, managed OIDC/MFA, private bucket/KMS/scanner, and operational restore |
| M3 Live brokerage wedge | In progress | CSV/XLSX import with mapping/quarantine/rollback, persistent client/community/property/building/policy/case records, durable document pipeline, human-confirmed facts, current PDF/ZIP sandbox artifacts | Make California fixtures and production routes cover the live renewal/appeal case, external evidence workflow, production-architecture submission bytes, and full non-`DemoState` brokerage journey; rights-cleared import remains external |
| M4 California source/playbooks | In progress | Immutable market playbooks, source URL/version/citation/verify-current, bounded applicability, independent author/reviewer lifecycle, exact case pins, deterministic blocker-preserving readiness | Build governed California policy/programme/model/insurer source register, approved snapshots/rights, publication, supersession/change alerts, impact analysis, and target-profile-aware recognition playbooks using primary/authorised sources |
| M5 Profiles/interventions/capital planning | Not started | No governed target-profile or intervention registry; existing requirements and evidence types are only adjacent primitives | Versioned profiles, intervention specifications, evidence hierarchy, baseline/gap assessment, projects, transparent capital scenarios, maintenance, and real browser workflow |
| M6 Funding/project execution | Not started | Generic tasks and maintenance events are adjacent only | Funding programmes/versions, eligibility, blended commitments, costs, milestones/dependencies, human approvals, export boundary, stakeholder benefit ledger, and scoped collaborator workflows |
| M7 Independent verification | Not started | Human evidence review is not independent-verifier governance | Verifier organizations/credentials/conflicts, assignments, methods, findings/exceptions/corrective action, certificates/revocation, maintenance and provenance-complete conclusions |
| M8 Model mapping/commitments | Not started | Existing market/playbook source fields do not model external models, inputs, acceptance, or commitments | External model/version/input registry, rights/limitations, proposed-to-accepted mapping history, explicit commitment registry, and evidence hierarchy enforcement |
| M9 Recognition submission/outcomes | Partial sandbox only | Deterministic sandbox PDF/ZIP, confirmation, clarification, and fictional outcomes | Production immutable recognition submissions, exact bytes/hash, scoped reviewer, delivery receipts, separate evidence/model/rating/underwriting/placement/funding taxonomies, corrections, and maintenance roll-forward |
| M10 Programme administration/analytics | Not started | Fictional demo reports only | Sponsor cohorts, benefit ledger, recognition graph, tenant analytics, ROI/programme reports, opt-in/cohort/de-identification/suppression controls |
| M11 Production integrations | Not started | Generic AMS-compatible fixtures and provider boundaries; no live connection | Graph email, Gmail/drive, AMS/property/model/verifier adapters, signed webhooks, health, pagination/rate limits, sync receipts, replay/dead-letter, credential gates |
| M12 Operational hardening/launch | Not started | Local Dockerfile, health route, CI workflow, dependency/secret/CodeQL evidence | Security/privacy/data-flow documents, CSP/CSRF/rate limits/RLS/log redaction, accessibility/visual gates, staging/production release, observability, encrypted backup/PITR, measured restore, full 33-step fixture flow, and launch report |

## Architecture truth table

| Requirement | Current evidence | Status |
|---|---|---|
| Production source of truth | Normalized PostgreSQL; SQLite `DemoState` isolated to sandbox | Renewal foundation locally validated; expanded domain incomplete |
| Tenant isolation | Tenant context, organization predicates, database guards, deny-by-default policy, cross-tenant tests | Locally validated for 61 current resource classes; every new resource still requires attack coverage |
| Authentication | OIDC-compatible interface and local provider; opaque server sessions | Locally validated interface; managed provider/MFA deployment pending |
| Secure evidence | S3-compatible signed operations, hash/MIME/size/encryption checks, quarantine/scanning, retention/legal hold, access grants | Local adapter/contract evidence only |
| Portfolio and property | CSV/XLSX mapping, stable IDs, address/building reconciliation, normalized core records | California/spatial and expanded graph incomplete |
| Document intelligence | Durable jobs, provider/classifier/extractor versions, citations, multiple candidates, human correction/supersession | Offline selectable-text adapter only; live rights/provider validation pending |
| Market readiness | Exact approved destination version; missing/stale/scope/contradiction/review states; blockers fail closed; no average | Locally validated renewal capability; profile/model/funding/verification readiness absent |
| Evidence hierarchy | No typed nine-level resilience evidence separation | Not started |
| Capital/funding | No governed profiles, interventions, projects, capital plans, programmes, commitments, approvals, or exports | Not started |
| Verification | No independent verifier credential/assignment/finding/certificate model | Not started |
| Model/commitment recognition | No external model-input mapping or explicit market/funder commitment registry | Not started |
| Recognition delivery/outcomes | Sandbox artifacts and fictional outcomes only | Production implementation incomplete |
| Analytics/data rights | Organization opt-in flag only | Governance, rights taxonomy, cohort/de-identification/suppression incomplete |
| Deployment/restore | Local build and exact-byte fixture backup/readback | Managed deployment/PITR/restore not validated |

## Preserved regression surface

The transformation must continue to prove:

- deterministic Colorado sandbox reset and synthetic labeling;
- guided notice-to-packet story, provenance, contradiction resolution, clarification, outcomes, and next-cycle reuse;
- real PDF/ZIP artifacts, hashes, manifests, caveats, and exhibits;
- human confirmation of extracted facts and every market submission;
- append-only audit and explicit supersession;
- explicit missing, stale, unsupported, contradictory, scoped, unreviewed, unverified, expired, and unaccepted states;
- no Fortify risk score or unsupported insurance, resilience, funding, verification, model, rating, underwriting, performance, or claims claim;
- calm institutional UI with functional populated, loading, error, empty, insufficient-evidence, and permission-denied states.

## Last confirmed local evidence

The M0 doctrine tree stacked on M7 passed one consolidated `npm run verify` invocation on August 1, 2026 with approved localhost binding:

- ESLint and strict TypeScript passed.
- Vitest: 12 files / 45 tests.
- Repository secret scan: 214 non-ignored files.
- Next.js build: 19 product pages / 37 API routes.
- Deterministic sandbox evaluation: 12/12.
- Prohibited-claims scan: 18 direct patterns across runtime source and generated text artifacts.
- Playwright: 12/12 desktop Chromium and Pixel 7 scenarios, including explicit desktop/tablet/mobile public-doctrine inspection.
- Production schema regeneration: 65 tables, no drift.
- `npm audit --omit=dev`: 0 vulnerabilities.
- All six deterministic PDF pages were rendered and inspected; the 17-entry ZIP passed integrity/content review and contains the exact standalone PDF bytes.
- `git diff --check` passed.
- Exact local merge-tree preflight and GitHub readback report draft PR #7 mergeable without conflicts against `codex/m7-market-playbooks`.

This validates M0 locally and preserves reusable renewal-foundation evidence. It is not proof that the M1–M12 expanded California capabilities or any external gate have been met.

## External validation gates

No rights-cleared California portfolio, ten-case production run, target-profile technical review, independent-verifier use, insurer/MGA review, real programme sponsor/funding rule/milestone decision, model-provider acceptance, managed deployment, restore exercise, paid continuation, or cross-customer data right is present. Each remains external or future deployment evidence and must never be inferred from fixtures.
