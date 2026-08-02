# Architecture

## Current topology

Fortify is one Next.js application with two deliberately separate runtime modes:

| Mode | Purpose | Database | Synthetic data | External use |
|---|---|---|---|---|
| `sandbox` | Deterministic offline demonstration and automated regression | Drizzle over local SQLite | Required and organization-scoped | Never for live customer data |
| `production` | Multi-tenant application data plane | Drizzle over PostgreSQL through `pg`; private S3-compatible blobs | Absent unless an administrator explicitly imports the isolated sandbox organization | Data, identity, authorization, and storage adapters implemented locally; managed deployment gates remain |

`FORTIFY_RUNTIME_MODE` is mandatory in a production Node environment. There is no automatic production fallback to SQLite or `app_state.state_json`. `DATABASE_URL` is additionally mandatory in production mode. Demo workspace routes and all legacy demo mutation/download/extraction routes return unavailable outside sandbox mode.

## Production request boundary

The production database client lives in `db/production/client.ts`. It creates a bounded PostgreSQL pool and exposes migration, health, and close operations. Application services receive a session- or credential-derived `TenantContext` containing the organization, actor, principal type, role/scopes, and optional case assignments. Repository methods reject missing context, apply the deny-by-default resource policy, and include organization predicates in every query and mutation. Authenticated production community GET/PATCH routes demonstrate the complete HTTP-to-policy-to-repository boundary.

Production authentication uses an OIDC-compatible provider adapter with authorization-code flow, discovery, PKCE, state, and nonce. Opaque database sessions, one-time invitations, local development identity, service/API credentials, external case grants, and explicit support grants are implemented in `lib/production/identity-*`. See [AUTHORIZATION_MODEL.md](./AUTHORIZATION_MODEL.md).

Production evidence bytes use `ObjectStorageAdapter`, with a private S3-compatible AWS SDK v3 implementation and a deterministic test implementation. Uploads are tenant-prefixed, signed, exact-metadata checked, quarantined, content-signature checked, scanned, and promoted only when clean. Evidence versions can be created only from clean objects. See [OBJECT_STORAGE.md](./OBJECT_STORAGE.md).

Portfolio/SOV imports consume only clean scanned storage objects. `PortfolioImportService` parses CSV or XLSX bytes, applies an immutable tenant-owned mapping version, quarantines rejected or ambiguous rows, and writes normalized client/community/property/location/building/policy records only after explicit human confirmation. Import rows and hash-bound receipts are retained across idempotent replay and non-destructive rollback. Authenticated production routes expose organization-scoped workspace options, clean-object mapping suggestion, immutable mapping save, preview, readback, commit, and rollback. The `/imports` client can upload through the M4 signed quarantine path but cannot parse the object until an independently configured scanner promotes it clean. Generic AMS CSV is schema-configurable; the Applied Epic-compatible and AMS360-compatible adapters are fixture boundaries, not certified or live vendor integrations.

## Transaction doctrine

Consequential mutations use one PostgreSQL transaction for:

1. tenant-scoped parent/resource validation;
2. optimistic revision comparison where concurrent edits matter;
3. the domain write;
4. the append-only audit event;
5. the idempotency receipt when applicable.

An exception rolls the whole transaction back. The contract suite deliberately corrupts a seed import after earlier inserts and verifies that no community or idempotency receipt survives.

Audit hashes bind the preceding tenant audit hash, organization, actor, action, resource, canonical detail, and occurrence time. PostgreSQL triggers reject audit update/delete. Requirement, evidence, and submission version tables also reject update/delete; corrections must create superseding versions.

## Tenant defense in depth

- Repository reads and writes always include `organization_id`.
- Stable resource IDs are globally unique application identifiers.
- Every customer-owned production table carries organization, creation/update actors and timestamps, revision, lifecycle state, and deletion timestamp where applicable.
- Database triggers reject parent/child references whose `organization_id` values differ, even if code bypasses repositories.
- Sandbox data is owned by `org-fortify-sandbox`, whose row is constrained to `environment=sandbox` and `synthetic=true`.
- Cross-customer analytics opt-in defaults to false.

M3 adds authenticated principals, memberships, deny-by-default authorization policies, revocation, support-access controls, and resource-complete attack tests. M4 extends the same organization boundary through storage objects, grants, scan results, and backup manifests. M5 extends it through saved mappings, mapping versions, import runs, quarantined rows, and immutable receipts. Managed-provider configuration, MFA policy enforcement, defense-in-depth RLS evaluation, rate limiting, secrets infrastructure, and deployment validation remain external/operational gates rather than inferred passes.

## Persistence adapters

- Production schema: `db/production/schema.ts`
- Production migrations: `drizzle-production/`
- Production repository: `lib/production/repository.ts`
- Explicit seed migration: `lib/production/seed-migration.ts`
- Sandbox schema: `db/schema.ts`
- Sandbox repository: `lib/repository.ts`

The sandbox retains the legacy `DemoState` document only behind `requireSandboxRuntime()`. Its row and normalized audit mirror are explicitly scoped to the synthetic sandbox organization, and writes use optimistic revision checks plus a transaction. Production code cannot call that path.

## Test database boundary

The contract suite uses PGlite as an embedded PostgreSQL-compatible engine because Docker, `postgres`, and `psql` are unavailable in the current environment. The real runtime adapter uses `pg`, not PGlite. Passing PGlite tests proves SQL migration and PostgreSQL behavior locally; it is not staging, managed-PostgreSQL, networking, backup, failover, or performance validation.

## Next architecture boundary

M5 is implemented locally, with managed-provider and rights-cleared brokerage validation still outstanding. M6 introduces durable document-processing jobs. Production remains closed to customer data until managed PostgreSQL, OIDC, private object storage, malware scanning, backup/restore, and the remaining security/deployment gates are validated.
