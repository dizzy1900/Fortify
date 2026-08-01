# Architecture

## Current topology

Fortify is one Next.js application with two deliberately separate runtime modes:

| Mode | Purpose | Database | Synthetic data | External use |
|---|---|---|---|---|
| `sandbox` | Deterministic offline demonstration and automated regression | Drizzle over local SQLite | Required and organization-scoped | Never for live customer data |
| `production` | Multi-tenant application data plane | Drizzle over PostgreSQL through `pg` | Absent unless an administrator explicitly imports the isolated sandbox organization | Foundation implemented; identity and object storage gates remain |

`FORTIFY_RUNTIME_MODE` is mandatory in a production Node environment. There is no automatic production fallback to SQLite or `app_state.state_json`. `DATABASE_URL` is additionally mandatory in production mode. Demo workspace routes and all legacy demo mutation/download/extraction routes return unavailable outside sandbox mode.

## Production request boundary

The production database client lives in `db/production/client.ts`. It creates a bounded PostgreSQL pool and exposes migration, health, and close operations. Application services receive a `TenantContext` containing an explicit organization ID and actor subject; repository methods reject an empty context and include organization predicates in every query and mutation.

Authentication and session-derived construction of `TenantContext` belong to M3. Until that exists, the production repository is not exposed through a public customer API.

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

M3 must add authenticated principals, memberships, deny-by-default authorization policies, database session scoping/RLS where appropriate, revocation, support-access controls, and resource-complete attack tests. M2 does not claim those controls.

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

M3 introduces identity, organization membership, authorization, invitations, sessions, external principals, service accounts, API credentials, support access, and tenant attack coverage. Production routes remain unavailable to customers until that boundary is implemented and tested.
