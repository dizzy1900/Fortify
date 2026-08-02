# Implementation status

Measured on August 1, 2026 against [COMMERCIAL_NORTH_STAR.md](./COMMERCIAL_NORTH_STAR.md). This ledger separates reusable renewal foundations from the broader California Resilience Investment and Insurance Recognition OS. A passing legacy demo or M1–M7 renewal test does not prove profiles, interventions, funding, verification, model mapping, recognition, deployment, or external acceptance.

## Current state

Fortify preserves a deterministic fictional Colorado renewal sandbox and has a substantial locally validated production foundation: normalized tenant-scoped PostgreSQL, OIDC-compatible identity, deny-by-default role plus assignment authorization, immutable purpose-specific access logging, private S3-compatible storage contracts, portfolio import, durable document processing, immutable market playbooks, destination-specific evidence readiness, and a governed California property graph. The current M2 tree has 75 tables, 157 database guards/triggers, and 71 authorization resource classes. It is stacked after draft PR #8, which publishes M1 directly on the M0 draft PR #7 predecessor.

The replacement north star makes California the initial production jurisdiction and expands the product into governed resilience investment, funding, independent verification, external-model mapping, explicit market commitments, and insurance-recognition outcomes. Those expanded capabilities are not implied by the existing renewal implementation. No managed deployment, rights-cleared California portfolio, authoritative California source register, real verifier, funding sponsor, model provider, insurer reviewer, backup restore, or paid pilot has been validated.

## Milestone ledger

| Milestone | State | Current evidence | Required next evidence |
|---|---|---|---|
| M0 Product doctrine/release foundation | Locally validated; draft PR #7 published | Authoritative brief and operating contract; reconciled architecture/data/status/validation docs; nine-level evidence hierarchy; external-gate register; empty governed California source register; public California direction with isolated Colorado sandbox; 18-pattern claims gate; full local release baseline | Keep deployment, customer, market, programme, and other external validation separate; begin M1 without implying external readiness |
| M1 Production data plane/sandbox | Locally validated; draft PR #8 published; deployment validation pending | Explicit sandbox/production modes; normalized PostgreSQL source of truth; 73-table graph including portfolios, parcels, unit summaries, scopes, aliases, relationships, immutable versions; governed source/effective/confidentiality/data-right fields; exact separate California fixture; idempotency/concurrency/audit; PGlite and attack contracts; no production fallback to `DemoState` | Validate selected managed PostgreSQL/PostGIS, spatial extension/query behavior, defense-in-depth RLS, performance, backup/restore, and rights-cleared California import before deployment or customer claims |
| M2 Identity/secure evidence | Locally validated; managed deployment validation pending | OIDC/PKCE/state/nonce boundary, production-disabled local provider, opaque sessions, 18-role ceiling including operator/contractor/verifier/programme/insurer-MGA/lender-funder roles, direct/team portfolio and case assignments, purpose/permission/data-domain/expiry enforcement, immutable data-access log, external/service/support grants, private storage, quarantine/scanning, retention/legal hold, exact-byte fixture restore, functional `/access` workspace | Validate managed OIDC/MFA, PostgreSQL/RLS, private bucket/KMS/scanner, rate limiting, secrets, operational restore, and role workflows with authorized customer/partner users before deployment or external claims |
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
| Tenant isolation | Tenant context, organization predicates, database guards, deny-by-default role/assignment policy, cross-tenant tests | Locally validated for 71 current resource classes; every new resource still requires attack coverage |
| Authentication | OIDC-compatible interface and local provider; opaque server sessions | Locally validated interface; managed provider/MFA deployment pending |
| Secure evidence | S3-compatible signed operations, hash/MIME/size/encryption checks, quarantine/scanning, retention/legal hold, access grants | Local adapter/contract evidence only |
| Portfolio and property | CSV/XLSX mapping, stable IDs, normalized core plus governed portfolio/parcel/unit/scope/alias/relationship/immutable-version graph, explicit separate California fixture, unavailable geometry state | Local graph validated; rights-cleared input, live spatial data, PostGIS/provider and customer validation pending |
| Document intelligence | Durable jobs, provider/classifier/extractor versions, citations, multiple candidates, human correction/supersession | Offline selectable-text adapter only; live rights/provider validation pending |
| Market readiness | Exact approved destination version; missing/stale/scope/contradiction/review states; blockers fail closed; no average | Locally validated renewal capability; profile/model/funding/verification readiness absent |
| Evidence hierarchy | No typed nine-level resilience evidence separation | Not started |
| Capital/funding | No governed profiles, interventions, projects, capital plans, programmes, commitments, approvals, or exports | Not started |
| Verification | No independent verifier credential/assignment/finding/certificate model | Not started |
| Model/commitment recognition | No external model-input mapping or explicit market/funder commitment registry | Not started |
| Recognition delivery/outcomes | Sandbox artifacts and fictional outcomes only | Production implementation incomplete |
| Analytics/data rights | Ten record-level classifications, confidentiality and effective/source metadata, rights-recorded flag, cross-customer use prohibited by default | Local classification contract only; consent, cohort, de-identification, suppression, benchmark, and contract operation remain incomplete |
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

The M2 identity/access tree stacked on M1 passed the complete local release gates on August 1, 2026, including approved localhost binding for Playwright:

- ESLint and strict TypeScript passed.
- Vitest: 14 files / 56 tests.
- Repository secret scan: 237 non-ignored files.
- Next.js build: 21 product pages / 42 API routes.
- Deterministic sandbox evaluation: 12/12.
- Prohibited-claims scan: 18 direct patterns across runtime source and generated text artifacts.
- Playwright: 16/16 serial desktop Chromium and Pixel 7 scenarios, including functional assignment create/revoke and explicit desktop/tablet/mobile access-control inspection.
- Production schema regeneration: 75 tables, no drift; the migrated database exposes exactly 157 guards/triggers.
- `npm audit --audit-level=moderate`: 0 vulnerabilities after a narrow development-tool esbuild override; schema generation, tests, build, and browser gates were rerun against the resulting lockfile.
- All six deterministic PDF pages were rendered and inspected; the 17-entry ZIP passed integrity/content review and contains the exact standalone PDF bytes.
- `git diff --check` passed.
- Desktop, 834-pixel tablet, and Pixel 7 views were inspected; the access matrix was repaired from inner horizontal scrolling to fully labeled mobile rows, then rerun with no document overflow.

This validates the replacement M2 identity/secure-evidence slice locally and preserves reusable renewal-foundation evidence. It is not proof that M3–M12, a managed provider/PostGIS/RLS/OIDC/MFA/object-storage topology, rights-cleared customer data, customer/partner role acceptance, or any external gate has been met.

## External validation gates

No rights-cleared California portfolio, ten-case production run, target-profile technical review, independent-verifier use, insurer/MGA review, real programme sponsor/funding rule/milestone decision, model-provider acceptance, managed deployment, restore exercise, paid continuation, or cross-customer data right is present. Each remains external or future deployment evidence and must never be inferred from fixtures.
