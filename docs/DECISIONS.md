# Decisions

## D-001 - Local-first Node runtime

Use standard Next.js App Router on Node with standalone output. The initialized Worker-compatible starter was not retained because the objective requires file-backed SQLite and local packet/exhibit storage without a cloud runtime. This is reversible behind the repository and storage boundaries.

## D-002 - SQLite and portable identifiers

Use Drizzle schemas with text identifiers, ISO dates, explicit join tables, and JSON only for optional display metadata. Avoid SQLite-specific business logic so a Postgres adapter can follow the same service contract.

## D-003 - Deterministic state and extraction

Seed fixed dates and identifiers. Notice extraction uses text fixtures and auditable heuristics. There is no OCR or model dependency in the MVP.

## D-004 - Readiness is an evidence measure

Compute six visible components and a weighted aggregate. Contradictions can only reduce readiness. The score never represents risk, eligibility, compliance, or predicted carrier action.

## D-005 - Local file adapter

Store generated packet files and seeded exhibits under ignored local directories. The adapter contract documents an S3-compatible successor without fabricating an integration.

## D-006 - Demo roles, not production authentication

Use explicit broker, manager, and underwriter demo roles with server-enforced mutation permissions. Production identity and tenant isolation remain future work.
