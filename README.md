# Fortify

Fortify is becoming a secure, multi-tenant catastrophe-property evidence and renewal control plane for specialist brokers. The current checked-in runtime remains a local, customer-demo-ready Colorado wildfire renewal evidence sandbox while the production architecture is implemented in ordered milestones.

It is evidence infrastructure, not a wildfire risk model, inspection marketplace, legal opinion, actuarial certification, official IBHS product, or carrier integration. All seeded organizations, policies, notices, premiums, and outcomes are fictional. Carrier acceptance, renewal, discounts, and pricing changes are not guaranteed.

## Fresh clone

Prerequisites: Node.js 22.13 or newer and npm.

```bash
cp .env.example .env.local
npm ci
npm run demo:reset
npm run dev
```

Open `http://localhost:3000`, choose **Enter fictional demo**, and follow the persistent guided control. The demo uses local SQLite, local evidence storage, token-free GeoJSON, deterministic notice parsing, and no API keys or paid services.

## Validation

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run demo:evaluate
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
- Normalized 53-table Drizzle/PostgreSQL production schema with tenant-scoped repositories, transaction/audit coupling, optimistic concurrency, idempotency, immutable versions, cross-tenant database guards, and an explicit seed migration.
- OIDC-compatible production identity, opaque server-side sessions, invitations, organization roles, service/API credentials, external case grants, explicit support access, and deny-by-default policy checks.
- Private S3-compatible production storage with tenant prefixes, short-lived signed operations, exact checksum/MIME/size/encryption checks, quarantine/scanning state, immutable clean evidence registration, retention/legal-hold deletion controls, access audit, and an exact-byte fixture backup contract.
- Portfolio/SOV import foundation for clean scanned CSV/XLSX objects: immutable saved mappings, stable external identifiers, address/building reconciliation, dry-run quarantine, idempotent commit, append-only receipts, and non-destructive rollback. Generic AMS, Applied Epic-compatible, and AMS360-compatible boundaries are fixture-backed only.
- Drizzle/SQLite remains only for the deterministic organization-scoped sandbox and local regression story.
- `LocalFileStorageAdapter` remains sandbox-only; production storage uses the S3-compatible adapter and fails closed without explicit bucket configuration.
- Deterministic local text and text-based-PDF intake; no OCR or model dependency.
- MapLibre renders local GeoJSON with no tile server or token.
- `pdf-lib` and JSZip create byte-deterministic submission files with a machine-readable manifest and exhibits.

## Reproducible container

```bash
docker compose up --build
```

The compose file mounts `data/`, `storage/`, and `output/` as local volumes. See `docs/DEPLOYMENT.md` for boundaries and production-hardening requirements.

## Product direction and validation documents

Start with `docs/COMMERCIAL_NORTH_STAR.md`, `docs/NORTH_STAR_IMPLEMENTATION_PLAN.md`, and `docs/IMPLEMENTATION_STATUS.md`. `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, and `docs/AUTHORIZATION_MODEL.md` describe the production foundation. `DEMO_SCRIPT.md` and `docs/FINAL_VALIDATION_REPORT.md` describe the preserved deterministic sandbox. Security and product limitations are explicit in `docs/SECURITY_AND_LIMITATIONS.md`; repository-owner controls are listed in `docs/GITHUB_SETTINGS_CHECKLIST.md`.
