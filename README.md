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
- Drizzle schema over file-backed SQLite; data access stays behind `lib/repository.ts` for a future Postgres adapter.
- `LocalFileStorageAdapter` stores evidence and exports locally; the interface supports a future S3-compatible adapter without configuring one.
- Deterministic local text and text-based-PDF intake; no OCR or model dependency.
- MapLibre renders local GeoJSON with no tile server or token.
- `pdf-lib` and JSZip create byte-deterministic submission files with a machine-readable manifest and exhibits.

## Reproducible container

```bash
docker compose up --build
```

The compose file mounts `data/`, `storage/`, and `output/` as local volumes. See `docs/DEPLOYMENT.md` for boundaries and production-hardening requirements.

## Product direction and validation documents

Start with `docs/COMMERCIAL_NORTH_STAR.md`, `docs/NORTH_STAR_IMPLEMENTATION_PLAN.md`, and `docs/IMPLEMENTATION_STATUS.md`. `DEMO_SCRIPT.md` and `docs/FINAL_VALIDATION_REPORT.md` describe the preserved deterministic sandbox. Security and product limitations are explicit in `docs/SECURITY_AND_LIMITATIONS.md`; repository-owner controls are listed in `docs/GITHUB_SETTINGS_CHECKLIST.md`.
