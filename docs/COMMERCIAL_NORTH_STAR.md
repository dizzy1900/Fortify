# FORTIFY COMMERCIAL NORTH STAR

Treat this brief as authoritative where it conflicts with the existing demo-oriented roadmap. Persist it in `docs/COMMERCIAL_NORTH_STAR.md` and continue executing the active Goal. Do not respond with only a plan.

## 1. Product definition

Fortify is the catastrophe-property evidence and renewal control plane for specialist brokers.

It converts:

- property and building records
- carrier notices
- statements of values
- loss runs
- inspection reports
- mitigation documentation
- contractor records
- photographs
- certificates
- prior submissions
- underwriter correspondence

into:

- a persistent property evidence graph
- a versioned market requirement crosswalk
- an actionable renewal workflow
- a market-specific submission
- an auditable clarification record
- a normalized placement outcome
- a maintenance and renewal-ready record for the next cycle

The initial wedge is Colorado wildfire-exposed community-association, condominium and multifamily master-policy workflow.

The expansion path is other Western wildfire markets and then other catastrophe perils. Do not implement speculative multi-peril functionality before the initial workflow is production-ready, but design the schema so `peril`, `jurisdiction`, `market`, `program`, `property_class` and `requirement_version` are first-class concepts rather than hard-coded wildfire fields.

## 2. Initial customer

Primary customer:
- specialist retail or wholesale insurance brokerage
- community-association, condominium, multifamily or habitational book
- at least 50–100 relevant renewals annually
- multiple admitted, surplus-lines, MGA and FAIR Plan markets
- fragmented evidence across AMS, email, files, property managers and contractors

Economic buyers:
- practice leader
- head of placement
- COO
- brokerage principal

Daily users:
- account executive
- marketer
- renewal specialist
- technical assistant

External users:
- property manager
- HOA/condominium board representative
- contractor or mitigation professional
- inspector
- underwriter or MGA reviewer
- customer auditor

## 3. Product boundaries

Never:
- create or imply a Fortify wildfire-risk score
- provide legal or actuarial advice
- promise renewal, quote, bind, discount or premium change
- claim affiliation with IBHS, a carrier, regulator or inspection programme
- treat an LLM result as authoritative
- send a submission without an explicit human confirmation gate
- build a contractor marketplace in this phase
- replace the broker’s AMS
- build generic multi-carrier quoting as the core product
- expose customer data across tenants
- train or benchmark across tenants without explicit contractual rights

Fortify may:
- ingest external scores and risk factors with source/version provenance
- map evidence to configured requirements
- describe evidence completeness and workflow readiness
- prepare human-reviewed drafts
- record actual responses and outcomes
- produce de-identified aggregate analytics only when legally and contractually permitted

## 4. Preserve the current strengths

Retain and regression-test:
- deterministic seeded sandbox
- current notice-to-packet guided story
- real PDF and ZIP generation
- evidence hashes and provenance
- human confirmation gates
- immutable audit doctrine
- clear synthetic/production labels
- no-overclaiming language
- institutional light-theme visual character
- local offline fixtures for tests
- current route and browser coverage unless deliberately replaced by superior production routes

Move the demo into an isolated `sandbox` organization and explicit development/demo mode. Production users must never share its global state or see synthetic data unless they opt into the sandbox.

## 5. Correct the current architecture

### 5.1 Eliminate global DemoState persistence

Replace the `app_state.state_json` application model.

Use normalized PostgreSQL tables as the source of truth. The existing Drizzle schema is a starting point, not an immutable contract.

Every customer-owned entity must carry:
- `organization_id`
- stable ID
- created/updated timestamps
- created/updated actor
- version or revision where appropriate
- deletion/retention status where appropriate

Use transactional service and repository boundaries.

Implement:
- optimistic concurrency or explicit edit locks where simultaneous edits matter
- idempotency keys for import, delivery and webhook operations
- database constraints
- migration scripts
- seed-to-normalized migration
- test factories
- fixtures
- audit events generated inside the same transaction as consequential changes

Do not retain a production fallback that silently writes the full application to one JSON blob.

### 5.2 Keep the architecture lean

