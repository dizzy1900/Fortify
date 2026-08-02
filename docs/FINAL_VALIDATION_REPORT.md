# Final validation report

Status: **the replacement M2 identity/secure-evidence slice, M1 governed property-graph/data-right slice, M0 doctrine/release foundation, and preserved Colorado M1–M7 renewal foundation were locally validated on August 1, 2026**. This is not a production-readiness, resilience-effectiveness, verification, model-acceptance, funding, legal-correctness, carrier-acceptance, customer-validation, programme-validation, or market-validation claim.

## Replacement north-star M2 identity/secure-evidence local-validation addendum

The complete local release surface passed against the final lockfile: ESLint, strict TypeScript, 14 Vitest files/56 tests, a 237-file secret scan, the 21-page/42-API production build, 12/12 deterministic sandbox checks, the 18-pattern claims scan, and 16/16 serial Playwright scenarios across desktop Chromium and Pixel 7. Production schema regeneration reported 75 tables and no drift; the migrated database exposed exactly 157 unique guards/triggers. `npm audit --audit-level=moderate` reported 0 vulnerabilities. `git diff --check` passed before publication.

The M2 migration adds tenant-owned `portfolio_assignments` and immutable `data_access_logs`, and extends case assignments with purpose, data-domain, and reason-bound revocation fields. Database guards independently reject cross-tenant portfolio, membership, team, external-principal, and access-log portfolio/case references. Assignment content cannot be edited; exactly one reason-bearing revision increment may revoke it. Access-log update/delete is rejected. The deny-by-default registry covers all 71 current resource classes.

Seven exact resilience ecosystem roles join the compatibility matrix: property operator administrator, property manager, contractor evidence contributor, independent verifier, programme administrator, insurer/MGA reviewer, and lender/funder reviewer. Identity resolution includes only live direct case plus live direct/team portfolio assignments. Exact assignment permissions are unioned per scope and then intersected with the organization-role ceiling. Tests prove wrong-scope, missing, expired, revoked, and permission-exceeding requests fail closed; contractor, verifier, insurer/MGA, lender/funder, and programme boundaries reject prohibited operations.

`AccessControlService` validates tenant-owned scopes and active memberships, purpose length, explicit non-wildcard permissions, recognized data domains, role-domain limits, and future expiry. Creation and reason-bound revocation commit with audit events. Administrative workspace reads append immutable purpose-specific access records. Three authenticated production APIs expose tenant workspace readback, assignment creation, and revocation without a sandbox fallback.

The responsive `/access` workspace exposes organization context, security posture, live purpose grants, portfolio/case creation, revocation with retained history, an append-only access ledger, and plain-language separation-of-duty boundaries. Its sandbox mode is explicitly fictional and changes only local component state. Desktop 1280, tablet 834, and Pixel 7 screenshots were inspected. The first mobile matrix kept the hard-boundary column inside a horizontal scroll; it was repaired to labeled stacked rows, rebuilt, rerun, and re-inspected with no measured document overflow or observed clipping/collision.

The first focused browser invocation used the stale standalone build and correctly returned the route-not-found state; rebuilding exposed `/access`. The first rebuilt browser run then found an ambiguous text selector rather than a product defect; the selector was scoped and the exact scenario passed 2/2. The final complete browser run passed 16/16. A sandboxed localhost attempt was denied with `listen EPERM 127.0.0.1:3000`; the approved identical runs succeeded. The initial live registry audit found four moderate advisories in Drizzle Kit's legacy development loader chain. A narrow nested esbuild override removed them without changing Drizzle Kit; schema generation reported no drift, and the full gates were rerun against the resulting lockfile.

No managed OIDC/MFA provider, PostgreSQL/RLS policy, private object store/KMS/scanner, production secrets/rate limits, operational backup restore, or authorized customer/partner role workflow has been validated. MFA capability is metadata, not an enforced policy claim. The synthetic users and assignments are not real relationships or authority. M2 is locally validated but neither deployment-validated nor externally validated.

## Replacement north-star M1 property-graph local-validation addendum

