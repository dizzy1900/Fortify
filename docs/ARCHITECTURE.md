# Architecture

## North-star alignment

The target system is a California-first Resilience Investment and Insurance Recognition OS. The existing normalized renewal data plane plus the M4 governed-source layer are reusable foundations, not the completed domain. Future bounded contexts must add target profiles, intervention specifications, capital plans, funding commitments and milestones, independent verification, evidence levels, external-model mappings, explicit recognition commitments, market submissions, separate response taxonomies, maintenance, programme administration, and recognition-graph events without collapsing their authority.

The deterministic Colorado workflow remains an isolated sandbox and second-jurisdiction regression. Production jurisdiction, hazard, source, profile, model, market, programme, property class, and effective-period logic must remain first-class. PostGIS is introduced only when parcel, building, landscape, route, or shared-infrastructure spatial relationships materially require it; no map or coordinate is treated as fabricated risk intelligence.

## Current topology

Fortify is one Next.js application with two deliberately separate runtime modes:

| Mode | Purpose | Database | Synthetic data | External use |
|---|---|---|---|---|
| `sandbox` | Deterministic offline demonstration and automated regression | Drizzle over local SQLite | Required and organization-scoped | Never for live customer data |
| `production` | Multi-tenant application data plane | Drizzle over PostgreSQL through `pg`; private S3-compatible blobs | Absent unless an administrator explicitly imports the isolated sandbox organization | Data, identity, authorization, and storage adapters implemented locally; managed deployment gates remain |

`FORTIFY_RUNTIME_MODE` is mandatory in a production Node environment. There is no automatic production fallback to SQLite or `app_state.state_json`. `DATABASE_URL` is additionally mandatory in production mode. Demo workspace routes and all legacy demo mutation/download/extraction routes return unavailable outside sandbox mode.

## Production request boundary

The production database client lives in `db/production/client.ts`. It creates a bounded PostgreSQL pool and exposes migration, health, and close operations. Application services receive a session- or credential-derived `TenantContext` containing the organization, actor, principal type, role/scopes, and optional portfolio/case assignments with their exact permission intersections. Repository methods reject missing context, apply the deny-by-default resource policy, and include organization predicates in every query and mutation. Authenticated production routes demonstrate the complete HTTP-to-policy-to-repository boundary.

Production authentication uses an OIDC-compatible provider adapter with authorization-code flow, discovery, PKCE, state, and nonce. Opaque database sessions, one-time invitations, local development identity, service/API credentials, external case grants, and explicit support grants are implemented in `lib/production/identity-*`. See [AUTHORIZATION_MODEL.md](./AUTHORIZATION_MODEL.md).

Production evidence bytes use `ObjectStorageAdapter`, with a private S3-compatible AWS SDK v3 implementation and a deterministic test implementation. Uploads are tenant-prefixed, signed, exact-metadata checked, quarantined, content-signature checked, scanned, and promoted only when clean. Evidence versions can be created only from clean objects. See [OBJECT_STORAGE.md](./OBJECT_STORAGE.md).

Portfolio/SOV imports consume only clean scanned storage objects. `PortfolioImportService` parses CSV or XLSX bytes, applies an immutable tenant-owned mapping version, quarantines rejected or ambiguous rows, and writes normalized client/community/property/location/building/policy records only after explicit human confirmation. Import rows and hash-bound receipts are retained across idempotent replay and non-destructive rollback. Authenticated production routes expose organization-scoped workspace options, clean-object mapping suggestion, immutable mapping save, preview, readback, commit, and rollback. The `/imports` client can upload through the M4 signed quarantine path but cannot parse the object until an independently configured scanner promotes it clean. Generic AMS CSV is schema-configurable; the Applied Epic-compatible and AMS360-compatible adapters are fixture boundaries, not certified or live vendor integrations.

Document intake follows the same clean-object boundary. `DocumentPipelineService` records a source version and a PostgreSQL job in one tenant-scoped transaction, then a separately scoped service-account worker claims the job with a lease. Attempts, extraction runs, passages, candidates, reviews, and facts remain normalized and immutable. Retries are bounded; stale leases return to the queue; terminal failures enter an explicit dead-letter state; a broker-authorized manual retry adds only one recorded attempt. Provider, classifier, and extractor keys/versions are stored with exact source hashes, page/segment/region citations, confidence, and model-derived flags. A candidate becomes a fact only after a human confirmation or correction, and a correction creates a superseding fact version.