Prefer:
- one Next.js application
- PostgreSQL
- S3-compatible object storage
- one durable PostgreSQL-backed job worker unless a measured need justifies another queue
- provider interfaces for external services

Avoid unnecessary microservices, Redis, Kubernetes or persistent GPU infrastructure.

Use serverless or scale-to-zero deployment where practical, but do not compromise durable jobs, database migrations or file-processing reliability.

## 6. Identity, tenancy and authorization

Implement production authentication using an OIDC-compatible provider and a local development provider.

Model:
- identity
- organization
- organization membership
- team
- role
- granular case assignment
- external collaborator
- external reviewer
- service account
- API credential

Minimum roles:
- organization owner
- brokerage administrator
- practice leader
- broker/account executive
- marketer
- assistant
- client/property manager
- board contributor
- evidence contributor
- underwriter reviewer
- read-only auditor
- Fortify support administrator with explicit support-access controls

Requirements:
- server-side authorization on every query and mutation
- tenant-scoped repository methods
- deny-by-default permissions
- invitation flow
- membership revocation
- MFA-ready identity
- session expiration
- externally shared review links with expiry, purpose, case scope and revocation
- no role switching in production
- audit of permissions and support access

Create automated cross-tenant attack tests for every resource class.

## 7. Production domain model

Expand and normalize the current ontology.

At minimum include:

### Organizations and books
- Organization
- Membership
- Team
- Client
- Book
- IntegrationConnection

### Property graph
- Community
- Property
- Parcel
- Building
- UnitSummary
- Location
- PropertyIdentifier
- PropertyRelationship
- PropertyVersion

### Insurance
- Insured
- Policy
- Coverage
- Market
- Carrier
- MGA
- Program
- WholesaleRelationship
- Renewal
- RenewalCase
- AppealCase
- SubmissionDestination

### Source and requirements
- SourceDocument
- SourcePassage
- RequirementSet
- Requirement
- RequirementVersion
- RequirementCondition
- MarketPlaybook
- PlaybookVersion
- ApplicabilityRule

### Evidence
- EvidenceItem
- EvidenceVersion
- EvidenceScope
- EvidenceProvenance
- EvidenceReview
- EvidenceRequirementLink
- EvidenceMarketDisposition
- Contradiction
- ExpirationPolicy

### Workflow
- Task
- Checklist
- CaseAssignment
- Comment
- Mention
- Notification
- CommunicationThread
- Deadline
- ServiceLevelEvent

### Submission
- Submission
- SubmissionVersion
- SubmissionItem
- SubmissionTemplate
- GeneratedArtifact
- Delivery
- DeliveryReceipt
- SecureReviewSession
- ReviewerRequest

### Outcome
- MarketResponse
- Clarification
- Declination
- Quote
- Bind
- RenewalOutcome
- ReasonTaxonomy
- EvidenceAcceptanceEvent
- OutcomeCorrection

### Maintenance
- MitigationAction
- MaintenanceEvent
- Inspection
- Designation
- Recertification
- Reminder

### Governance
- Consent
- DataRight
- RetentionPolicy
- LegalHold
- AuditEvent
- ExportReceipt
- DeletionRequest

## 8. Portfolio and property onboarding

Implement:

### 8.1 Spreadsheet and SOV import
Support:
- CSV
- XLSX
- standard statements of values
- configurable column mapping
- saved mappings
- stable external identifiers
- address normalization
- duplicate detection
- building/location reconciliation
- unit and currency validation
- dry-run preview
- rejected-row quarantine
- idempotent reruns
- import receipts
- rollback

### 8.2 AMS boundary
Implement:
- generic AMS CSV adapter
- adapter SDK
- one production-quality Applied Epic-compatible import/export boundary using available customer exports
- one AMS360-compatible boundary
- documented API placeholders where proprietary credentials are unavailable
- contract tests and fixtures
- no screen scraping

The AMS remains authoritative for policy and client records unless explicitly configured otherwise.

### 8.3 Property identity
Support:
- broker identifiers
- property-manager identifiers
- APN or parcel identifiers where available
- geocoded addresses
- building labels
- external inspection identifiers
- source-specific aliases

Avoid merging records solely because their names are similar. Require review for ambiguous identity resolution.

## 9. Secure document and evidence platform