One consolidated `npm run verify` invocation exited 0 with approved localhost binding: ESLint, strict TypeScript, 13 Vitest files/50 tests, a 225-file secret scan, the 20-page/39-API production build, 12/12 deterministic sandbox checks, the 18-pattern claims scan, and 14/14 serial Playwright scenarios across desktop Chromium and Pixel 7 passed. Production schema regeneration reported 73 tables and no drift; `npm audit --omit=dev` reported 0 vulnerabilities; `git diff --check` passed.

The M1 migration adds eight tenant-owned tables for property portfolios and membership, parcels, unit summaries, typed physical scopes, reviewed aliases, cross-property relationships, and immutable property snapshots. Exactly 147 database guards/triggers now enforce tenant ownership across every new reference, portfolio properties belonging to the portfolio client, unit-summary buildings belonging to the selected property, scope references to the same property, required scope targets, immediate version lineage, and version update/delete rejection. The deny-by-default registry covers all 69 current resource classes.

Every new graph record retains source system, optional source-record identifier, effective period, confidentiality state, one of ten contract-ready data-right classes, and a rights-recorded flag. Cross-customer use remains `prohibited` by default. The rights flag records the tenant's stated right for the specific source/use; it is not a Fortify legal determination. Consent, cohort, de-identification, suppression, and benchmark execution are explicitly unimplemented.

`PropertyGraphService` verifies tenant-owned parents, writes the graph plus audit event and idempotency receipt in one transaction, and exposes tenant-scoped readback. The two authenticated production APIs admit no sandbox fallback. The deterministic California fixture runs under `org-fortify-california-fixture`, separate from the preserved Colorado `org-fortify-sandbox`; exact replay is proven and a California-context read does not return Colorado records. Direct cross-tenant parcel and portfolio-link writes fail at the database layer. Property v2 without the immediate predecessor fails, and valid recorded versions cannot be updated.

The responsive `/property-graph` workspace exposes functional portfolio/property selectors and property, physical-scope, immutable-version, and rights/provenance views. Its two fictional California properties have two parcels with `geometry_status=unavailable`, null boundary payloads, six explicit scope nodes, reviewed aliases/relationship, and hash-bound version snapshots. Desktop 1280, tablet 834, and Pixel 7 mobile screenshots were inspected: tenant/source boundaries, insufficient spatial state, identity, rights, and caveats were legible with no measured horizontal overflow or observed clipping/collision.

The first otherwise-complete sandboxed validation reached Playwright and was denied a local bind with `listen EPERM 127.0.0.1:3000`; the approved identical full invocation then exited 0. The initial full test run also caught a stale expected resource count of 61 after the eight new classes were registered; correcting the inventory assertion made the all-resource tenant-mismatch test pass for 69/69 classes.

No rights-cleared California portfolio, approved parcel boundary, managed PostgreSQL/PostGIS deployment, RLS policy, geospatial query/performance result, backup/restore exercise, or customer validation is present. The nullable EPSG:4326-ready GeoJSON contract and PGlite trigger suite are local implementation evidence only. M1 is locally validated but is neither deployment-validated nor externally validated.

Publication used branch `codex/m1-california-property-graph` stacked on refreshed `origin/codex/resilience-os-foundation`. Exact local merge-tree preflight succeeded. GitHub draft PR #8 readback reported the intended base/head and `MERGEABLE`; the separate `UNSTABLE` status is check state and is not a merge-conflict result.

## Product-doctrine M0 local-validation addendum

The authoritative objective now defines Fortify as a California-first Resilience Investment and Insurance Recognition OS. Product doctrine, repository operating rules, architecture/data-model boundaries, milestone plan, evidence hierarchy, external-validation gates, and the empty-by-design California source register were reconciled. The public entry now presents the California product direction while labelling the existing Colorado renewal workflow as a fictional sandbox. A new prohibited-claims guard covers 18 direct guarantee, Fortify-certification/risk-score, automatic-recognition, and unsupported loss-reduction patterns in runtime source and generated text artifacts; its focused regression proves bounded language passes and a direct guarantee fails. The guard runs in local verification and both relevant CI jobs.

One consolidated `npm run verify` invocation exited 0 with approved localhost binding: ESLint, strict TypeScript, 12 Vitest files/45 tests, a 214-file secret scan, the 19-page/37-API production build, 12/12 deterministic sandbox checks, the 18-pattern claims scan, and 12/12 serial Playwright scenarios across desktop Chromium and Pixel 7 passed. Production schema regeneration reported 65 tables and no drift; `npm audit --omit=dev` reported 0 vulnerabilities; `git diff --check` passed.

