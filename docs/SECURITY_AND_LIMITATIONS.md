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
- Production OIDC uses discovery, authorization code, PKCE S256, state, and nonce through a maintained protocol library; no application JWT implementation was introduced.
- Opaque sessions, invitation tokens, API credentials, and external grants are random and stored only as digests. Expiry and server-side revocation are enforced.
- The production policy is deny by default across every registered resource class. Organization mismatch and external case mismatch fail closed before repository access.
- Support has no standing customer access; customer-approved support grants require a reason, explicit scopes, expiry, and audit trail.
- Production object keys are tenant-prefixed and traversal-checked. Signed uploads bind MIME, size, checksum, encryption, and a short expiry; finalization independently reads metadata before quarantine.
- Quarantined bytes are rechecked for exact size/checksum and basic content signature before a malware-provider result can promote them. Only clean objects can back immutable evidence versions or downloads.
- Purpose-labelled download grants expire, are revocable before redemption, and are single-use. Legal holds and future retention dates block deletion. Fixture backup copies are independently read and SHA-256 checked before manifest acceptance.

## Deliberate MVP limitations

- Demo role switching remains sandbox-only. Production OIDC/session/role infrastructure is implemented locally, but no managed provider, enforced MFA policy, production redirect registration, secret manager, rate limit, or provider-admin lifecycle has been deployment-validated.
- SQLite and local filesystem storage target a single trusted local demo. A normalized `pg`/Drizzle adapter now exists, but no managed PostgreSQL provider or multi-instance production topology has been validated.
- The private S3-compatible adapter, AES256/KMS settings, quarantine states, scanner interface, legal-hold/retention hooks, deletion state, and fixture backup contract are implemented locally. No managed bucket policy, KMS rotation, live malware provider, DLP/content disarm, provider object lock, lifecycle automation, independent backup account, or monitored restore drill has been validated.
- A signed provider URL already minted cannot be revoked before its short expiry; database revocation prevents future redemption, and the residual URL lifetime is capped at 60 seconds.
- Notice intake supports uploaded text and text-based PDFs through deterministic local heuristics with a 2 MB limit. It does not do OCR, signature verification, or general legal interpretation.
- Sandbox evidence upload accepts its original deterministic formats and limits. Production upload accepts PDF, JPEG, PNG, CSV, and XLSX up to 25 MiB with normalized names, exact metadata, content signatures, and a scanner-provider gate; live malware performance and content disarm remain production-validation gates.
- Reference content is selected, versioned, and non-exhaustive. “Verify current requirements” is mandatory. Fortify is not legal advice and has no official IBHS or carrier affiliation.
- MapLibre uses local GeoJSON without external tiles. Parcel/building geometry is illustrative, not survey-grade.
- PDF accessibility tagging is not implemented. The packet is visually reviewed but should undergo production accessibility remediation.
- No email delivery, carrier API, contractor marketplace, billing, remote sensing, or production legal templates are implemented.

## Production gates before live customer data

Threat model and privacy review; managed OIDC/MFA and PostgreSQL deployment validation; defense-in-depth RLS evaluation; private S3-compatible bucket and CORS validation; key and secret management; live malware provider; retention/deletion/legal-hold policy validation; encrypted independent backups and restore exercises; centralized audit export; rate limits and CSRF review; dependency and container scanning; incident response; accessibility audit; legal review of references/templates; and a signed data-processing agreement.

Carrier acceptance, renewal, insurability, discounts, appeal success, and pricing changes are not guaranteed.