### 9.1 Object storage
Implement:
- private buckets
- tenant prefixes
- signed uploads/downloads
- server-side encryption
- checksums
- MIME validation
- size limits
- filename normalization
- malware scanning
- quarantine
- image metadata handling
- retention
- legal hold
- deletion
- backup
- access audit

Never store live uploads under the application source tree.

### 9.2 Intake channels
Support:
- direct upload
- drag and drop
- mobile photo upload
- unique case upload link
- property-manager request link
- forwarded email
- Microsoft Graph mailbox integration as the first full email connector
- provider boundary for Gmail
- cloud-drive import boundary

### 9.3 Document processing
Create an asynchronous pipeline:

1. accept and hash original bytes
2. validate and scan
3. classify document
4. extract text/OCR
5. identify candidate fields, tables and evidence
6. retain page/region provenance
7. calculate confidence
8. route uncertain fields to human review
9. create confirmed structured records
10. retain original and superseding versions

Use provider interfaces for OCR and document intelligence. Provide deterministic fixtures in tests.

No model output becomes a confirmed fact without a recorded reviewer or a deliberately configured high-confidence automation policy approved by the tenant.

## 10. Notice and correspondence intelligence

Replace the hard-coded notice parser with a versioned extraction framework.

Support:
- carrier notices
- renewal questionnaires
- nonrenewal notices
- risk-score notices
- mitigation-discount notices
- underwriter emails
- evidence requests
- clarification messages
- declination correspondence

Extract:
- sender
- market
- policy
- dates and deadlines
- score or classification when present
- stated risk drivers
- requested mitigation
- required evidence
- appeal rights
- communication history
- reason codes

Every field needs:
- value
- source document
- page or email segment
- confidence
- extractor/version
- reviewer
- confirmation state
- correction history

## 11. Versioned market playbooks

Create an administrator-facing playbook builder.

A playbook is scoped by:
- tenant
- market/carrier/MGA/program
- jurisdiction
- peril
- property class
- policy form or programme
- effective period

It can express:
- required items
- recommended items
- blocking items
- conditional items
- accepted evidence types
- evidence freshness
- scope requirements
- source requirements
- review authority
- deadlines
- template requirements
- delivery requirements

Use a bounded deterministic condition system. Do not use arbitrary JavaScript or model-generated executable code.

Preserve:
- source and citation
- version
- author/reviewer
- effective date
- change diff
- prior-case linkage

## 12. Evidence readiness

Replace the universal weighted formula with:

- deterministic requirement status
- blocking conditions
- required/recommended distinctions
- evidence freshness
- scope matching
- contradiction state
- reviewer state
- destination-specific readiness
- explicit unresolved caveats

An optional summary indicator may exist, but it must:
- be configurable
- expose its calculation
- be labelled submission/evidence readiness
- never imply underwriting risk or acceptance probability
- not hide a blocking requirement behind an average

## 13. Renewal and appeal workflow

Implement:
- case opening from policy renewal date or notice
- reusable case templates
- market strategy
- case owner and team
- task dependencies
- deadline calculation
- reminders and escalation
- external evidence requests
- communications
- client-facing progress
- quality-review stage
- final confirmation stage
- submission versioning
- clarification loop
- outcome capture
- renewal closure
- next-year roll-forward

Add bulk workflow for portfolios with many communities.

## 14. External collaboration

### Property manager and board
Provide:
- branded secure request
- no-account or lightweight-account options
- exact requested items
- upload guidance
- due date
- property/building scope
- progress
- clarification
- consent and terms
- mobile usability

### Underwriter or market reviewer
Provide:
- expiring secure link
- submission summary
- evidence index
- source previews
- accepted/request-clarification/rejected actions
- comments
- download controls
- watermarking where configured
- review receipt
- no access to unrelated customer records

## 15. Submission generation and delivery

Preserve the existing PDF/ZIP quality and add:

- tenant templates
- market templates
- cover letter
- risk narrative
- community/building summary
- SOV export
- requirement-to-evidence matrix
- evidence index
- mitigation register
- caveats
- hashes
- source appendix
- document redaction
- optional ACORD-compatible field export where licensed and permitted
- secure data room
- email delivery
- download receipt
- immutable submission version

A submission may be regenerated only as a new version.

