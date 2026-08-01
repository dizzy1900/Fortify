# Final validation report

Status: **customer-demo-ready MVP; local validation passed on August 1, 2026**. This is not a production-readiness, legal-correctness, carrier-acceptance, or market-validation claim.

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