The public doctrine page was captured and visually inspected at 1280-pixel desktop, 834-pixel tablet, and Pixel 7 mobile widths. California positioning, Colorado sandbox separation, authority boundaries, navigation/actions, workflow cards, trust statements, and disclaimers remained legible with no measured horizontal overflow or observed clipping/collision. The latest deterministic packet remained six Letter pages / 11,602 bytes and rendered without observed overlap, clipping, broken glyphs, or missing headers/footers. The 17-entry / 51,723-byte ZIP passed integrity checks, retained the manifest, letter, exact embedded PDF, and 14 exhibits; the embedded PDF hash matched the standalone PDF at `6b8f29f6c8e41a725dfe37d79831f093c9c60c3c042306dd494856e8da5bea21`.

The prior M1–M7 results below remain evidence for the isolated sandbox and reusable renewal foundations only. M0 does not prove a rights-cleared California portfolio/source register, target profile, intervention, capital plan, funding programme, independent verification, external-model mapping, explicit recognition commitment, production recognition submission, separated real market responses, programme administration, deployment, or external acceptance.

## Production transformation M7 local-implementation addendum

The versioned market-playbook and deterministic evidence-readiness milestone was locally validated on August 1, 2026. The final consolidated `npm run verify` exited 0 with approved localhost-bind permission after ESLint, strict TypeScript, 11 Vitest files/44 tests, a 209-file secret scan, the 19-page/37-API Next.js production build, 12/12 deterministic sandbox evaluation checks, and 10/10 serial Playwright scenarios on desktop Chromium and Pixel 7 profiles passed. `npm audit --omit=dev` reported 0 vulnerabilities, and production schema regeneration reported 65 tables with no drift.

The production migration adds six tenant-owned tables for stable playbooks, immutable scope/source versions, immutable requirement configuration, bounded applicability rules, independent review decisions, and append-only exact-version case links. Exactly 126 database triggers now enforce same-organization references, program/market and predecessor lineage, author/reviewer separation, verify-current approval, approved/effective case applicability, and immutable version/rule/review/link history. The deny-by-default registry covers 61 resource classes.

`MarketPlaybookService` creates a complete immutable version in one transaction with its audit event. Scope includes market, exact optional program, jurisdiction, peril, property class, optional policy form, and effective period. Sources retain name, URL, version, exact citation, verify-current state, and content hash. Requirement configuration retains required/recommended and blocker state, accepted evidence/source types, freshness, exact scope, review authority, deadline, template/delivery fields, caveat, and bounded conditions. Conditions accept only six named fields and four comparison/set operators; no arbitrary JavaScript, SQL, regular expression, or model-generated executable code is accepted.

Approval is a separate immutable human record. The database and service reject self-review and reject approval when the source has not been verified current. A reviewed version is not edited; a successor cites the immediately prior version, and deterministic diff output identifies scope, added, removed, changed, and condition changes without treating record metadata as a semantic change. Case linkage pins one applicable approved version to one destination and preserves the prior link. Zero matches fail closed; overlapping approved versions also fail closed for administrator resolution.

Readiness reports `ready`, `missing`, `stale`, `scope_mismatch`, `contradiction`, `unreviewed`, `insufficient`, or `not_applicable` per requirement. Accepted type/source/disposition, scope, freshness/expiry, and human-review state must be satisfied together by qualifying evidence; separate weak records cannot manufacture readiness. An unresolved blocking item always returns `blocked`, required gaps return `review_required`, and recommended-only gaps return `ready_with_caveats`. The response records `averageUsed=false` and explicitly states that averages cannot offset blockers. It is labelled submission evidence readiness and carries a caveat that it is not underwriting risk, compliance, acceptance probability, or an insurance outcome prediction.

Five authenticated APIs expose tenant workspace readback, immutable version creation, independent review, exact case evaluation, and append-only case linking. The responsive `/playbooks` workspace covers destination selection, fail-closed evaluation, exact-version pinning, bounded administrator authoring, source/citation verification, requirement selection, version lineage, hashes, independent review, and explicit caveats. The browser workflow inspected blocker output, authored a synthetic successor, approved it as a separate walkthrough actor, and verified the version history at desktop and mobile sizes. Initial mobile inspection showed the selected history tab scrolled the first label partially out of view; tab sizing was tightened, rebuilt, rerun, and re-inspected with all labels visible and no document-width overflow.