Require explicit human confirmation of:
- destination
- included documents
- included fields
- caveats
- message
- permissions

## 16. Response and placement outcomes

Model actual events:

- received
- opened
- acknowledgement
- clarification requested
- additional evidence requested
- evidence accepted
- evidence rejected
- no appetite
- declined
- referred
- quoted
- revised quote
- bound
- renewed
- nonrenewed
- withdrawn
- lost to competitor
- no response

Create a normalized reason taxonomy while preserving original language.

Allow correction and superseding records; never silently overwrite an outcome.

## 17. Moat-enabling acceptance graph

For every destination and requirement, record:

- playbook/version
- submission/version
- property and property class
- peril
- evidence item/version
- evidence type
- source type
- scope
- age
- reviewer status
- clarification
- disposition
- market response
- final placement status

Create tenant-only analytics first.

Build cross-customer analytics only behind:
- explicit contractual opt-in
- minimum cohort sizes
- de-identification
- suppression of sensitive market/client data
- documented governance
- testable non-disclosure controls

Do not expose unsupported predictions. Begin with descriptive evidence such as:
- “This market requested a scope clarification in 4 of your last 7 similar cases.”
- “Invoices without building schedules were returned in 3 cases.”
- “This evidence type has not yet been reviewed by this destination.”

## 18. Portfolio analytics and ROI

Measure:
- renewal cases opened
- time to first complete packet
- time to market
- manual touches
- overdue tasks
- missing evidence at opening
- clarification loops
- packet versions
- evidence reuse
- evidence expiry
- market response time
- quote and bind counts
- outcome completeness
- user adoption
- external contributor completion
- underwriter reviewer use
- estimated hours saved based on customer-confirmed baseline

Do not attribute premium movement to Fortify without a valid methodology.

Create an exportable pilot report comparing baseline and product workflow.

## 19. Administration and configuration

Build production administration for:
- organizations
- users
- roles
- teams
- markets
- playbooks
- templates
- integrations
- products/plans
- usage limits
- retention
- support access
- feature flags
- audit review
- import jobs
- failed processing
- data export/deletion

Support manual enterprise invoicing and entitlement management. Do not prioritise a self-serve Stripe funnel over the initial enterprise workflow.

## 20. API and integrations

Provide:
- versioned REST or typed RPC API
- OpenAPI where appropriate
- webhooks
- scoped API keys
- idempotency
- pagination
- rate limiting
- integration health
- sync receipts
- retry/dead-letter handling
- schema versioning

Initial integration priorities:
1. CSV/XLSX/SOV
2. Microsoft Graph email
3. secure external links
4. object storage
5. AMS export/import
6. property-management CSV/API boundary
7. risk and inspection providers

## 21. Security and reliability

Implement:
- encryption in transit and at rest
- tenant isolation
- least privilege
- MFA-ready OIDC
- signed URLs
- secrets management
- rate limiting
- CSRF protection
- security headers
- CSP
- secure webhook verification
- malware scanning
- immutable audit
- structured logging
- PII redaction
- retention and deletion
- backup and point-in-time recovery
- tested restore
- incident-response runbook
- dependency scanning
- SAST
- container scanning
- audit exports
- health/readiness endpoints

Create:
- threat model
- data-flow diagram
- security questionnaire
- subprocessors list
- SOC 2 readiness checklist
- disaster-recovery test record

Do not claim SOC 2 certification without an audit.

## 22. Front-end quality

Preserve the calm institutional design and remove demo-specific coupling.

Refactor the large workspace component into:
- route-level screens
- bounded domain components
- server-side data loading where appropriate
- typed client APIs
- accessible tables
- reusable evidence and status primitives
- robust loading/error/empty states

Visual principles:
- serious insurance operations product
- typography and information hierarchy before decoration
- restrained colour
- dense but legible tables
- thoughtful side-by-side evidence review
- map only where it provides real value
- no glassmorphism
- no excessive pills
- no generic AI assistant
- no gradient-heavy marketing
- no fake charts
- no decorative AI sparkle

Inspect the actual application through the browser on desktop, tablet and mobile. Use screenshots and browser tooling to identify visual regressions.

## 23. CI, release and deployment