`LocalSelectableTextProvider` is the default offline production adapter for plain text and selectable PDFs. It does not invent OCR, PDF-native geometry, or image support. Exact-hash fixtures exercise scans, rotations, tables, images, conflicts, and low-confidence/model-derived candidates; `ExternalDocumentIntelligenceProvider` is an injected boundary that requires separate rights, credentials, security review, and staging validation.

`MarketPlaybookService` creates immutable destination versions and bounded requirement conditions, records independent human review, resolves one exact approved/effective version, pins it to a case destination through append-only lineage, and derives named evidence states without a weighted average. Missing or overlapping applicability fails closed. Requirement evaluation binds accepted type/source/disposition, scope, freshness, review state, and contradiction state to the same evidence versions. The `/playbooks` administrator workspace exposes source/version/citation, verify-current state, lifecycle, lineage, case pin, and the blocker-preserving calculation. See [MARKET_PLAYBOOK_GOVERNANCE.md](./MARKET_PLAYBOOK_GOVERNANCE.md).

`GovernedSourceService` registers stable authority identities and immutable versions with source/snapshot hash, dates, rights, redistribution boundary, structured summary, verify-current state, extraction provenance, human confirmation, and immediate predecessor lineage. Exact bytes and approved snapshots must reference an in-tenant clean storage object with the same SHA-256. A different human reviews the exact source and rights; a publisher other than the author records a separate decision. Only published verified-current versions can back playbooks or typed reliance records. Publishing a relied-on successor emits an immutable playbook/case impact snapshot without mutating either consumer. Profiles and reports return an explicit unavailable state until their typed graphs exist. The authenticated `/sources` APIs and responsive workspace implement the same lifecycle in production and an offline, metadata-only fixture in sandbox. See [CALIFORNIA_POLICY_REGISTER.md](./CALIFORNIA_POLICY_REGISTER.md).

`PropertyGraphService` registers portfolios, property membership, parcels, unit summaries, typed physical scopes, aliases, relationships, and immutable property versions in one tenant-scoped transaction with an audit event and idempotency receipt. Database guards independently reject cross-organization links, scope references to another property, non-immediate version lineage, and version mutation/deletion. The authenticated production API provides organization-scoped workspace readback and graph registration; `/property-graph` uses those APIs in production and an explicitly separate synthetic California fixture in sandbox mode. Geometry stays nullable and carries an explicit state; EPSG:4326 readiness is not a claim that PostGIS, a boundary, or geospatial truth has been deployed.

`AccessControlService` creates purpose-specific portfolio or case assignments only after tenant-owned member/scope validation and role/data-domain boundary checks. Identity resolution admits active, unrevoked, unexpired direct case assignments plus direct/team portfolio assignments, then intersects their resource/action permissions with the organization-role ceiling for the exact request scope. Assignment fields cannot be edited; one reason-bound revocation is allowed and retained. Administrative workspace reads append an immutable `data_access_log`. Database guards independently reject cross-organization assignment/log references and access-log mutation. The `/access` workspace uses three authenticated APIs in production and a visibly synthetic, non-persisting fixture in sandbox mode; no production role switch exists.

`BrokerageCaseService` composes only normalized production records. It loads tenant-scoped imported client/community/property/policy/case context, one human-confirmed case-linked notice, governed evidence-request versions, exact evidence-version bytes, contradictions, and immutable submissions. Draft evidence requests require an authenticated member and explicit confirmation; issue is a controlled one-way transition with expiry and an explicit off-platform-delivery or scoped-principal boundary. Packet generation independently reads every evidence byte, verifies its recorded hash and size, produces deterministic PDF/ZIP/manifest/letter bytes, writes each object under the tenant prefix, independently reads it back, and commits storage, scan, submission, artifact, audit, and idempotency records in one transaction. Request versions and submission artifacts cannot be updated or deleted. Four authenticated APIs and the responsive `/brokerage` workspace expose the workflow without importing or falling back to `DemoState`.

## Transaction doctrine

Consequential mutations use one PostgreSQL transaction for:

1. tenant-scoped parent/resource validation;
2. optimistic revision comparison where concurrent edits matter;
3. the domain write;
4. the append-only audit event;
5. the idempotency receipt when applicable.

An exception rolls the whole transaction back. The contract suite deliberately corrupts a seed import after earlier inserts and verifies that no community or idempotency receipt survives.