The first sandboxed `npm run verify` completed lint, typecheck, all 44 tests, secret scan, build, and deterministic evaluation, then the managed sandbox denied the Playwright standalone server bind with `listen EPERM 127.0.0.1:3000`. A final complete invocation with approved localhost-bind permission exited 0, including the exact full 10-scenario suite. The earlier denial is recorded only as an execution-environment limitation.

The playbook sources and destination shown in the sandbox are fictional. No rights-cleared brokerage or market guide, carrier reviewer, managed PostgreSQL deployment, operational author/reviewer process, or external destination acceptance has been validated. M7 is implemented locally but is neither deployment-validated nor externally validated. The universal percentage remains only in the preserved fictional sandbox and deterministic artifact regression; production readiness uses the new exact destination service.

## Production transformation M6 local-implementation addendum

The durable document-processing milestone was locally validated on August 1, 2026. ESLint, strict TypeScript, 10 Vitest files/41 tests, a 192-file secret scan, the 18-page/32-API Next.js production build, 12/12 deterministic evaluation checks, and 8/8 serial Playwright scenarios on desktop Chromium and Pixel 7 profiles passed. `npm audit --omit=dev` reported 0 vulnerabilities, and production schema regeneration reported no drift.

The production schema now applies 59 normalized tables and exactly 100 triggers. Six new tables retain durable jobs, immutable attempts, extraction runs, multiple candidate fields, append-only human reviews, and superseding fact versions. Source documents now bind clean storage objects, versions, supersession, and classifier evidence; source passages retain extraction run, page, segment, kind, and optional normalized region/rotation. The deny-by-default registry covers 55 resource classes, and direct database guards reject cross-tenant job, attempt, run, passage, candidate, review, and fact references.

`DocumentPipelineService` admits only independently scanned clean objects, independently reads and verifies exact bytes and hashes, records idempotent source/job state, leases work to separately scoped service accounts, recovers stale leases, schedules bounded retries, and records dead-letter failures. Manual retry requires a human reason and adds only one bounded attempt. Attempts, runs, passages, candidates, reviews, and facts cannot be silently rewritten. Worker/service-account principals can extract candidates but cannot confirm facts.

The provider/classifier/extractor framework stores stable keys and versions, classifies nine correspondence families, and extracts carrier/sender, policy, dates/deadlines, carrier-stated classifications, stated drivers, requested mitigation/evidence, appeal rights, communication history, and reason codes without creating a Fortify risk score. Multiple candidates, low confidence, conflicts, missing fields, unavailable geometry, and model-derived values remain explicit. Human confirmation creates a fact; correction creates a superseding fact version; rejection creates no fact.

Four authenticated APIs expose workspace readback, intake, field review, and dead-letter retry. The responsive `/documents` workspace covers quarantine upload, clean-object selection, durable processing state, retries, document/candidate filters, pagination, exact source citation, model-derived disclosure, human confirmation/correction/rejection, and full fact/review history. The synthetic browser workflow confirmed and corrected a policy fact, confirmed a low-confidence model-derived candidate, retried a dead-letter job, queued a new job, and preserved the processed source for final desktop/mobile inspection. Both viewports passed without document overflow or observed clipping.

The default production adapter is deliberately offline and deterministic: plain text and selectable PDFs only. It reports unavailable native PDF geometry instead of fabricating it. Scans, rotations, tables, images, conflicts, and model-derived extraction are covered by exact-hash fixtures and an injected provider boundary, not a live OCR service. No rights-cleared customer correspondence, managed worker, external provider credential, provider license/data right, live accuracy study, retention/egress review, latency/cost evidence, or staging operation has been validated. M6 is implemented locally but is neither deployment-validated nor externally validated.

