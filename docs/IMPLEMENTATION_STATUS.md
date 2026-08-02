# Implementation status

Measured on August 1, 2026 against [COMMERCIAL_NORTH_STAR.md](./COMMERCIAL_NORTH_STAR.md). This ledger separates reusable renewal foundations from the broader California Resilience Investment and Insurance Recognition OS. A passing legacy demo or M1–M7 renewal test does not prove profiles, interventions, funding, verification, model mapping, recognition, deployment, or external acceptance.

## Current state

Fortify preserves a deterministic fictional Colorado renewal sandbox and now has a locally validated California independent-verification slice on the normalized production architecture: tenant-scoped PostgreSQL, OIDC-compatible identity, deny-by-default role plus case/portfolio/project/verifier-assignment authorization, secure evidence and live-brokerage foundations, exact source governance, versioned target profiles, reviewed interventions, transparent capital plans, governed funding/project execution, verifier credentials and conflicts, signed evidence-level findings, correction/reinspection lineage, certificates, revocation, and maintenance provenance. The current M7 tree has 136 tables, 386 database guards/triggers, and 132 authorization resource classes. It is published as stacked draft PR [#14](https://github.com/dizzy1900/Fortify/pull/14) directly on the M6 branch with no reported conflicts.

The replacement north star makes California the initial production jurisdiction and expands the product into governed resilience investment, funding, independent verification, external-model mapping, explicit market commitments, and insurance-recognition outcomes. Those expanded capabilities are not implied by the existing renewal implementation or the local source workflow. No managed deployment, rights-cleared California portfolio or source snapshot, verified legal currentness, customer-approved source policy, real verifier, funding sponsor, model provider, insurer reviewer, backup restore, or paid pilot has been validated.

## Milestone ledger

| Milestone | State | Current evidence | Required next evidence |
|---|---|---|---|
| M0 Product doctrine/release foundation | Locally validated; draft PR #7 published | Authoritative brief and operating contract; reconciled architecture/data/status/validation docs; nine-level evidence hierarchy; external-gate register; empty governed California source register; public California direction with isolated Colorado sandbox; 18-pattern claims gate; full local release baseline | Keep deployment, customer, market, programme, and other external validation separate; begin M1 without implying external readiness |
| M1 Production data plane/sandbox | Locally validated; draft PR #8 published; deployment validation pending | Explicit sandbox/production modes; normalized PostgreSQL source of truth; 73-table graph including portfolios, parcels, unit summaries, scopes, aliases, relationships, immutable versions; governed source/effective/confidentiality/data-right fields; exact separate California fixture; idempotency/concurrency/audit; PGlite and attack contracts; no production fallback to `DemoState` | Validate selected managed PostgreSQL/PostGIS, spatial extension/query behavior, defense-in-depth RLS, performance, backup/restore, and rights-cleared California import before deployment or customer claims |
| M2 Identity/secure evidence | Locally validated; managed deployment validation pending | OIDC/PKCE/state/nonce boundary, production-disabled local provider, opaque sessions, 18-role ceiling including operator/contractor/verifier/programme/insurer-MGA/lender-funder roles, direct/team portfolio and case assignments, purpose/permission/data-domain/expiry enforcement, immutable data-access log, external/service/support grants, private storage, quarantine/scanning, retention/legal hold, exact-byte fixture restore, functional `/access` workspace | Validate managed OIDC/MFA, PostgreSQL/RLS, private bucket/KMS/scanner, rate limiting, secrets, operational restore, and role workflows with authorized customer/partner users before deployment or external claims |
| M3 Live brokerage wedge | Locally validated; draft PR #10 published; external acceptance pending | Complete fictional California CSV import through normalized client/community/property/building/policy, appeal case, notice intake/extraction/human-confirmed facts, governed evidence request, exact evidence version, and immutable PDF/ZIP/manifest/letter bytes; authenticated APIs and responsive `/brokerage` workspace; no production `DemoState` dependency | Validate rights-cleared brokerage data and workflow, managed PostgreSQL/OIDC/storage/scanner operation, live scoped request delivery, ten production cases, and brokerage acceptance before deployment or customer claims |
| M4 California source/playbooks | Locally validated; draft PR #11 published; external/legal validation pending | Tenant-scoped source/version/review/publication/dependency/change-alert records; exact clean-byte/hash binding; human and separation-of-duty gates; immutable supersession; exact playbook/case/profile impact; source-pinned playbooks; responsive source workspace and deterministic fixtures | Obtain rights-cleared snapshots and legal/currentness review; validate customer source policy and monitored change operation; governed report consumers remain future work |
| M5 Profiles/interventions/capital planning | Locally validated; draft PR #12 published; external technical/customer validation pending | Versioned source-pinned profiles; separate author/reviewer/publisher; minimum/preferred criteria and nine evidence levels; reviewed intervention versions; deterministic applicable/inapplicable/insufficient assessments; baseline gaps; projects; transparent cost/timeline/dependency/maintenance scenarios; explicit no-attractive-path state; responsive `/resilience-planning` workspace | Obtain qualified independent review of rights-cleared profile/intervention content, customer approval, real scoped costs, and managed deployment evidence; implement M6 funding and execution without inferring eligibility or ROI |
| M6 Funding/project execution | Locally validated; stacked draft PR #13 published; external programme validation pending | Source-pinned programme versions; independent review/publication; deterministic eligible/ineligible/insufficient assessments; prepared applications; blended stacks; cost-share/duplicate controls; append-only commitment and milestone history; scoped expiring/revocable collaborators; separate payment approval/export; stakeholder ledger; responsive `/funding` workspace | Validate real sponsor rules and decisions, real costs, external contributor use, managed deployment, and one real programme milestone plus approval/export decision; implement M7 verification without treating fixture milestones as physical proof |
| M7 Independent verification | Locally validated; stacked draft PR #14 published; external verifier validation pending | Verifier organizations and versioned credentials; independent source review and expiry; digest-only scoped assignments; signed conflicts; versioned methods; immutable exact-evidence findings using the separate nine-level impact/treatment taxonomy; independent review; exceptions/corrective action/reinspection; certificate issue/revocation history; maintenance refresh; responsive `/verification` workbench | Validate a rights-cleared credential source and workflow with an authorized independent verifier; validate managed deployment and real maintenance refresh without treating fixture observations as physical proof |
| M8 Model mapping/commitments | Not started | Existing market/playbook source fields do not model external models, inputs, acceptance, or commitments | External model/version/input registry, rights/limitations, proposed-to-accepted mapping history, explicit commitment registry, and evidence hierarchy enforcement |
| M9 Recognition submission/outcomes | Partial sandbox only | Deterministic sandbox PDF/ZIP, confirmation, clarification, and fictional outcomes | Production immutable recognition submissions, exact bytes/hash, scoped reviewer, delivery receipts, separate evidence/model/rating/underwriting/placement/funding taxonomies, corrections, and maintenance roll-forward |
| M10 Programme administration/analytics | Not started | Fictional demo reports only | Sponsor cohorts, benefit ledger, recognition graph, tenant analytics, ROI/programme reports, opt-in/cohort/de-identification/suppression controls |
| M11 Production integrations | Not started | Generic AMS-compatible fixtures and provider boundaries; no live connection | Graph email, Gmail/drive, AMS/property/model/verifier adapters, signed webhooks, health, pagination/rate limits, sync receipts, replay/dead-letter, credential gates |
| M12 Operational hardening/launch | Not started | Local Dockerfile, health route, CI workflow, dependency/secret/CodeQL evidence | Security/privacy/data-flow documents, CSP/CSRF/rate limits/RLS/log redaction, accessibility/visual gates, staging/production release, observability, encrypted backup/PITR, measured restore, full 33-step fixture flow, and launch report |

## Architecture truth table

| Requirement | Current evidence | Status |
|---|---|---|
| Production source of truth | Normalized PostgreSQL; SQLite `DemoState` isolated to sandbox | Renewal foundation locally validated; expanded domain incomplete |
| Tenant isolation | Tenant context, organization predicates, database guards, deny-by-default role plus case/portfolio/project/verifier assignment policy, cross-tenant tests | Locally validated for 132 current resource classes; every new resource still requires attack coverage |
| Authentication | OIDC-compatible interface and local provider; opaque server sessions | Locally validated interface; managed provider/MFA deployment pending |
| Secure evidence | S3-compatible signed operations, hash/MIME/size/encryption checks, quarantine/scanning, retention/legal hold, access grants | Local adapter/contract evidence only |
| Portfolio and property | CSV/XLSX mapping, stable IDs, normalized core plus governed portfolio/parcel/unit/scope/alias/relationship/immutable-version graph, explicit separate California fixture, unavailable geometry state | Local graph validated; rights-cleared input, live spatial data, PostGIS/provider and customer validation pending |
| Document intelligence | Durable jobs, provider/classifier/extractor versions, citations, multiple candidates, human correction/supersession | Offline selectable-text adapter only; live rights/provider validation pending |
| Market readiness | Exact published governed source version and approved destination version; missing/stale/scope/contradiction/review states; blockers fail closed; no average | Source/profile/funding/verification fixture layers locally validated; model mapping and external acceptance absent |
| Evidence hierarchy | Proof-strength hierarchy remains separate from nine explicit impact/treatment levels on signed findings | Both taxonomies locally enforced; every M7 finding uses exactly one authoritative impact/treatment level; real verification/model/market/observed/claims evidence remains external |
| Capital/funding | Governed profiles/interventions/plans plus source-pinned programme versions, deterministic eligibility, applications, blended stacks, append-only commitments, milestones, payment approvals, and export-only instructions | Locally validated with fixtures; no real sponsor, award, payment, custody, or programme validation |
| Verification | Credential/version/expiry, conflict, assignment, methods, exact-evidence signed findings, reviews, exceptions/corrections/reinspection, certificates/events, and maintenance/condition history | Locally validated with fictional fixtures; no real credential, independent verifier, physical inspection, customer reliance, or external acceptance |
| Model/commitment recognition | No external model-input mapping or explicit market/funder commitment registry | Not started |
| Recognition delivery/outcomes | Immutable production-architecture brokerage packet bytes plus preserved sandbox artifacts/fictional outcomes | Local packet generation validated; live delivery receipts, scoped external reviewer operation, normalized real responses/outcomes, and external acceptance remain incomplete |
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

The M7 independent-verification tree based on M6 passed the complete local release surface on August 1, 2026:

- ESLint and strict TypeScript passed.
- Vitest: 19 files / 73 tests.
- Repository secret scan: 322 non-ignored files.
- Next.js build: 26 product pages / 89 API routes.
- Deterministic sandbox evaluation: 12/12.
- Prohibited-claims scan: 18 direct patterns across runtime source and generated text artifacts.
- Playwright: 39/39 serial desktop Chromium, 834-pixel tablet, and Pixel 7 scenarios, including verification credential, assignment, method/evidence, signed-finding, exception/correction, certificate/revocation, and maintenance controls plus all preserved journeys.
- Production schema regeneration: 136 tables, no drift; the migrated database exposes exactly 386 guards/triggers.
- `npm audit --audit-level=moderate`: 0 vulnerabilities.
- The preserved six-page Letter PDF was rendered and inspected; the 17-entry ZIP passed CRC and content review. The deterministic evaluator retained exact 11,602-byte PDF, 51,723-byte ZIP, and manifest hash evidence.
- `git diff --check` passed.
- Independent-verification desktop, tablet, and Pixel 7 views were inspected with no observed clipping, collision, or document-width overflow.

This validates the replacement M7 independent-verification slice locally and preserves the M0–M6 plus renewal-foundation evidence. It is not proof that M8–M12, legal currentness, redistribution rights, a managed provider/PostGIS/RLS/OIDC/MFA/object-storage topology, rights-cleared customer data, a real credential or inspection, real funding, live external delivery, brokerage acceptance, programme acceptance, or any other external gate has been met.

## External validation gates

No rights-cleared California portfolio, ten-case production run, target-profile technical review, independent-verifier use, insurer/MGA review, real programme sponsor/funding rule/milestone decision, model-provider acceptance, managed deployment, restore exercise, paid continuation, or cross-customer data right is present. Each remains external or future deployment evidence and must never be inferred from fixtures.
