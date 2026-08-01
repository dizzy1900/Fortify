# Fortify operating contract

## Product boundary

Fortify is broker-side renewal evidence infrastructure for fictional Colorado community-association, condominium, townhome, and low-rise multifamily master policies. It is not a wildfire model, inspection marketplace, legal opinion, actuarial certification, official IBHS product, or carrier integration.

Never create or infer wildfire risk scores. Never promise or imply compliance, designation, premium savings, renewal, insurability, carrier acceptance, or appeal success. Use evidence-readiness language only. All carrier and pricing outcomes in the demo are fictional and non-predictive.

## Implementation contract

- Preserve deterministic offline operation with no API keys or paid services.
- Keep persistence behind repository interfaces and blobs behind storage adapters.
- Use Drizzle with local SQLite; keep schema choices portable to Postgres.
- Human confirmation is required for extracted notice fields and submissions.
- Audit events are append-only. Evidence supersession never destroys earlier records.
- Show source, version, and verify-current status for legal/standards references; do not reproduce proprietary standards wholesale.
- Missing, stale, contradictory, or unreviewed evidence must remain explicit and must never be silently treated as satisfied.
- Every visible control must work and every route must have meaningful populated, loading, error, and empty-state behavior.

## Validation contract

Work in vertical milestones and update `docs/PROGRESS.md`. Before declaring completion run lint, strict typecheck, unit/integration tests, production build, deterministic demo evaluation, and the full Playwright guided demo. Inspect generated PDF pages, ZIP contents, reports, and screenshots. Record exact results and limitations in `docs/FINAL_VALIDATION_REPORT.md`.