The deterministic artifact regression remained stable: the PDF is 6 Letter pages and 11,602 bytes; the ZIP has 17 entries and 51,723 bytes; its embedded PDF exactly matches the standalone PDF SHA-256 `6b8f29f6c8e41a725dfe37d79831f093c9c60c3c042306dd494856e8da5bea21`; and the manifest retains 14 evidence hashes, 2 mitigation actions, fictional-demo status, recorded human confirmation, and explicit non-score/non-outcome limitations. All six pages were rendered and visually inspected with no observed overlap, clipping, broken glyphs, or missing page/footer structure.

## Production transformation M5 local-implementation addendum

The portfolio/SOV import milestone was locally validated on August 1, 2026. ESLint, strict TypeScript, 9 Vitest files/37 tests, a 177-file secret scan, the 17-page/28-API Next.js production build, 12/12 deterministic evaluation checks, and 6/6 serial Playwright scenarios on desktop Chromium and Pixel 7 profiles passed. `npm audit --omit=dev --audit-level=high` reported 0 vulnerabilities.

The first consolidated `npm run verify` reached its final Playwright step and then the managed sandbox denied the standalone server bind with `listen EPERM 127.0.0.1:3000`. The exact six-scenario suite was rerun with the approved local-bind permission and passed. This was an execution-environment denial, not counted as a passing consolidated command.

The production schema now applies 53 normalized tables and exactly 72 triggers. Five new tables retain saved mappings, immutable mapping versions, import runs, row-level raw/normalized quarantine, and immutable preview/commit/rollback receipts. The deny-by-default registry covers 49 resource classes. Direct database guards reject cross-tenant mapping, clean-object, book, row, and receipt references.

The parser reads actual CSV bytes and XLSX workbooks with named sheets, non-default header rows, spreadsheet dates, quoted CSV fields, blank-row handling, file/row/column limits, address normalization, stable external identifiers, and explicit unit, year, date, and ISO-currency validation. The commit service does not merge solely by name: conflicting identifiers and normalized-address collisions remain ambiguous, rejected rows remain retained, and only explicitly human-confirmed accepted rows create normalized client, community, property, identifier, location, building, and policy records. Exact request/content hashes provide idempotent replay, and rollback marks only import-owned records while retaining history.

Seven authenticated production API routes expose organization-scoped workspace options, mapping suggestion from clean exact-readback bytes, immutable mapping save, preview, import readback, human-confirmed commit, and rollback. The responsive `/imports` workspace includes upload-to-quarantine, explicit scanner state, clean-object/book selection, mapping review, row-state filters, confirmation language, receipts, recent imports, and reason-bound rollback. Loading, error, empty, populated, ambiguous, rejected, committed, and rolled-back states are implemented. The sandbox route is visibly fictional and never persists the walkthrough.

The production standalone UI was exercised through the complete synthetic preview, quarantine review, accepted-row confirmation, receipt, and rollback sequence on desktop Chromium and Pixel 7. A first mobile run detected document overflow from a grid item's table min-content width; the grid/panel containment was repaired and the exact mobile scenario then passed without document overflow. Both final viewport screenshots were visually inspected: mapping fields, row states, receipt hashes, safety boundaries, and rollback language were legible with no observed collision or clipping.

The XLSX fixture was authored through the repository spreadsheet workflow, inspected for typed values and formula errors, rendered, and visually checked at both worksheet tabs. Applied Epic-compatible and AMS360-compatible CSVs are synthetic fixture boundaries only. No rights-cleared customer export, vendor certification, vendor API, screen scraping, or managed storage/scanner/database path has been validated. M5 is implemented locally but remains neither deployment-validated nor externally validated.

## Production transformation M4 addendum

The secure object-storage and evidence-upload milestone was locally validated on August 1, 2026. `npm run verify` exited 0 after ESLint, strict TypeScript, 8 Vitest files/31 tests, a 155-file secret scan, the production build, 12/12 deterministic evaluation checks, and 4/4 serial Playwright scenarios on desktop Chromium and Pixel 7 profiles. `npm audit --omit=dev --audit-level=high` reported 0 vulnerabilities.

The production schema now applies 48 normalized tables and exactly 61 triggers. M4 adds tenant-owned storage objects, expiring/revocable access grants, immutable malware-scan results, and immutable backup manifests/items. The deny-by-default registry now covers 44 resource classes. Direct database guards reject cross-tenant storage references, and service tests reject path traversal and cross-tenant object access.

