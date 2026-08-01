# Production data model

The PostgreSQL schema contains 65 normalized tables at the published M7 baseline. It is a reusable tenant, property, renewal, evidence, storage, document, and market-playbook foundation for the Resilience Investment and Insurance Recognition OS—not a claim that the expanded domain is implemented.

California production work must extend this model with parcel/unit/alias/relationship/property versions; governed policy/programme/model sources; typed evidence levels; target profiles; intervention specifications; baseline conditions; resilience projects and capital plans; funding programmes/commitments/milestones; independent verifiers/findings/certificates; external models and input mappings; explicit market/funder commitments; recognition submissions and separate evidence/model/rating/underwriting/placement/funding responses; longitudinal maintenance/outcomes; programme cohorts; data rights; and recognition-graph events. Each new customer-controlled resource requires tenant columns, authorization, database guards, audit coupling, and attack tests before it counts as implemented.

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

Ambiguous records are not merged by name. Import reconciliation creates reviewed identifiers only after explicit human confirmation.

## Portfolio import

- `import_mappings`: stable tenant-owned mapping identity and current-version pointer.
- `import_mapping_versions`: immutable CSV/XLSX sheet, header, column, constant, schema-version, and content-hash configuration.
- `portfolio_imports`: clean storage object, book, source boundary, idempotency request hash, counts, state, and created-entity ownership ledger.
- `import_rows`: exact spreadsheet row number, raw/normalized values, accepted/rejected/ambiguous state, errors, warnings, candidates, and applied entities.
- `import_receipts`: immutable hash-bound preview, commit, and rollback summaries.

An import never destroys rejected rows, prior receipts, or created-record history. Rollback archives or marks only records owned by that import; it does not delete the import ledger. AMS records are authoritative unless tenant configuration says otherwise, and names alone never authorize a merge.

## Insurance and cases

- `markets`: carrier, MGA, program administrator, FAIR Plan, or other configured destination.
- `programs`: first-class market, peril, jurisdiction, and property-class scope.
- `policies`: broker/AMS-authoritative policy record and renewal expiration.
- `renewal_cases`: renewal/appeal workflow with first-class peril, jurisdiction, property class, owner, dates, and revision.
- `case_assignments`: exactly one membership or external principal, case role, permissions, expiry, and revocation.
- `external_access_grants`: purpose-labeled, hashed, expiring, revocable bearer access to one case.

## Sources and requirements

- `source_documents`: immutable original-version metadata, checksum, clean storage reference, source system, classification/version/confidence, supersession, processing status, and synthetic flag.
- `source_passages`: immutable page/segment/region provenance, extraction run, passage kind, and extractor version.
- `requirement_sets`: market/program scope plus source URL and verify-current state.
- `requirements`: stable requirement identity, scope, importance, and blocking flag.
- `requirement_versions`: immutable effective version, citation, content hash, and supersession.

## Market playbooks and readiness

- `market_playbooks`: stable tenant-owned playbook identity and description.
- `playbook_versions`: immutable destination/program/jurisdiction/peril/property-class/policy-form scope, effective period, source/version/citation, verify-current state, author, content hash, change summary, and predecessor.
- `playbook_requirements`: immutable required/recommended and blocking semantics plus accepted evidence/source types, freshness, scope, review authority, deadline, template/delivery configuration, and caveat.
- `playbook_applicability_rules`: bounded field/operator/value conditions; no arbitrary executable code.
- `playbook_version_reviews`: one append-only independent human approval or changes-requested decision per version.
- `case_playbook_links`: append-only exact-version case/destination pins with predecessor lineage.

Approved applicability is exact and effective-date-bound. Zero or multiple matches fail closed. Readiness is derived at request time from requirement, evidence-link, evidence-version, and contradiction records; no averaged readiness record can hide a blocker. See [MARKET_PLAYBOOK_GOVERNANCE.md](./MARKET_PLAYBOOK_GOVERNANCE.md).

## Document processing and facts

- `document_processing_jobs`: durable queue state, availability, lease, attempt budget, idempotency, terminal error, and dead-letter lifecycle.
- `document_processing_attempts`: immutable attempt number, worker, provider/version, start/finish, and retryable/terminal error evidence; only the running-to-terminal transition is allowed.
- `document_extraction_runs`: immutable provider/classifier/extractor versions, exact source hash, document classification, page count, model-derived flag, and warnings.
- `extracted_fields`: immutable multiple candidates per field with ordinal, typed value, confidence, model-derived flag, and exact source passage.
- `extracted_field_reviews`: append-only human confirmation, correction, or rejection with reviewer, value, note, and time.
- `document_facts`: immutable human-confirmed value versions with source candidate/passage, correction reason, and supersession.

Jobs can be retried but history cannot be rewritten. A service account can process bytes and create candidates; it cannot confirm facts. Missing candidates remain absent, and unavailable geometry, low confidence, conflicts, and model derivation remain explicit.

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

Audit events and requirement/evidence/submission/playbook versions cannot be updated or deleted. Playbook requirements, conditions, reviews, and case links are also immutable. A correction creates a successor. Production migrations contain no `app_state` table or `DemoState` JSON column.

## Seed migration

`migrateDemoSeedToProduction` maps the deterministic fixture into the explicit synthetic organization `org-fortify-sandbox`. It creates normalized books, clients, communities, properties, locations, buildings, markets, programs, policies, cases, notice sources/passages, requirement versions, evidence versions/links, contradictions, tasks, submission versions/items, responses, outcomes, maintenance, audit, and one idempotent receipt. A repeated identical seed is a replay; reused version text with different content is rejected.

## Deliberately deferred entities

The north star also names richer coverage, parcel/relationship/version, collaboration, checklist, delivery, reviewer-session, consent/data-right, export/deletion-request, and integration entities. They are introduced with their owning milestones rather than represented by unused placeholder tables. `docs/IMPLEMENTATION_STATUS.md` remains authoritative about what is implemented.
