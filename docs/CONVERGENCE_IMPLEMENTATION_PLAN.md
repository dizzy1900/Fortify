# Product convergence implementation plan

This plan executes [PRODUCT_CONVERGENCE_NORTH_STAR.md](./PRODUCT_CONVERGENCE_NORTH_STAR.md). Work proceeds in ordered vertical slices. A later priority may not displace an incomplete, unblocked earlier priority.

## C0 - Request and authority safety

Status: in progress; local code paths and the executable managed-staging proof contract are complete, but no managed receipt exists.

1. Separate migration and non-owner application database identities.
2. Establish `withTenantTransaction` with transaction-local organization and actor context.
3. Prove real RLS filtering, write rejection, and pool-context reset under the application role.
4. Route every authenticated tenant operation through that primitive, including workers and inbound integration resolution.
5. Make audit append serialization and OIDC, invitation, session, and one-use grant consumption concurrency-safe.
6. Complete CSRF, cookie/session rotation, permission, rate-limit, and response-minimization attacks. Local attack coverage is complete. `npm run db:validate:managed-postgres` now replays role, RLS, cross-tenant, commit/rollback reset, and same-backend pool attacks in staging and emits a redacted receipt; it remains unexecuted without selected managed credentials.

Exit evidence: a real PostgreSQL test exercises a non-owner login; every tenant entry point is enumerated and bound; concurrency attacks have one winner; no tenant setting survives a transaction; lint, typecheck, migration, unit/integration, tenant-isolation, build, and browser gates pass.

## C1 - Bounded architecture and semantic kernel

Status: in progress. The remaining C0 managed receipt is externally credential-gated; local C1 work proceeds without treating that receipt as complete.

Inventory tables, routes, DTOs, services, and authorization resources. Record keep/merge/retire decisions before schema changes. Split schema and services by bounded context, generate API types from authoritative contracts, and standardize command/query, transaction, error, audit, and idempotency patterns.

The first slice established the fail-closed ownership inventory and migrated the property-graph context to the shared operation envelope and response contract. The second slice expanded the inventory, forbade direct cross-context service implementation imports, recorded one explicit identity-access port, and extracted integration workspace reads behind a typed query port and authoritative response contract. The third slice separates the administrative identity/access workspace query from its command service, preserves purpose-bound access logging and administrative authority, and gives its route, presenter, deterministic fixture, and client one shared minimized response contract. The fourth slice separates portfolio-import workspace reads from the command service, preserves all five read-authority checks and tenant predicates, fails closed on unsupported persisted file formats, and gives the route, presenter, client, and deterministic query one shared minimized contract. The fifth slice separates market-playbook workspace reads from the command service, preserves its complete read-authority set, assigned-case scope, verified-current published-source filter, independent review history, and exact-version linkage, and gives the route, presenter, and client one shared minimized contract. The sixth slice separates brokerage workspace reads from packet/request commands, enforces read authority for every projected organization, case, property, notice, evidence, contradiction, request, submission, and artifact resource, retains tenant and assigned-case scope, and gives its route, presenter, deterministic fixture, and client one shared minimized contract. The inventory now covers 39 production service/HTTP/context modules. Six of 15 client workspace DTO declarations are shared; 9 remain merge work. Remaining service/schema splits, broader contract generation, error/audit/idempotency convergence, and duplicate DTO removal are still required.

Exit evidence: dependency boundaries are enforced, duplicate contracts are removed, no production behavior depends on fixture DTOs, and retired surfaces have migration/compatibility evidence.

## C2 - Case-first shell and design system

Status: not started; blocked by C1.

Create the shared shell, role-specific information architecture, tokens, primitives, and domain patterns described in [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md). Limit top-level destinations to seven or fewer and move milestone workspaces behind the continuous case journey.

Exit evidence: first-time broker usability, keyboard/screen-reader operation, responsive desktop/tablet/mobile inspection, and no milestone or fixture controls in authenticated production navigation.

## C3 - Continuous customer workflow

Status: not started; blocked by C2.

Use one normalized organization/portfolio/property/case across intake, evidence, planning, funding when applicable, verification, submission, response, outcome, maintenance, and audit/ROI. Replace client-only fixture actions with production mutations and preserve authority gates at every transition.

Exit evidence: one deterministic production-architecture case passes the complete journey without code-path resets or duplicated records; generated PDF/ZIP bytes and governed lineage are inspected.

## C4 - Managed staging

Status: externally blocked until infrastructure and credentials are selected; adapters and contracts may progress after C0.

Validate managed PostgreSQL/PostGIS, OIDC/MFA, private KMS-backed storage, malware scanning, jobs, secrets, monitoring, backups, PITR, and fresh-target restore. Deploy an immutable image and exercise the same tenant-safe workflow.

Exit evidence: deployment receipt, non-owner role proof, restore report, alert delivery, performance/load results, and security review.

## C5 - Design-partner pilot

Status: externally blocked.

Onboard a rights-cleared California cohort of at least ten cases without code changes. Measure workflow completion, time, evidence gaps, user feedback, and continued-use intent while keeping market/programme outcomes distinct.

Exit evidence: the gates in [PILOT_READINESS.md](./PILOT_READINESS.md) are satisfied with source-linked records.

## Per-cycle procedure

Read the operating contract, convergence north star, this plan, implementation status, design system, pilot ledger, Git status, and recent commits. Select the earliest incomplete unblocked slice, implement it end to end, inspect the real workflow, run proportionate gates, update measured evidence and limitations, and publish a coherent PR against `main` when authentication permits.