The S3-compatible AWS SDK v3 adapter binds a private bucket key, explicit region, short expiry, size, MIME type, SHA-256, and AES256 or KMS settings into signed operations. Finalization independently reads checksum/metadata before quarantine. Byte checksum/size and basic content signatures are rechecked before a scanner result can promote an object; infected, scanner-error, and MIME-spoofed content fail closed. Only clean objects can create immutable evidence versions or download grants. Tests also prove grant revocation/expiry/one-time use, legal-hold and retention deletion blocks, exact-byte backup readback, and restore verification.

The build compiled the preserved 16 product pages and 21 API routes, including five protected production storage endpoints. M4 adds no new visible sandbox control; the unchanged sign-in and complete guided workspace were regression-tested across desktop and mobile, with all public/workspace routes healthy. The deterministic PDF/ZIP story remains byte-identical at 11,602 and 51,723 bytes, with manifest hash `47c5de9b8c2da8dfc040951b57697a2081fec8f1b3817e5148480aefaf9aef9a`.

No managed object-storage account or malware provider was configured. Private bucket and CORS policy, provider checksum semantics, KMS/credential scope, live malware behavior, lifecycle/object-lock enforcement, deletion operations, an independent backup destination, and a monitored disaster-recovery restore remain deployment-validation gates. The local exact-byte fixture backup is not evidence of managed backup or recovery. Live customer data remains prohibited.

## Production transformation M3 addendum

The identity, organizations, and authorization milestone was locally validated on August 1, 2026. `npm run verify` exited 0 after ESLint, strict TypeScript, 7 Vitest files/27 tests, a 142-file secret scan, the production build, 12/12 deterministic evaluation checks, and 4/4 serial Playwright scenarios on desktop Chromium and Pixel 7 profiles. `npm audit --omit=dev --audit-level=high` reported 0 vulnerabilities.

The production schema now applies 43 normalized tables and 53 triggers across the M2-M3 migrations. M3 adds 11 organization roles; OIDC discovery/authorization-code/PKCE/state/nonce; an explicit non-production local provider; opaque organization-bound sessions; email-bound invitations; membership/session revocation; team and case assignments; scoped service/API credentials; case-scoped external access; and customer-approved support grants. Only token digests persist for sessions, invitations, API credentials, and external grants.

The 9-test M3 suite iterates all 39 registered production resource classes and proves organization mismatch is denied. It also covers unknown/absent scope denial, direct database rejection for every new tenant-reference category, single-use OIDC attempts, safe return paths, invitation/session expiry, invitation replay, membership-triggered session revocation, API scope/revocation, external case scope/revocation, and support grant/revocation.

The build compiled 16 page routes and 16 API routes, including sign-in, OIDC/local/session/logout endpoints, protected production community GET/PATCH, and invitation create/revoke routes. The sign-in surface was inspected at desktop and 390 by 844 mobile sizes. The sandbox/production distinction, access-control assurances, evidence-infrastructure boundary, and no-outcome-guarantee language were visible and legible with no observed collision or horizontal overflow.

No live identity provider was configured. OIDC discovery, redirect registration, managed MFA enforcement, secrets, provider-admin lifecycle, staging rate limits, and defense-in-depth RLS remain deployment-validation gates. PGlite remains local PostgreSQL-compatible evidence rather than proof of the selected managed database. Secure object storage is M4 and is still absent, so live customer data remains prohibited.

## Production transformation M2 addendum

The normalized PostgreSQL and sandbox-isolation milestone was locally validated on August 1, 2026. `npm run verify` exited 0 after ESLint, strict TypeScript, 6 Vitest files/18 tests, a 120-file secret scan, production build, 12/12 deterministic evaluation checks, and 4/4 serial Playwright scenarios on desktop Chromium and Pixel 7 profiles. `npm audit --omit=dev --audit-level=high` reported 0 vulnerabilities.

The generated PostgreSQL migration creates 32 normalized tables and 43 triggers. Contract tests prove clean migration without `app_state`, organization-scoped repository operations, direct cross-tenant reference rejection, immutable audit/evidence/version records, optimistic concurrency, audit/domain-write atomicity, idempotent renewal-case replay/conflict handling, deterministic sandbox seed replay, and transaction rollback on a corrupted seed.

