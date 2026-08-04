# Security and privacy

Fortify is a multi-tenant evidence system. It does not create wildfire scores, legal opinions, certifications, insurance decisions, or funding authority. Production is fail-closed and the synthetic sandbox is a separate data plane.

## Implemented controls

- OIDC-ready identity, opaque server sessions, MFA-capable identity metadata, deny-by-default roles, assignment scope, expiring external access, and reason-bound support access.
- Organization predicates and database relation guards on production repositories, plus PostgreSQL RLS policies on every table carrying `organization_id`. Migration 0027 creates the non-login `fortify_app` role and least-privilege grants. `withApplicationTransaction`, `withTenantTransaction`, and `withAuthenticatedTenantRequest` use `SET LOCAL ROLE` plus transaction-local organization/actor settings; fixed-search-path, execute-restricted bootstrap returns only the tenant identifier for an exact opaque credential, invitation/state digest, webhook key, or provider-verified identity with exactly one active organization before full principal/HMAC/membership revalidation under RLS. All 127 enumerated tenant entry points are bound. Local attacks prove filtering, write rejection, pooled-context reset, invalid-credential rejection, bootstrap and authorization boundaries, cross-tenant denial, response minimization, separated human authority, atomic one-use operations, and unchanged foreign state across every production route family. Managed-role verification remains the C0/deployment gate.
- Private S3-compatible objects, signed operations, checksum/MIME/size/encryption assertions, quarantine, malware result custody, retention, legal hold, and append-only evidence supersession.
- Nonce CSP, HSTS in production, frame denial, MIME sniffing prevention, restrictive browser permissions, exact-origin/fetch-metadata cookie-mutation protection, HMAC rate buckets, verified webhooks, bounded request/provider retries, and liveness/readiness separation. Interactive sessions use opaque digest-only tokens, atomic live-row resolution, one-winner rotation/revocation, fixed absolute expiry, minimized responses, generic failures, and Secure HttpOnly domainless `__Host-` `SameSite=Strict` cookies in production.
- Structured operational events recursively redact credentials, cookies, email addresses, request bodies, document content, and signatures. Customer identifiers may only be logged as keyed pseudonyms.
- Dependency audit, secret/claims scans, CodeQL, container scanning, Playwright, and operational contract checks run in CI.

## Privacy and deletion

Data is tenant-confidential unless an explicit record says otherwise. Cross-customer execution is disabled. Deletion uses lifecycle state and reasoned events; immutable audit, evidence, receipt, decision, and legal-hold records are never silently rewritten. A deletion request must identify contractual retention, litigation hold, programme/report dependencies, backup expiry, and the records eligible for erasure. Aggregate reports exclude deleted tenant rows from future computations.

## Unvalidated controls

No SOC 2, ISO certification, penetration test, managed RLS role, live KMS, live scanner, live OIDC/MFA, production backup schedule, provider PITR, or disaster-recovery exercise has been demonstrated. These are launch gates, not inferred from local tests.