Add:
- `.github/workflows/ci.yml`
- lint
- strict type checking
- unit/integration tests
- database migration test
- production build
- Playwright
- accessibility
- generated-artifact verification
- dependency and secret scans
- tenant-isolation suite

Add:
- staging deployment
- production deployment configuration
- migration-before-release process
- rollback
- release tags
- changelog
- environment validation
- database and object-storage backup
- preview environments where safe

If GitHub authentication permits, configure branch settings safely. Do not rewrite history or change repository visibility automatically. Create `docs/GITHUB_SETTINGS_CHECKLIST.md` for settings that require owner action.

## 24. Test requirements

At minimum test:

### Domain
- requirement applicability
- evidence scope
- freshness
- contradiction
- superseding evidence
- submission versioning
- deadlines
- response taxonomies
- audit immutability

### Security
- cross-tenant access
- revoked membership
- expired review link
- object-storage authorization
- support impersonation controls
- webhook signatures
- upload quarantine

### Imports
- duplicate rows
- changed external IDs
- invalid units
- ambiguous addresses
- idempotency
- rollback
- rejected-row quarantine

### Documents
- text PDF
- scan
- rotated page
- table
- image
- conflicting extraction
- low confidence
- human correction
- source citation

### End to end
1. create brokerage
2. invite team
3. import book
4. open renewal
5. ingest notice
6. confirm fields
7. request evidence
8. external contributor uploads
9. review evidence
10. resolve blockers
11. generate submission
12. deliver secure link
13. reviewer requests clarification
14. respond
15. record quote/decline/bind outcome
16. close renewal
17. roll evidence into next cycle
18. verify audit and analytics

## 25. Commercial and operational documents

Create and maintain:
- `docs/COMMERCIAL_NORTH_STAR.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/DATA_RIGHTS_AND_MOAT.md`
- `docs/MARKET_PLAYBOOK_GOVERNANCE.md`
- `docs/SECURITY_AND_PRIVACY.md`
- `docs/THREAT_MODEL.md`
- `docs/INTEGRATIONS.md`
- `docs/DEPLOYMENT.md`
- `docs/OPERATIONS_RUNBOOK.md`
- `docs/INCIDENT_RESPONSE.md`
- `docs/BACKUP_RESTORE_REPORT.md`
- `docs/PAID_PILOT_RUNBOOK.md`
- `docs/ROI_MEASUREMENT.md`
- `docs/CUSTOMER_ONBOARDING.md`
- `docs/SECURITY_QUESTIONNAIRE.md`
- `docs/LAUNCH_READINESS.md`
- `.env.example`

## 26. Milestone order

Execute in this order unless a documented dependency requires adjustment:

1. Repository, CI and status documentation.
2. Normalized PostgreSQL migration and sandbox isolation.
3. Authentication, organizations and tenant authorization.
4. Secure object storage and evidence upload.
5. Portfolio/SOV import.
6. Production notice and document pipeline.
7. Market playbooks and deterministic readiness.
8. Renewal workflow and external evidence collection.
9. Submission generation and secure reviewer flow.
10. Response and outcome capture.
11. Portfolio analytics and moat instrumentation.
12. Email and AMS integrations.
13. Security hardening, backup/restore and deployment.
14. Design-partner acceptance harness and launch report.

Do not spend a cycle repeatedly rewriting the roadmap.

## 27. Completion criteria

Code-complete means:

- no production use of the global DemoState blob
- normalized tenant-scoped PostgreSQL persistence
- real identity and authorization
- secure object storage
- working import pipeline
- working document pipeline
- configurable playbooks
- complete live-case workflow
- external contributor and reviewer links
- real generated artifacts
- delivery and response records
- outcome analytics
- CI and deployment
- tenant-isolation and security tests
- backup restore proven
- no fake production integration
- seeded sandbox preserved separately
- no unsupported insurance claim

Externally validated means:

- at least one rights-cleared brokerage dataset has passed import
- at least ten redacted renewal cases have run through the system
- at least one external market reviewer has used the output
- pilot workflow metrics have been captured
- critical discrepancies are resolved
- customer agrees to continue on paid terms

If external data is unavailable, mark external validation as blocked rather than falsely complete. Finish all code-complete criteria and document the exact data and customer action required.