The production runtime requires an explicit mode and `DATABASE_URL`; production requests do not fall back to the SQLite `DemoState` routes. The existing fictional demo remains intentionally isolated as `org-fortify-sandbox`, synthetic, and not opted into cross-customer analytics.

The PostgreSQL tests use PGlite because Docker and native PostgreSQL are unavailable in this validation environment. PGlite exercises PostgreSQL SQL and trigger semantics but does not prove compatibility with the eventual managed provider, network controls, pooling limits, backup/restore, monitoring, or a deployed topology. Those remain explicit external gates. Production identity/resource authorization and secure object storage are also still absent, so live customer data remains prohibited.

The real guided-entry UI was re-inspected at 1440 by 720 and 390 by 844. The institutional layout, guided controls, fictional-data disclosure, role entry points, and demo manifest remained legible and usable with no observed responsive collision.

## Production transformation M1 addendum

The repository/CI/status foundation was locally validated on August 1, 2026. `npm run verify` exited 0 after running ESLint, strict TypeScript, 4 Vitest files/10 tests, a 101-file repository secret scan, the production build, 12/12 deterministic evaluation checks, and 4/4 serial Playwright scenarios on desktop Chromium and Pixel 7 profiles. `npm audit --omit=dev --audit-level=high` reported 0 vulnerabilities.

The new migration test applies the complete SQLite sandbox migration to a blank database and verifies 30 domain tables plus both audit immutability triggers. It is deliberately not evidence of the future production PostgreSQL migration.

The real application was inspected at 1440 px desktop, 768 px tablet, and 390 px mobile widths. There was no horizontal overflow and no browser console error. Inspection found a mobile top-bar collision between the route breadcrumb and role label; the label markup was corrected, rebuilt, and visually rechecked at 390 px.

GitHub checks subsequently ran on the stacked M5 PR. CodeQL/security passed. The container job fails before Trivy because `node:22-bookworm-slim` lacks the native build prerequisites required by `better-sqlite3`; the quality job reports three SQLite/Vitest workers exiting after test completion while PGlite tests pass. Those CI fixes require explicit approval and are not included in M6. GitHub branch protection and security settings still require owner action/readback. Production database/provider operation, identity/MFA, managed storage/scanning, managed document workers/providers, external integrations, backup/restore, and external validation remain incomplete.

## Measured gates

| Gate | Exact result |
|---|---|
| Fresh-lockfile setup | `npm ci` passed from `package-lock.json` with 459 packages installed |
| Consolidated gate | `npm run verify` exited 0 |
| ESLint | Passed |
| Strict TypeScript | Passed with `tsc --noEmit` |
| Unit/integration | 3 files, 9 tests passed |
| Production build | Next.js 16.2.12 webpack build passed; 16 product routes and 7 API routes |
| Deterministic evaluation | 12/12 checks passed; reset digest matched `db9db21485615453` |
| Guided browser demo | 4/4 passed serially against the production standalone server: desktop Chrome and Pixel 7, full story plus all-route health |
| Runtime dependency audit | `npm audit --omit=dev`: 0 vulnerabilities |
| Full dependency audit | 4 moderate development-only findings remain in Drizzle Kit's legacy `@esbuild-kit` chain; npm proposes a breaking downgrade, so they are recorded rather than forced |
| Claims scan | No prohibited promise/affiliation phrases found in seeded UI source |
| Secret scan | No credential-shaped assignments or bearer tokens found in repository source/configuration |
| Diff hygiene | `git diff --check` passed |

The first hot-reload E2E attempt exposed reloads caused by runtime file writes, so the final suite was moved to the built standalone server. The production-server rerun passed without that dev-watch failure mode.

## Deterministic demo evidence

- Seed version: `fortify-demo-2026.08.01-v1`.
- Universe: 3 communities, 3 carriers, 42 evidence records, 28 requirements, and 6 broker-entered mitigation actions.
- Readiness totals: 87%, 75%, and 99%, each derived only from coverage, freshness, confidence, scope match, contradiction resolution, and human review.
- Edge cases: duplicate/conflict, expired evidence, incomplete case, returned clarification, carrier rejection with reason, successful fictional reconsideration, and year-over-year reuse.
- Human gates: all notice fields and exact submission contents are required before artifact generation.
- Roles: broker mutations, manager task/evidence-work mutations, and read-only underwriter evidence access are enforced server-side.

