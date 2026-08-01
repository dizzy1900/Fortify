# Integration roadmap

This phase list is retained as historical renewal-foundation context and is superseded for execution order by [NORTH_STAR_IMPLEMENTATION_PLAN.md](./NORTH_STAR_IMPLEMENTATION_PLAN.md). New provider work follows M11 only after the California brokerage, source, profile/intervention, funding, verification, model-mapping/commitment, recognition, and programme boundaries exist. No integration below is active, validated, or implied.

## Phase 1 - Production data plane

- Add a Postgres repository implementing the current service contract; verify migrations, tenant scopes, transaction semantics, and audit append-only controls.
- Add an S3-compatible storage adapter with server-side encryption, tenant prefixes, immutable versioning, lifecycle policy, and signed downloads.
- Add managed identity/SSO with broker, manager, reviewer, and administrator authorization tested at every mutation boundary.

## Phase 2 - Evidence ingress and operations

- Permissioned email-forwarding intake with idempotent threading and explicit source provenance.
- Secure cloud-drive import for customer-selected files only.
- Optional OCR provider behind the existing extraction interface, with confidence, source-page references, human confirmation, and deterministic fallback.
- Malware scanning, content-type verification, image metadata policy, and upload quarantine.

## Phase 3 - Partner review surfaces

- Expiring, least-privilege underwriter review links with identity, view logs, structured clarification, and revocation.
- Customer-approved carrier template exchange. Do not represent a template as a live carrier API.
- Outbound packet delivery with explicit human send confirmation, delivery receipt, and immutable submitted-byte hash.

## Phase 4 - Portfolio intelligence

- Operational analytics for cycle time, evidence gaps, rework, response loops, and reuse.
- Never add predicted wildfire risk, expected loss, underwriting eligibility, premium forecasts, or claims of compliance to the readiness model.

Each phase requires customer evidence, security review, legal review, and rollback criteria before promotion.
