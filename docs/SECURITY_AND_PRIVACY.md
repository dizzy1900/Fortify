# Security and privacy

Fortify is a multi-tenant evidence system. It does not create wildfire scores, legal opinions, certifications, insurance decisions, or funding authority. Production is fail-closed and the synthetic sandbox is a separate data plane.

## Implemented controls

- OIDC-ready identity, opaque server sessions, MFA-capable identity metadata, deny-by-default roles, assignment scope, expiring external access, and reason-bound support access.
- Organization predicates and database relation guards on production repositories, plus PostgreSQL RLS policies on every table carrying `organization_id`. The application database role must not own tables or have `BYPASSRLS`; each direct reporting/maintenance session must set `fortify.organization_id` before tenant access. Managed-role verification remains a deployment gate.
- Private S3-compatible objects, signed operations, checksum/MIME/size/encryption assertions, quarantine, malware result custody, retention, legal hold, and append-only evidence supersession.
- Nonce CSP, HSTS in production, frame denial, MIME sniffing prevention, restrictive browser permissions, same-origin cookie-mutation protection, HMAC rate buckets, verified webhooks, bounded request/provider retries, and liveness/readiness separation.
- Structured operational events recursively redact credentials, cookies, email addresses, request bodies, document content, and signatures. Customer identifiers may only be logged as keyed pseudonyms.
- Dependency audit, secret/claims scans, CodeQL, container scanning, Playwright, and operational contract checks run in CI.

## Privacy and deletion

Data is tenant-confidential unless an explicit record says otherwise. Cross-customer execution is disabled. Deletion uses lifecycle state and reasoned events; immutable audit, evidence, receipt, decision, and legal-hold records are never silently rewritten. A deletion request must identify contractual retention, litigation hold, programme/report dependencies, backup expiry, and the records eligible for erasure. Aggregate reports exclude deleted tenant rows from future computations.

## Unvalidated controls

No SOC 2, ISO certification, penetration test, managed RLS role, live KMS, live scanner, live OIDC/MFA, production backup schedule, provider PITR, or disaster-recovery exercise has been demonstrated. These are launch gates, not inferred from local tests.