## Generated artifacts and inspection

| Artifact | Result |
|---|---|
| `artifacts/evaluation/demo-evaluation.json` | Pass report, 12 checks |
| `output/pdf/case-jefferson-submission-v1.pdf` | Real PDF 1.7, Letter, 6 pages, 11,602 bytes, SHA-256 `6b8f29f6c8e41a725dfe37d79831f093c9c60c3c042306dd494856e8da5bea21` |
| `output/packets/case-jefferson-submission-v1.zip` | Real ZIP, 17 files, 51,723 bytes, SHA-256 `ed3a7e0414be5f13b12ac413afea9d4415e0823255c5231dfee919e3e0a3a8be` |
| Manifest semantic hash | `47c5de9b8c2da8dfc040951b57697a2081fec8f1b3817e5148480aefaf9aef9a` |
| Screenshots | Portfolio, generated packet, and maintenance/reuse views inspected at desktop size |

The PDF and ZIP hashes were reproduced identically across two consecutive evaluator runs. All six PDF pages were rendered to PNG and visually inspected: headers/footers, notice confirmation, requirement matrix, mitigation-action register, evidence index, caveats, and editable-letter paragraph breaks are legible with no observed clipping or overlap. ZIP inspection confirmed `manifest.json`, the editable letter, the PDF, and 14 exhibits. JPEG exhibit signatures and SHA-256 readback are covered by tests.

## Manual rubric

| Dimension | Result | Evidence |
|---|---|---|
| Buyer relevance | Pass | Deadline triage, notice-to-packet workflow, assignments, clarification loop, and reuse align to the specialist-broker wedge |
| Trust | Pass | Fictional labels, source/version/verify-current status, human gates, explicit missing/conflicting evidence, immutable audit, and limitations remain visible |
| Workflow completeness | Pass | Nine guided steps complete from dangerous renewal through next-year reuse; every visible control has an implemented result |
| Visual polish | Pass | Institutional light theme, restrained status colors, dense readable tables, local map, responsive layout, focus styles, print controls, and inspected screenshots |
| Unsupported claims | Pass | No Fortify-created risk score, compliance designation, premium forecast, carrier promise, or official IBHS affiliation |

No critical manual-review issue remains.

## Primary-source review

- Colorado's signed HB25-1182 source was reviewed on August 1, 2026. It supports the July 1, 2026 effective date, covered homeowner/condominium/multifamily and FAIR Plan contexts, written annual notice concepts, 10-day appeal acknowledgement, and 30-day reconsideration decision. The app still labels this selected workflow content as verify-current and not legal advice.
- The objective supplied a December 2025 IBHS Multifamily reference. Current official review found a June 9, 2026 IBHS update introducing formal Multifamily and Neighborhood standards and updated Home requirements. Fortify preserves the supplied version as historical demo context, links the current update, and does not reproduce proprietary requirements or claim affiliation.

## Environment and limitations

- Docker/Compose files are included, but Docker was not installed in the validation environment; the equivalent Node 22 fresh-lockfile, standalone build, health route, and production-server flow were validated locally.
- Demo role switching is not authentication. Tenant isolation, production identity, Postgres, encrypted object storage, malware scanning, retention/legal hold, backups, monitoring, container scanning, and formal accessibility/legal review remain production gates.
- The map is illustrative local GeoJSON, not survey-grade. Notice intake has no OCR. The PDF is not tagged for accessibility. No email, carrier API, contractor marketplace, billing, remote sensing, or external delivery is connected.
- Carrier acceptance, renewal, insurability, discounts, appeal success, and pricing changes are not guaranteed.

## Customer questions for discovery

1. How many community-association renewals and appeals does the practice handle each year?
2. How long do evidence collection, reconciliation, and packet assembly take today?
3. Where do carrier requirements vary enough to break a reusable workflow?
4. How often is evidence missing, stale, ambiguous, duplicated, or scoped to the wrong parcel/building/community?
5. Will underwriters use the structured packet and provenance index in a live review?
6. Will the broker provide 10-30 redacted live cases for one renewal-cycle design-partner pilot?
7. Will the broker pay for workflow time, defensibility, and reuse independent of any premium outcome?
