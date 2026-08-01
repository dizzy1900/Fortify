# Production data model

The PostgreSQL schema contains 48 normalized tables. It is a forward foundation for the Colorado wildfire renewal workflow, not a claim that every later workflow is implemented.

## Organizations and access foundation

- `organizations`: brokerage/sandbox ownership boundary, environment, synthetic flag, analytics opt-in.
- `identities`: provider-stable subject, verified email state, display name, authentication methods, and MFA capability metadata.
- `memberships`: identity binding, organization role, and invitation/acceptance/revocation lifecycle.
- `teams`: organization-owned workgroups.
- `team_memberships`: same-organization membership in a workgroup.
- `sessions`: opaque-token digest, selected organization, authentication methods, expiry, use, and revocation.
- `authentication_attempts`: single-use OIDC state, nonce, PKCE verifier, local return path, and optional invitation/organization context.
- `invitations`: email-bound, hashed, expiring, single-use membership invitation.
- `external_principals`: external collaborator/reviewer lifecycle.
- `service_accounts` and `api_credentials`: tenant-owned automation identities and scoped hashed credentials.
- `support_access_grants`: customer-approved reason, scopes, expiry, approver, and revocation.
- `books`: portfolio/book boundary and external identity.
- `clients`: insured/client boundary under a book.

## Property graph

- `communities`: association/community record and property class.
- `properties`: insured property aggregate with unit/building counts.
- `property_identifiers`: source-specific broker, manager, parcel, or provider identifiers with review state.
- `locations`: normalized address and geospatial coordinates.
- `buildings`: stable building identity within a property.

Ambiguous records are not merged by name. Future import reconciliation must create reviewed identifiers/relationships.

## Insurance and cases

- `markets`: carrier, MGA, program administrator, FAIR Plan, or other configured destination.
- `programs`: first-class market, peril, jurisdiction, and property-class scope.
- `policies`: broker/AMS-authoritative policy record and renewal expiration.
- `renewal_cases`: renewal/appeal workflow with first-class peril, jurisdiction, property class, owner, dates, and revision.
- `case_assignments`: exactly one membership or external principal, case role, permissions, expiry, and revocation.
- `external_access_grants`: purpose-labeled, hashed, expiring, revocable bearer access to one case.

## Sources and requirements

- `source_documents`: original document metadata, checksum, storage reference, source system, processing status, and synthetic flag.
- `source_passages`: page/segment provenance, extractor version, confidence, and human confirmation.
- `requirement_sets`: market/program scope plus source URL and verify-current state.
- `requirements`: stable requirement identity, scope, importance, and blocking flag.
- `requirement_versions`: immutable effective version, citation, content hash, and supersession.

## Evidence

- `storage_objects`: private tenant-prefixed key, exact metadata/checksum/encryption, quarantine/scan state, retention, legal hold, backup, and deletion state.
- `storage_access_grants`: purpose-labelled upload/download operation, principal, expiry, revocation, and bounded use count.
- `malware_scan_results`: immutable scanner/version/status/findings history.
- `backup_manifests` and `backup_manifest_items`: tenant-scoped exact-byte backup inventory and immutable readback checks.
- `evidence_items`: stable evidence identity and current-version pointer.
- `evidence_versions`: immutable file/source/scope/freshness/review record with checksum and supersession.
- `evidence_requirement_links`: case-specific version-to-version scope, freshness, review, and disposition state.
- `contradictions`: explicit evidence-version conflicts and human resolution.

Missing, stale, contradictory, or unreviewed evidence remains a named state. No status represents underwriting risk or acceptance probability.

## Workflow and submission

- `tasks`: case and optional requirement work.
- `submissions`: stable case/destination submission identity.
- `submission_versions`: immutable human-confirmed message, caveats, and manifest hash.
- `submission_items`: exact evidence version included in a submission version.
- `market_responses`: original reviewer language, normalized type/reason, and supersession.
- `renewal_outcomes`: original outcome language, normalized status/reason, and correction chain.
- `maintenance_events`: property evidence refresh schedule.

## Governance

- `idempotency_keys`: organization/scope/key request hash and response receipt.
- `audit_events`: append-only tenant hash chain for consequential activity.

## Cross-cutting invariants

Every customer-owned table carries `organization_id`, created/updated timestamps, created/updated actor, revision, lifecycle status, and deletion timestamp. Database triggers reject cross-organization references. Unique indexes bind external identifiers, hashes, versions, and idempotency keys inside the organization boundary.

Audit events and requirement/evidence/submission versions cannot be updated or deleted. A correction creates a successor. Production migrations contain no `app_state` table or `DemoState` JSON column.

## Seed migration

`migrateDemoSeedToProduction` maps the deterministic fixture into the explicit synthetic organization `org-fortify-sandbox`. It creates normalized books, clients, communities, properties, locations, buildings, markets, programs, policies, cases, notice sources/passages, requirement versions, evidence versions/links, contradictions, tasks, submission versions/items, responses, outcomes, maintenance, audit, and one idempotent receipt. A repeated identical seed is a replay; reused version text with different content is rejected.

## Deliberately deferred entities

The north star also names richer coverage, parcel/relationship/version, collaboration, checklist, delivery, reviewer-session, consent/data-right, export/deletion-request, integration, and durable-job entities. They are introduced with their owning milestones rather than represented by unused placeholder tables. `docs/IMPLEMENTATION_STATUS.md` remains authoritative about what is implemented.
