# Tenant entry-point inventory

Measured on August 3, 2026 by `node scripts/inventory-tenant-entry-points.mjs`. This is a convergence ledger, not an assertion that C0 is complete.

## Current coverage

| Entry-point class                              | Count | Request-bound state                                                                                                  |
| ---------------------------------------------- | ----: | -------------------------------------------------------------------------------------------------------------------- |
| Authenticated production routes                |   120 | 7 access/brokerage routes bound; 113 still use principal resolution followed by an unbound service/database instance |
| Inbound production webhooks                    |     1 | Bound through an opaque endpoint-to-tenant bootstrap and transaction-local RLS context                               |
| Authenticated session routes                   |     2 | Session read and logout bound through the same authenticated tenant transaction                                      |
| Identity bootstrap routes                      |     3 | Local sign-in plus OIDC start/callback remain unbound; local sign-in is development-only                             |
| Tenant document workers                        |     1 | Bound through explicit organization/actor context and `withTenantTransaction`                                        |
| Total enumerated tenant-sensitive entry points |   127 | 11 bound; 116 unbound                                                                                                |

The production route families are access (3), brokerage (4), communities (2), documents (4), funding (15), integrations (10), memberships (2), model recognition (12), playbooks (5), portfolio imports (7), programme analytics (11), property graph (2), recognition (11), resilience planning (7), sources (5), storage (5), and verification (16). The inventory script emits every exact path and fails if a route cannot be classified.

## Bound slice

- Brokerage workspace read, evidence-request create, evidence-request issue, and packet generation resolve an opaque session or bearer credential, enter the non-owner `fortify_app` role, set transaction-local organization and actor context, revalidate the complete principal under RLS, and execute the domain service on the same checked-out transaction.
- Access workspace read, purpose-assignment create, and assignment revoke use the same request transaction. The administrative workspace selects only the fields its UI consumes; it does not read or return session hashes, IP/user-agent metadata, storage keys, request identifiers, audit write metadata, or unrelated team rows. A non-administrative membership is rejected after tenant-bound authentication.
- Session read and logout use that same primitive; logout revocation and its audit append remain in the request transaction.
- The integration webhook uses a minimal `SECURITY DEFINER` bootstrap that returns only the organization identifier for an active endpoint. It then validates the HMAC and persists quarantine/job/audit records under that tenant's RLS context.
- The document worker requires explicit organization, actor, and worker identifiers and runs its dequeue/process mutation through `withTenantTransaction`.

## Security boundary

`fortify_resolve_request_tenant` accepts only an exact opaque token digest, credential prefix plus digest, or endpoint key. It returns only an organization identifier, executes with a fixed search path, and is executable only by `fortify_app`. After bootstrap, application code sets transaction-local tenant context and revalidates identity, membership, role, scope, assignment, expiry, revocation, and resource authorization before domain work. A bootstrap match is never authorization by itself. The inventory rejects an authenticated handler that returns the request promise without awaiting it, preserving each route's local authentication/error boundary.

## Remaining C0 work

Bind the remaining 113 authenticated production routes and the OIDC/local identity bootstrap flows, then make the inventory reject every remaining unbound entry point. Session rotation, cookie attacks, the remaining CSRF/permission/response-minimization attacks, and managed PostgreSQL login proof also remain required. The production sandbox seeder is an explicit administrative fixture operation and is not counted as a request or worker entry point.