Audit hashes bind the preceding tenant audit hash, organization, actor, action, resource, canonical detail, and occurrence time. PostgreSQL triggers reject audit update/delete. Requirement, evidence, submission, and playbook version tables also reject update/delete; playbook rules, reviews, and case links are append-only, and corrections must create successors.

## Tenant defense in depth

- Repository reads and writes always include `organization_id`.
- Stable resource IDs are globally unique application identifiers.
- Every customer-owned production table carries organization, creation/update actors and timestamps, revision, lifecycle state, and deletion timestamp where applicable.
- Database triggers reject parent/child references whose `organization_id` values differ, even if code bypasses repositories.
- Colorado sandbox data is owned by `org-fortify-sandbox`; the separate California development fixture is owned by `org-fortify-california-fixture`. Both rows are constrained to `environment=sandbox` and `synthetic=true`.
- Cross-customer analytics opt-in defaults to false.

M3 adds authenticated principals, memberships, deny-by-default authorization policies, revocation, support-access controls, and resource-complete attack tests. M4 extends the same organization boundary through storage objects, grants, scan results, and backup manifests. M5 extends it through saved mappings, mapping versions, import runs, quarantined rows, and immutable receipts. M6 extends it through jobs, attempts, extraction runs, passages, candidate fields, human reviews, and confirmed fact versions. M7 extends it through playbooks, immutable versions/rules/reviews, and append-only case linkage. The replacement M1 graph slice extends it through portfolios, property links, parcels, unit summaries, scopes, aliases, relationships, and versions. Replacement M2 extends the role ceiling and tenant boundary through direct/team portfolio assignments, purpose/data-domain grants, assignment-permission intersection, revocation-only history, and immutable access logs. Replacement M3 extends it through governed evidence requests, immutable request versions, exact generated submission artifacts, controlled state transitions, and case-scoped packet authorization. Replacement M4 extends it through source identities, immutable versions/reviews/publications, exact dependencies, and successor alerts. Replacement M5 extends it through target profiles, criteria, applicability, separate review/publication, interventions, baseline assessments/gaps, projects, and capital-plan scenarios. Managed-provider configuration, MFA policy enforcement, defense-in-depth RLS evaluation, rate limiting, secrets infrastructure, live external delivery, and deployment validation remain external/operational gates rather than inferred passes.

## Persistence adapters

- Production schema: `db/production/schema.ts`
- Production migrations: `drizzle-production/`
- Production repository: `lib/production/repository.ts`
- Identity/access services: `lib/production/identity-service.ts`, `lib/production/access-control-service.ts`
- Property-graph service: `lib/production/property-graph-service.ts`
- Brokerage case/packet services: `lib/production/brokerage-case-service.ts`, `lib/production/brokerage-packet.ts`
- Governed-source service: `lib/production/governed-source-service.ts`
- Resilience-planning service: `lib/production/resilience-planning-service.ts`
- Explicit seed migration: `lib/production/seed-migration.ts`
- Explicit California graph fixture: `lib/fixtures/california-property-graph.ts`
- Sandbox schema: `db/schema.ts`
- Sandbox repository: `lib/repository.ts`

The sandbox retains the legacy `DemoState` document only behind `requireSandboxRuntime()`. Its row and normalized audit mirror are explicitly scoped to the synthetic sandbox organization, and writes use optimistic revision checks plus a transaction. Production code cannot call that path.

## Test database boundary

The contract suite uses PGlite as an embedded PostgreSQL-compatible engine because Docker, `postgres`, and `psql` are unavailable in the current environment. The real runtime adapter uses `pg`, not PGlite. Passing PGlite tests proves SQL migration and PostgreSQL behavior locally; it is not staging, managed-PostgreSQL, networking, backup, failover, or performance validation.

## Next architecture boundary

The published M7 renewal/playbook tree and locally validated replacement M1 property-graph, M2 identity/access, M3 brokerage, M4 governed-source, and M5 resilience-planning slices are reusable foundations. The next product sequence starts M6 funding and project execution. Funding, independent verification, model mapping, market commitments, recognition delivery/outcomes, programme analytics, and operational hardening remain unimplemented or incomplete. Production remains closed to customer data until managed PostgreSQL/PostGIS, OIDC/MFA, private storage/scanning, deployment, backup/restore, security, rights-cleared source/data, and external gates are validated.
