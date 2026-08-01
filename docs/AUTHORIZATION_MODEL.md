# Identity and authorization model

Fortify production access is deny by default. The deterministic sandbox role selector is not an identity provider and is unavailable to production routes.

## Identity providers and sessions

- Production authentication uses the OIDC authorization-code flow through `openid-client` with discovery, PKCE S256, state, and nonce validation.
- Authentication attempts are single-use and expire after ten minutes. Return paths accept only local absolute paths.
- The local development provider requires `FORTIFY_LOCAL_IDENTITY_ENABLED=true` and refuses to run when `NODE_ENV=production`.
- Sessions are opaque random bearer values. Only SHA-256 token digests are stored; the default lifetime is eight hours, and server-side revocation is immediate.
- Every session is bound to one active organization membership. An identity with multiple memberships must explicitly select an organization.
- Membership revocation also revokes every active session for that identity and organization in the same transaction.
- OIDC authentication methods (`amr`) and MFA capability are recorded without making MFA-enforcement claims about an unconfigured provider.

## Organization roles

| Role | Intended authority |
|---|---|
| Organization owner | Full tenant administration, including explicit support access |
| Brokerage administrator | Membership, team, workflow, and tenant administration |
| Practice leader | Book, market, requirements, cases, evidence, and submissions; no identity-provider administration |
| Broker/account executive | Case, evidence, task, submission, response, and outcome work |
| Marketer | Market-facing case, submission, response, and outcome work |
| Assistant | Source, evidence, task, and maintenance work with case visibility |
| Client/property manager | Assigned property, evidence, task, and maintenance contribution |
| Board contributor | Assigned case/property evidence contribution |
| Evidence contributor | Assigned evidence and task contribution |
| Underwriter reviewer | Assigned read-only submission/evidence review plus structured market-response creation |
| Read-only auditor | Tenant resource and audit reads only |

The executable matrix is `lib/production/authorization.ts`. An absent role, absent scope, unknown resource/action, organization mismatch, or case-assignment mismatch is denied.

## External, service, and support principals

- External collaborator/reviewer tokens are random, hashed at rest, purpose-labeled, limited to one case, limited to explicit scopes, expiring, revocable, and audited.
- Service accounts receive scoped API credentials. The raw credential is returned once; only its prefix and digest persist. Account and credential expiry/revocation are both enforced.
- Fortify support has no standing tenant access. A customer organization owner or administrator must approve a reason, scopes, and expiry. Grant and revocation are append-only audit events.
- Invitation tokens are random, hashed at rest, single-use, email-bound, expiring, and revocable. OIDC invitation acceptance carries only the verified invitation ID through the server-side authentication attempt.

## Enforcement layers

1. Route handlers resolve an opaque session, API credential, or external grant on the server.
2. Repository, identity, and storage-service boundaries call the deny-by-default policy for the requested resource and action.
3. Every tenant query includes `organization_id`; case-scoped principals also require an assigned case ID.
4. PostgreSQL same-organization triggers reject cross-tenant parent references even when repository code is bypassed.
5. Consequential identity/permission mutations and audit events commit in the same transaction.

The local PGlite attack suite covers all 49 registered production resource classes, direct cross-tenant identity/storage/import references, storage-key traversal, role denial, case scope, invitation/session expiry, membership revocation, API credential scopes, external grant revocation, support grant revocation, and storage-grant expiry/revocation. A managed identity provider, MFA policy, managed PostgreSQL and object-storage deployment, production secrets, rate limiting, and operational incident controls still require deployment validation.
