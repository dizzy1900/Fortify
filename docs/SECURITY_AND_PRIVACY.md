# Security and privacy

Fortify is a multi-tenant evidence system. It does not create wildfire scores, legal opinions, certifications, insurance decisions, or funding authority. Production is fail-closed and the synthetic sandbox is a separate data plane.

## Implemented controls

- OIDC-ready identity, opaque server sessions, MFA-capable identity metadata, deny-by-default roles, assignment scope, expiring external access, and reason-bound support access.
- Organization predicates and database relation guards on production repositories, plus PostgreSQL RLS policies on every table carrying `organization_id`. Migration 0027 creates the non-login `fortify_app` role and least-privilege grants. `withApplicationTransaction`, `withTenantTransaction`, and `withAuthenticatedTenantRequest` use `SET LOCAL ROLE` plus transaction-local organization/actor settings; fixed-search-path, execute-restricted bootstrap returns only the tenant identifier for an exact opaque credential, invitation/state digest, webhook key, or provider-verified identity with exactly one active organization before full principal/HMAC/membership revalidation under RLS. Local attacks prove filtering, write rejection, reset, invalid-credential rejection, session/API-credential/OIDC bootstrap, administrative-role denial, access/storage/invitation/identity/property/document response minimization, cross-tenant storage-grant, invitation, session, community, property, document intake/review/retry denial, exactly one concurrent request-bound redemption winner, and exactly one OIDC callback winner. Twenty-nine of 127 enumerated entry points are bound; full binding and managed-role verification remain C0/deployment gates.
- Private S3-compatible objects, signed operations, checksum/MIME/size/encryption assertions, quarantine, malware result custody, retention, legal hold, and append-only evidence supersession.
- Nonce CSP, HSTS in production, frame denial, MIME sniffing prevention, restrictive browser permissions, same-origin cookie-mutation protection, HMAC rate buckets, verified webhooks, bounded request/provider retries, and liveness/readiness separation.
- Structured operational events recursively redact credentials, cookies, email addresses, request bodies, document content, and signatures. Customer identifiers may only be logged as keyed pseudonyms.
- Dependency audit, secret/claims scans, CodeQL, container scanning, Playwright, and operational contract checks run in CI.

## Privacy and deletion

Data is tenant-confidential unless an explicit record says otherwise. Cross-customer execution is disabled. Deletion uses lifecycle state and reasoned events; immutable audit, evidence, receipt, decision, and legal-hold records are never silently rewritten. A deletion request must identify contractual retention, litigation hold, programme/report dependencies, backup expiry, and the records eligible for erasure. Aggregate reports exclude deleted tenant rows from future computations.

## Unvalidated controls

No SOC 2, ISO certification, penetration test, managed RLS role, live KMS, live scanner, live OIDC/MFA, production backup schedule, provider PITR, or disaster-recovery exercise has been demonstrated. These are launch gates, not inferred from local tests.
