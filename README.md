# Fortify

Fortify is becoming a secure, multi-tenant **Resilience Investment and Insurance Recognition OS**. Its initial production wedge is California wildfire-exposed HOA, condominium, townhome, community-association, and low-rise multifamily property for specialist brokerages and property-risk practices. The current checked-in customer story remains an isolated, deterministic Colorado renewal-evidence sandbox while the broader production architecture is implemented in ordered milestones.

Fortify governs how physical baselines, interventions, capital plans, funding, milestones, independent verification, candidate model-input mappings, market-specific submissions, actual responses, and maintenance evidence connect. It is not a wildfire model, risk score, insurer, rating engine, inspection authority, contractor marketplace, construction manager, grant fund, lender, legal/actuarial decision-maker, or guarantee of any physical, financial, model, rating, underwriting, or insurance outcome. All current seeded organizations, policies, notices, premiums, and outcomes are fictional.

## Fresh clone

Prerequisites: Node.js 22.13 or newer and npm.

```bash
cp .env.example .env.local
npm ci
npm run demo:reset
npm run dev
```

Open `http://localhost:3000`, choose **Enter fictional demo**, and follow the persistent guided control. The demo uses local SQLite, local evidence storage, token-free GeoJSON, deterministic notice parsing, and no API keys or paid services.

Open `/imports` for the clearly labeled synthetic portfolio-import walkthrough. In production mode the same route requires an organization session and operates only on tenant-scoped books, saved mappings, and clean scanned storage objects.

Open `/documents` for the synthetic durable-processing and human fact-review walkthrough. In production mode document intake accepts only independently scanned clean objects, workers run under explicit service-account scope, and extracted candidates cannot become facts without a recorded human decision.

Open `/playbooks` for the synthetic destination-playbook, independent review, immutable version history, and blocker-preserving evidence-readiness walkthrough. Production mode requires a tenant session and exact approved/effective playbook applicability.

## Validation

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run demo:evaluate
npm run security:claims
npm run test:e2e
```

Generate the default Jefferson County submission outside the UI with:

```bash
npm run artifacts:generate -- case-jefferson --confirm
```

Final files appear under `output/pdf/` and `output/packets/`. The deterministic evaluation report appears at `artifacts/evaluation/demo-evaluation.json`; browser screenshots appear at `artifacts/screenshots/`.

## Architecture

- Next.js App Router, strict TypeScript, Tailwind CSS, and accessible native controls.
- Explicit `sandbox` and `production` runtime modes; production fails closed without PostgreSQL configuration and never falls back to the demo blob.
- Normalized 65-table Drizzle/PostgreSQL production schema with tenant-scoped repositories, transaction/audit coupling, optimistic concurrency, idempotency, immutable versions, cross-tenant database guards, and an explicit seed migration.
- OIDC-compatible production identity, opaque server-side sessions, invitations, organization roles, service/API credentials, external case grants, explicit support access, and deny-by-default policy checks.
- Private S3-compatible production storage with tenant prefixes, short-lived signed operations, exact checksum/MIME/size/encryption checks, quarantine/scanning state, immutable clean evidence registration, retention/legal-hold deletion controls, access audit, and an exact-byte fixture backup contract.
- Portfolio/SOV import foundation for clean scanned CSV/XLSX objects: immutable saved mappings, stable external identifiers, address/building reconciliation, dry-run quarantine, idempotent commit, append-only receipts, and non-destructive rollback. Generic AMS, Applied Epic-compatible, and AMS360-compatible boundaries are fixture-backed only.
- Authenticated portfolio-import APIs and a responsive broker workspace cover secure upload-to-quarantine, clean-object selection, mapping review/versioning, dry-run row filters, explicit human confirmation, receipts, history, and rollback without bypassing malware scanning.
- PostgreSQL-backed document jobs provide leases, bounded retries, dead-letter review, manual retry authorization, provider/classifier/extractor versioning, immutable page/segment/region provenance, multiple candidate values, confidence and model-derived disclosure, and superseding human-confirmed fact versions.
- The default production document provider is deterministic and offline: plain text and selectable PDFs only. Scans, images, rotated regions, and tables are covered by exact-hash fixtures and an injected external-provider contract; no live OCR provider or usage right is implied.
- Versioned market playbooks bind tenant/destination/program/jurisdiction/peril/property class, effective dates, source citations, bounded conditions, independent review, diffs, and append-only case linkage. Submission evidence readiness uses explicit requirement states and never averages away a blocker or implies underwriting risk/outcome probability.
- Drizzle/SQLite remains only for the deterministic organization-scoped sandbox and local regression story.
- `LocalFileStorageAdapter` remains sandbox-only; production storage uses the S3-compatible adapter and fails closed without explicit bucket configuration.
- Deterministic local text and selectable-PDF intake; no OCR or model dependency in the default runtime.
- MapLibre renders local GeoJSON with no tile server or token.
- `pdf-lib` and JSZip create byte-deterministic submission files with a machine-readable manifest and exhibits.

## Reproducible container

```bash
docker compose up --build
```

The compose file mounts `data/`, `storage/`, and `output/` as local volumes. See `docs/DEPLOYMENT.md` for boundaries and production-hardening requirements.

## Product direction and validation documents

Start with `docs/COMMERCIAL_NORTH_STAR.md`, `docs/NORTH_STAR_IMPLEMENTATION_PLAN.md`, and `docs/IMPLEMENTATION_STATUS.md`. `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/AUTHORIZATION_MODEL.md`, and `docs/MARKET_PLAYBOOK_GOVERNANCE.md` describe the reusable production foundation; they do not imply that profiles, interventions, funding, verification, model mapping, recognition submissions, or programme administration are implemented. `docs/EVIDENCE_HIERARCHY.md`, `docs/CALIFORNIA_POLICY_REGISTER.md`, and `docs/EXTERNAL_VALIDATION_GATES.md` define authority separation and currently unproven external gates. `DEMO_SCRIPT.md` and `docs/FINAL_VALIDATION_REPORT.md` describe the preserved deterministic sandbox and measured historical gates. Security and product limitations are explicit in `docs/SECURITY_AND_LIMITATIONS.md`; repository-owner controls are listed in `docs/GITHUB_SETTINGS_CHECKLIST.md`.
