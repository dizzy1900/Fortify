# Data flow

1. A user authenticates through configured OIDC. Fortify stores an opaque hashed session and resolves tenant, role, and assignments server-side.
2. Browser requests cross the proxy boundary, which assigns a request id and CSP nonce, applies secure headers, and rejects cross-origin cookie mutations. Authenticated APIs consume a hashed durable rate bucket.
3. Route handlers call tenant-aware services. Normalized PostgreSQL is the production source of truth; repository predicates, database guards, and RLS policies protect tenant records. Audit and evidence history is append-only.
4. Uploads enter tenant-prefixed quarantine through signed operations. Exact bytes are hashed, typed, scanned, then promoted or rejected. Application records store object references, not public URLs.
5. Workers and version-pinned adapters process documents or exchange explicitly scoped data. Provider credentials remain secret references. Retries, dead letters, webhooks, and exact receipts are durable.
6. Human confirmation gates extracted facts, governed publication, funding/payment decisions, verification, model outputs, submissions, correspondence normalization, and outcomes.
7. Reports and recognition submissions bind exact versions and stored artifacts. External recipients receive only the approved scope; delivery does not imply acceptance.
8. Logical database dumps are encrypted with an externally managed key before backup storage. Object backup manifests retain exact hashes. Restore validation targets a fresh isolated database and checks schema, counts, and hashes before any promotion.

The Colorado sandbox persists in local SQLite and fixture storage only. It must never be connected to production credentials or treated as customer evidence.
