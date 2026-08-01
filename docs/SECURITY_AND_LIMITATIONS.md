# Security and limitations

## MVP security controls

- Offline-by-default operation with no third-party calls, API keys, trackers, remote maps, or fabricated integrations.
- Parameterized Drizzle queries for state persistence and an explicit repository boundary.
- Local storage path normalization rejects traversal outside the configured evidence root.
- Artifact download path normalization rejects traversal outside `output/`.
- Three demo roles with server-enforced mutation permissions; underwriter review cannot alter broker evidence.
- Append-only audit semantics with hash chaining and SQLite triggers that reject audit update/delete.
- SHA-256 evidence metadata recalculated from actual seeded exhibit bytes; MIME types and file signatures are tested.
- Human gates for extracted notice fields and packet submission.
- `.env*`, SQLite files, generated evidence, outputs, and browser traces are ignored by default.
- Explicit `sandbox` and `production` modes prevent the production runtime from silently serving the SQLite demo state.
- The production data layer requires an organization-scoped tenant context, predicates every repository operation by organization, rejects cross-organization references with database triggers, and commits domain mutations with append-only audit events.
- Production history records are immutable at the database layer; renewal-case creation supports replay-safe idempotency and optimistic revision checks.

## Deliberate MVP limitations

- Demo role switching is not production authentication. The normalized data layer is tenant-scoped, but there is no production identity binding, SSO, MFA, session revocation, user lifecycle, or row-level-security policy yet.
- SQLite and local filesystem storage target a single trusted local demo. A normalized `pg`/Drizzle adapter now exists, but no managed PostgreSQL provider or multi-instance production topology has been validated.
- Operating-system permissions provide storage protection; application-level encryption at rest and customer-managed keys are not implemented.
- Seeded exhibits contain only fictional demo content. No malware scanning, image metadata stripping, DLP, legal hold, retention automation, or backup exists.
- Notice intake supports uploaded text and text-based PDFs through deterministic local heuristics with a 2 MB limit. It does not do OCR, signature verification, or general legal interpretation.
- Evidence upload accepts PDF, JPEG, PNG, and plain text with a 5 MB limit and path normalization. File-signature validation, malware scanning, and content disarm are production gates, not MVP claims.
- Reference content is selected, versioned, and non-exhaustive. “Verify current requirements” is mandatory. Fortify is not legal advice and has no official IBHS or carrier affiliation.
- MapLibre uses local GeoJSON without external tiles. Parcel/building geometry is illustrative, not survey-grade.
- PDF accessibility tagging is not implemented. The packet is visually reviewed but should undergo production accessibility remediation.
- No email delivery, carrier API, contractor marketplace, billing, remote sensing, or production legal templates are implemented.

## Production gates before live customer data

Threat model and privacy review; production identity/authorization; managed PostgreSQL deployment validation and optional defense-in-depth RLS; S3-compatible encrypted storage; key and secret management; upload validation/malware scanning; retention/deletion/legal-hold policy; encrypted backups and restore exercises; centralized audit export; rate limits and CSRF review; dependency and container scanning; incident response; accessibility audit; legal review of references/templates; and a signed data-processing agreement.

Carrier acceptance, renewal, insurability, discounts, appeal success, and pricing changes are not guaranteed.
