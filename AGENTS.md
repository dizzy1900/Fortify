# Fortify operating contract

## Product boundary

Fortify is a Resilience Investment and Insurance Recognition OS. The initial production wedge is California wildfire-exposed HOA, condominium, townhome, community-association, and low-rise multifamily property for specialist brokerages and property-risk practices. The existing Colorado renewal flow remains an isolated synthetic sandbox and regression fixture.

Fortify is not a wildfire model, risk score, insurer, rating engine, inspection authority, designation body, contractor marketplace, construction manager, grant fund, lender, generic quoting platform, or legal, actuarial, engineering, or underwriting decision-maker.

Never promise or imply guaranteed insurance, discounts, compliance, designation, loss reduction, renewal, insurability, carrier acceptance, funding, or appeal success. Keep physical specification, verified installation, modelled vulnerability, modelled loss, filed rating, underwriting, financing/programme, observed-performance, and claims evidence distinct. A complete evidence workflow never proves that an intervention changed a model, rate, premium, underwriting decision, funding decision, or insurance availability.

## Implementation contract

- Preserve the deterministic Colorado sandbox, guided renewal story, PDF/ZIP artifacts, provenance, confirmation gates, clarification loop, year-over-year record, tests, and institutional visual direction.
- Production uses normalized tenant-scoped PostgreSQL; SQLite `DemoState` is sandbox-only and never a production fallback. Use PostGIS only where spatial relationships materially require it.
- Keep persistence behind repositories, blobs behind encrypted storage adapters, and provider-specific behavior behind versioned interfaces. Preserve deterministic offline fixtures without API keys or paid services.
- Human approval is mandatory for confirmed extracted facts, payment/disbursement exports, verification conclusions, model-input acceptance, recognition commitments, market submissions, and insurance or funding decisions.
- Audit, consent, source versions, evidence, verification, commitments, submissions, responses, and corrections are append-only or superseding. Never silently overwrite governed history.
- Show source, authority, version, effective period, citation, rights/restrictions, retrieval date, review owner, and verify-current status for policy, standards, programme, model, insurer, and commitment references. Do not reproduce proprietary standards wholesale.
- Missing, stale, unsupported, contradictory, expired, out-of-scope, unreviewed, unverified, or unaccepted states remain explicit and never count as satisfied.
- Cross-tenant analytics or training require explicit contractual rights, opt-in, cohort thresholds, de-identification, suppression, access control, audit, and deletion treatment.
- Every visible control must work. Every route needs meaningful populated, loading, error, empty, insufficient-evidence, and permission-denied behavior where applicable.

## Validation contract

Work in the ordered vertical milestones in `docs/NORTH_STAR_IMPLEMENTATION_PLAN.md` and update `docs/PROGRESS.md` plus `docs/IMPLEMENTATION_STATUS.md` with measured evidence. Before declaring a milestone locally validated, run lint, strict typecheck, unit/integration and tenant-isolation tests, migration checks, production build, deterministic evaluation, and the full Playwright guided flow. Inspect actual desktop, tablet, and mobile UI; generated PDF pages, ZIP contents, reports, and screenshots; and record exact results and limitations in `docs/FINAL_VALIDATION_REPORT.md`.

Never conflate code complete, locally validated, deployment validated, customer validated, market validated, programme validated, or externally blocked.
