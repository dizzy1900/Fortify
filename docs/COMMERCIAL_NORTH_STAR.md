# FORTIFY COMMERCIAL NORTH STAR
## Resilience Investment and Insurance Recognition OS

Use this as the authoritative product and implementation brief.

---

## 1. Product thesis

Fortify is the transaction, evidence and decision infrastructure connecting physical resilience investment to insurance, financing and programme recognition.

The platform turns fragmented property information into a governed chain:

1. What physical property or community is being considered?
2. Which hazard or insurer-stated risk drivers apply?
3. Which intervention profile is relevant?
4. What work is proposed?
5. Who funds it?
6. What milestone releases funding or approval?
7. What evidence proves the work occurred?
8. Who independently verified it?
9. Which external model or market input may the change affect?
10. Which insurer, MGA, lender or programme committed to recognise it?
11. What submission was made?
12. What actual decision followed?
13. What maintenance is required?
14. What performance or claims evidence emerges later?

The initial customer-facing wedge remains a specialist broker’s catastrophe-property renewal and appeal workflow. The broader infrastructure must emerge through real use of that workflow rather than replacing it with a broad policy or marketplace concept.

### Initial one-sentence proposition

> Fortify helps brokers and property operators turn verified wildfire-resilience investments into complete, market-specific insurance submissions—and preserves what each insurer recognised for the next renewal.

### Long-term proposition

> Fortify is the system of record for how physical resilience investments become recognised financial and insurance outcomes.

---

## 2. Initial market and customer

### Initial geography

California is the initial production jurisdiction.

Preserve the existing Colorado synthetic workflow as:

- an isolated sandbox
- a regression fixture
- a second-jurisdiction architecture test

Do not let Colorado-specific assumptions remain embedded in production logic.

### Initial property segment

Prioritise:

- homeowners associations
- condominiums
- townhome communities
- low-rise multifamily
- community-association master policies
- related habitational portfolios where the same property/evidence model applies

This segment is attractive because evidence and interventions can exist at:

- community level
- parcel level
- building level
- unit-summary level
- shared-landscape level

### Initial economic buyer

A specialist insurance brokerage or property-risk practice with:

- at least 50–100 relevant renewals annually
- California wildfire exposure
- admitted, surplus-lines, MGA or FAIR Plan workflows
- fragmented evidence across its AMS, email, shared drives, boards, property managers and contractors
- recurring underwriter clarification loops
- a willingness to contribute redacted historical or live cases

### Primary users

- practice leader
- head of placement
- account executive
- marketer
- renewal specialist
- technical assistant

### External collaborators

- property manager
- HOA or condominium board representative
- contractor
- mitigation professional
- inspector
- independent verifier
- programme administrator
- insurer or MGA reviewer
- lender or funder reviewer
- read-only auditor

---

## 3. Product boundaries

Fortify is not:

- a wildfire catastrophe model
- a proprietary risk score
- an insurer or MGA
- an insurance rating engine
- an inspection authority
- an official designation body
- a contractor marketplace
- a construction-management suite
- a grant fund
- a lender
- a generic insurance-quoting platform
- a substitute for legal, actuarial, engineering or underwriting judgement

Never:

- claim that an intervention guarantees insurance
- claim that evidence guarantees a discount
- imply that a complete case is safe or insurable
- treat an external model result as ground truth without provenance
- conflate modelled loss reduction with filed rate treatment
- conflate filed rate treatment with underwriting eligibility
- conflate underwriting recognition with observed loss reduction
- let an LLM certify work, release funding, change a model input or make an insurance decision
- automatically send a market submission without human confirmation
- train or benchmark across tenants without explicit contractual rights
- fabricate a carrier, programme, model or funding integration

Fortify may:

- ingest external risk scores and model results
- store model name, version and assumptions
- map verified evidence to candidate model inputs
- track whether an insurer accepted that mapping
- configure market-specific evidence requirements
- calculate deterministic evidence readiness
- administer funding and verification workflows
- prepare human-reviewed submissions
- record actual financial and insurance responses
- aggregate de-identified derived outcomes only under approved data-rights controls

---

## 4. Preserve and isolate the existing product

Preserve as regression assets:

- the current guided renewal workflow
- evidence provenance and hashing
- notice confirmation
- requirement crosswalk
- task assignment
- contradiction resolution
- PDF and ZIP generation
- editable submission letter
- underwriter clarification loop
- outcome capture
- maintenance and year-over-year reuse
- deterministic seed/reset
- current automated tests
- current institutional visual design
- current no-overclaim language

Move all demo-specific behaviour into an explicit sandbox:

- sandbox organization
- sandbox users
- sandbox data
- sandbox routes or mode
- synthetic-data banner
- deterministic reset
- no interaction with production customer data
- no global current role
- no global current case
- no shared application-state JSON record

Production users must never see synthetic content unless they intentionally enter the sandbox.

---

## 5. Production architecture

### 5.1 Preserve the lean stack

Prefer:

- Next.js App Router
- strict TypeScript
- PostgreSQL
- Drizzle ORM unless a measured technical issue justifies changing it
- PostGIS where geometry is material
- private S3-compatible object storage
- OIDC-compatible identity
- one durable PostgreSQL-backed worker/job system
- MapLibre for geospatial views
- provider interfaces for external services
- Docker-compatible deployment
- serverless or scale-to-zero compute where practical

Avoid:

- unnecessary microservices
- Kubernetes
- persistent idle workers where a scale-to-zero job runner works
- permanent GPU infrastructure
- Redis unless a measured requirement exists
- duplicated business logic across client and server
- vendor-specific coupling in domain logic

### 5.2 Replace the DemoState model

Remove production reliance on:

- one serialized application-state object
- one global role
- one global case
- in-memory current-user assumptions
- mutation of nested JSON as the primary transaction model

Use normalized tables and tenant-scoped repositories.

Every customer-controlled record must include where relevant:

- `organization_id`
- stable identifier
- version or revision
- created timestamp
- created actor
- updated timestamp
- updated actor
- source
- effective period
- retention state
- deletion state
- confidentiality state

Implement:

- database constraints
- foreign keys
- transactional writes
- optimistic concurrency or explicit locking
- idempotency
- migrations
- normalized seed migration
- test factories
- tenant-scoped query helpers
- row-level security as defence in depth where practical
- append-only audit events written within the same transaction as consequential changes

---

## 6. Identity, tenancy and permissions

Model:

- Identity
- Organization
- OrganizationMembership
- Team
- Client
- PropertyPortfolio
- ExternalCollaborator
- ExternalReviewer
- ServiceAccount
- APICredential
- SupportAccessSession

Minimum roles:

- organization owner
- brokerage administrator
- practice leader
- broker/account executive
- marketer
- technical assistant
- property-operator administrator
- property manager
- board contributor
- contractor/evidence contributor
- independent verifier
- programme administrator
- insurer/MGA reviewer
- lender/funder reviewer
- read-only auditor
- Fortify support administrator with controlled access

Requirements:

- server-side authorization on every mutation and sensitive query
- deny by default
- tenant isolation
- case and portfolio assignment
- invitations
- revocation
- session expiration
- MFA-ready provider
- scoped external links
- review-link expiration and revocation
- support-access justification and audit
- no production role switching
- no exposure of unrelated property, evidence, financial or insurer data

Create automated cross-tenant attack tests for every major resource.

---

## 7. Core domain model

Expand the existing schema around the following bounded contexts.

### 7.1 Organizations and portfolios

- Organization
- Membership
- Team
- Client
- PropertyPortfolio
- IntegrationConnection
- DataImport
- ImportMapping
- ImportReceipt

### 7.2 Property graph

- Community
- Property
- Parcel
- Building
- UnitSummary
- Address
- Location
- PropertyIdentifier
- PropertyAlias
- PropertyRelationship
- PropertyVersion

The graph must represent whether an item applies to:

- entire community
- parcel
- building
- selected building group
- unit summary
- landscape zone
- access route
- shared infrastructure

### 7.3 Insurance

- Insured
- Policy
- Coverage
- Renewal
- RenewalCase
- AppealCase
- Carrier
- MGA
- Programme
- Market
- SubmissionDestination
- UnderwritingNotice
- InsuranceDecision

### 7.4 Hazard and model context

- Hazard
- Peril
- RiskSource
- RiskAssessment
- RiskDriver
- ExternalModel
- ExternalModelVersion
- ModelInputDefinition
- ModelInputMapping
- ModelOutput
- ModelAcceptanceEvent

Fortify never generates the authoritative risk score. Store external results with complete provenance.

### 7.5 Target resilience profiles

- TargetResiliencePerformanceProfile
- ProfileVersion
- ProfileApplicability
- ProfileRequirement
- MinimumCharacteristic
- PreferredCharacteristic
- PerformanceMetric
- EvidenceRequirement
- MaintenanceRequirement
- RecognitionCommitment

### 7.6 Interventions and projects

- InterventionSpecification
- InterventionVersion
- InterventionMechanism
- InterventionApplicability
- ResilienceProject
- ProjectIntervention
- BaselineCondition
- WorkScope
- Contractor
- ProjectMilestone
- ProjectCost
- ProjectDependency
- ProjectStatus
- CapitalPlan

### 7.7 Funding and commitments

- FundingProgramme
- FundingProgrammeVersion
- FundingEligibilityRule
- FundingApplication
- FundingCommitment
- OwnerContribution
- GrantContribution
- FinancingContribution
- InsurerContribution
- ReinsurerContribution
- MilestonePayment
- PaymentApproval
- DisbursementExport

Do not initially move funds. Fortify records, approves and exports payment instructions or integration events.

### 7.8 Evidence and verification

- EvidenceItem
- EvidenceVersion
- EvidenceScope
- EvidenceProvenance
- EvidenceReview
- EvidenceRequirementLink
- Contradiction
- Supersession
- VerificationOrganisation
- Verifier
- VerifierCredential
- VerificationAssignment
- VerificationMethod
- VerificationFinding
- VerificationCertificate
- VerificationException
- VerificationExpiry

### 7.9 Market recognition

- MarketPlaybook
- MarketPlaybookVersion
- MarketRequirement
- MarketCommitment
- RecognitionCase
- RecognitionSubmission
- SubmissionVersion
- SubmissionItem
- Delivery
- DeliveryReceipt
- ReviewerSession
- ReviewerRequest
- MarketResponse
- EvidenceAcceptanceEvent
- ModelInputAcceptance
- RatingTreatment
- UnderwritingTreatment
- Quote
- Declination
- Bind
- RenewalOutcome

### 7.10 Maintenance and longitudinal outcomes

- MaintenanceObligation
- MaintenanceEvent
- Recertification
- EvidenceRefresh
- PropertyConditionEvent
- HazardEvent
- ClaimReference
- ObservedPerformance
- OutcomeCorrection

### 7.11 Governance

- Consent
- DataRight
- RetentionPolicy
- LegalHold
- AuditEvent
- ExportReceipt
- DeletionRequest
- DataAccessLog

---

## 8. Evidence hierarchy

Fortify must distinguish between fundamentally different forms of evidence.

Create a typed `EvidenceLevel` or equivalent classification:

1. `physical_specification`
   - Work meets a stated technical or engineering specification.

2. `verified_installation`
   - An accountable verifier confirms installation or condition.

3. `modelled_vulnerability_reduction`
   - An external model estimates reduced vulnerability or ignition probability.

4. `modelled_expected_loss_reduction`
   - An external catastrophe or actuarial model estimates lower expected loss.

5. `filed_rating_treatment`
   - A carrier’s approved rating plan contains an applicable treatment.

6. `underwriting_treatment`
   - A carrier changes classification, eligibility, terms, capacity or review status.

7. `financing_or_programme_treatment`
   - A lender, grant programme or funder changes a decision.

8. `observed_event_performance`
   - Actual physical performance is observed during a hazard event.

9. `claims_evidence`
   - Claims or loss outcomes are available for a suitable cohort.

The UI, APIs and reports must never collapse these levels into one “proven resilience” claim.

Every benefit or impact claim must include:

- evidence level
- source
- version
- methodology
- date
- applicable property/intervention
- uncertainty
- reviewer
- whether independently verified

---

## 9. California policy and programme register

Create a production policy-source system, not hard-coded legal copy.

Initial source classes should accommodate:

- California insurance regulations
- California statutes
- California Department of Insurance guidance
- CAL FIRE standards or programme materials
- FAIR Plan rules and forms
- insurer rate-plan or mitigation documentation
- insurer underwriting evidence requests
- recognised third-party resilience standards
- grant or funding programme rules
- county or local fire-authority requirements

Use only primary or officially authorised sources when building default reference content.

For every source store:

- issuing authority
- title
- source URL
- source bytes or approved snapshot where permitted
- version
- effective date
- retrieval date
- status
- superseding source
- copyright or use restriction
- short structured summary
- review owner
- verify-current status

Do not reproduce proprietary standards wholesale.

Create:

- `docs/CALIFORNIA_POLICY_REGISTER.md`
- admin workflow to publish source versions
- notification when a relied-on source changes
- impact analysis identifying affected profiles, playbooks, cases and reports

No legal or insurer rule becomes operative solely because it was extracted by a model.

---

## 10. Target Resilience Performance Profiles

Implement a versioned registry that defines the desired performance and evidence requirements without prescribing one vendor.

A profile includes:

- hazard
- geography
- property class
- target population
- baseline eligibility
- minimum characteristics
- preferred characteristics
- performance conditions
- permitted intervention classes
- safety requirements
- evidence requirements
- verifier requirements
- cost or affordability constraints
- deployment-time constraints
- maintenance requirements
- model-interoperability requirements
- insurer-recognition commitments
- funding commitments
- equity or grant compatibility
- expiry
- version

Support profiles for:

- individual buildings
- multi-building communities
- shared landscape
- community-wide programmes

Create profile states:

- draft
- technical review
- insurer review
- programme review
- published
- superseded
- withdrawn

A published profile must identify:

- who authored it
- who reviewed it
- who recognises it
- the exact nature of each recognition commitment
- what it does not guarantee

---

## 11. Intervention specification registry

Create reusable intervention specifications for established and future resilience measures.

Each intervention includes:

- stable concept ID
- version
- name
- hazard mechanism
- applicable property types
- applicable building components
- technical requirements
- approved evidence types
- verifier qualifications
- estimated useful life
- maintenance schedule
- project dependencies
- health and safety constraints
- source standards
- cost fields
- model-input candidates
- evidence level
- uncertainty
- insurer and programme recognition history

Do not encode generic claims such as “reduces losses by 80%.”

Store any effectiveness claim as a versioned source-backed range with its evidence level.

---

## 12. Resilience capital planning

Build a property- and community-level capital-planning workflow.

The user should be able to:

1. Import or create the property portfolio.
2. Record the baseline physical condition.
3. Add external risk drivers.
4. Select an applicable target profile.
5. Identify gaps.
6. Create candidate interventions.
7. estimate costs and timelines.
8. identify dependencies.
9. identify available funding programmes.
10. compare funding stacks.
11. assign projects.
12. track milestones.
13. collect evidence.
14. commission verification.
15. submit the completed package for recognition.

The capital plan must display separately:

- physical rationale
- technical standard
- cost
- funding eligibility
- expected maintenance
- modelled benefit, when available
- potential rating treatment, when applicable
- potential underwriting relevance
- unverified assumptions
- actual outcome once known

Do not use one opaque ROI score.

Provide transparent scenario comparison and allow “insufficient evidence” or “no financially attractive pathway” as valid results.

---

## 13. Stakeholder benefit ledger

Create a ledger that makes fragmented benefits explicit.

Potential stakeholders:

- property owner
- HOA or condominium association
- resident or tenant
- insurer
- reinsurer
- lender
- local government
- state programme
- utility or infrastructure operator
- philanthropic funder
- neighbouring community

Record:

- stakeholder
- expected benefit category
- expected cost
- funding contribution
- source and evidence level
- timeframe
- uncertainty
- commitment
- realised financial or operational response
- corrections

Never assume that:

- premium savings equal total resilience value
- all parties benefit
- a positive aggregate benefit is a strict Pareto improvement
- modelled public benefit will be paid to the property owner

Use the ledger to explain why a blended funding stack may be required.

---

## 14. Funding and milestone workflow

Support programmes funded by:

- public grant
- insurer
- reinsurer
- lender
- property owner
- philanthropic or impact fund
- local government
- mixed capital stack

A programme must be configurable around:

- geography
- property class
- hazard
- target profile
- eligible interventions
- income or affordability rules
- maximum award
- cost share
- application window
- evidence requirements
- review process
- milestones
- payment conditions
- maintenance obligations
- reporting requirements

Milestones may include:

- baseline assessment complete
- profile selected
- work plan approved
- permit or technical review complete
- installation complete
- verification passed
- certificate issued
- market submission delivered
- insurance response recorded
- maintenance revalidated

Require explicit human approval for any payment or disbursement export.

Implement an integration boundary for future payment systems; do not hold customer funds in the MVP.

---

## 15. Verification operating system

Build a neutral independent-verification workflow.

Support:

- verifier organization
- credential
- credential version and expiry
- conflict-of-interest declaration
- assignment
- inspection method
- desktop review
- site visit
- photographic evidence
- geolocation
- timestamp
- measurement
- exceptions
- corrective action
- reinspection
- certificate
- expiry
- revocation

Every verification conclusion must trace to:

- profile
- intervention specification
- evidence
- verifier
- method
- date
- exception
- human signature or approval

Fortify manages the workflow and provenance. It does not claim that Fortify itself performed the substantive inspection unless the business deliberately develops and licenses that capability later.

---

## 16. External model mapping

Implement a model-neutral mapping layer.

For each external model store:

- provider
- model name
- version
- geography
- supported property classes
- input definitions
- output definitions
- effective period
- source documentation
- limitations
- usage rights

A `ModelInputMapping` includes:

- property
- intervention
- evidence
- verifier
- model/version
- candidate input variable
- pre-intervention value
- proposed post-intervention value
- transformation method
- confidence
- source
- reviewer
- market acceptance status
- accepted value, if different
- reason for rejection or modification

The system may propose a mapping but may not claim that the insurer or model provider accepted it.

Create clear states:

- proposed
- internally reviewed
- submitted
- accepted by model/market
- accepted with modification
- rejected
- unsupported
- expired

Do not build an internal catastrophe model in this Goal.

---

## 17. Market commitments and recognition agreements

Create a registry for explicit commitments from:

- insurer
- MGA
- reinsurer
- lender
- public programme
- philanthropic funder
- property operator

Commitment types may include:

- evidence-review commitment
- response service level
- approved rating treatment
- underwriting reconsideration
- quote review
- capacity allocation
- grant payment
- milestone payment
- financing product
- reinsurance portfolio review
- data-sharing commitment

Every commitment must include:

- committing organization
- applicable profile
- applicable geography
- applicable property class
- effective period
- evidence required
- exclusions
- response or financial action
- legal/contract source
- status
- limitations

Do not translate “will review” into “will insure.”

---

## 18. Market playbooks and recognition cases

Extend the existing requirements crosswalk into market-specific recognition playbooks.

A playbook is scoped by:

- carrier/MGA/programme
- policy/product
- jurisdiction
- hazard
- property class
- target profile
- effective period

It can express:

- required evidence
- blocking evidence
- recommended evidence
- accepted source types
- acceptable verifier types
- freshness
- scope
- model mapping
- rate-treatment prerequisites
- underwriting-review prerequisites
- deadlines
- submission templates
- delivery method
- appeal or reconsideration process

Use deterministic bounded applicability rules.

Preserve:

- source
- version
- author
- reviewer
- effective period
- prior version
- change diff
- observed historical responses

---

## 19. Evidence readiness

Replace the fixed universal weighted readiness formula.

Calculate deterministic states for:

- profile completeness
- intervention implementation
- evidence completeness
- evidence freshness
- evidence scope
- verifier status
- unresolved contradiction
- model-mapping status
- funding milestone status
- market-specific submission readiness
- maintenance validity

Use:

- required
- recommended
- conditional
- blocking
- not applicable
- pending review
- satisfied
- expired
- contradictory
- unsupported

An optional summary indicator may exist, but it must:

- expose its method
- never hide blockers
- be destination-specific where relevant
- be called evidence, project or submission readiness
- never imply insurance eligibility, risk reduction or compliance

---

## 20. Production broker workflow

Implement the complete broker journey:

1. Create or import property portfolio.
2. Import policies, renewals and notices.
3. Identify cases requiring attention.
4. Review external insurer/model risk drivers.
5. select applicable target profile.
6. assess existing evidence.
7. create intervention and capital plan.
8. invite property manager or board.
9. track funding and project milestones.
10. collect implementation evidence.
11. assign independent verification.
12. map verified changes to market requirements and model inputs.
13. generate a market-specific recognition submission.
14. confirm destination and contents.
15. deliver through email or secure review link.
16. receive clarification or evidence disposition.
17. record rating, underwriting, quote, bind or no-change outcome.
18. close the renewal.
19. roll valid evidence and maintenance obligations into the next cycle.

Support portfolio-level bulk operations for multiple communities.

---

## 21. External contributor experiences

### Property manager or board

Provide:

- branded secure request
- case-specific requested actions
- exact property/building scope
- due dates
- upload guidance
- project progress
- funding status where authorised
- clarification
- maintenance calendar
- lightweight account or secure no-account link

### Contractor

Provide:

- assigned work scope
- intervention specification
- required completion evidence
- upload
- invoice and building schedule
- certifications
- exception reporting
- no access to insurance strategy or unrelated data

### Verifier

Provide:

- assignment
- profile and intervention requirements
- source evidence
- review tools
- finding
- exception
- certificate
- signature or approval
- conflict declaration

### Insurer or MGA reviewer

Provide:

- expiring secure review session
- submission summary
- evidence index
- verifier information
- model mapping
- profile
- unresolved caveats
- accept/request clarification/reject actions
- structured reason taxonomy
- comment
- download control
- review receipt
- no access to unrelated records

### Funder or programme reviewer

Provide:

- eligibility summary
- milestone evidence
- verifier output
- payment recommendation
- human approval
- export receipt
- no insurance decision authority

---

## 22. Submission generation

Preserve the existing deterministic PDF/ZIP capability and expand it.

Generate:

- recognition case cover
- property and portfolio summary
- policy and market context
- external risk-driver summary
- applicable target profile
- intervention register
- funding and project milestone summary
- verification register
- model-input mapping
- requirement-to-evidence matrix
- evidence index
- caveats
- requested insurer action
- maintenance plan
- source and version register
- hashes and provenance
- exhibits
- editable accompanying letter
- machine-readable manifest

A submission must:

- be versioned
- preserve exact submitted bytes
- have a content hash
- record destination
- record delivery
- require human confirmation
- never be destructively overwritten

---

## 23. Outcome taxonomy

Do not use one generic “accepted” result.

Model separately:

### Evidence response

- accepted
- partially accepted
- clarification required
- rejected
- stale
- wrong scope
- unsupported source
- unverifiable
- not applicable

### Model response

- input accepted
- input modified
- mapping rejected
- model does not represent intervention
- model version changed
- no response

### Rating response

- filed discount applied
- factor changed
- discount not applicable
- filing does not recognise intervention
- insufficient evidence
- unknown

### Underwriting response

- classification changed
- reconsideration opened
- terms changed
- capacity offered
- referred
- no change
- declined
- nonrenewed
- quote review initiated

### Placement response

- quote
- revised quote
- bind
- renewal
- no quote
- withdrawn
- FAIR Plan transition
- voluntary-market transition
- lost to another option

### Funding response

- approved
- conditionally approved
- milestone approved
- milestone rejected
- disbursement exported
- programme ineligible

### Longitudinal outcome

- maintenance current
- maintenance expired
- hazard event observed
- physical performance recorded
- claim recorded
- loss severity data available
- outcome corrected

Preserve original correspondence alongside normalized categories.

---

## 24. Recognition graph and moat

Instrument the product so every important event can form a governed relationship among:

- property and property class
- hazard and risk driver
- external model and version
- target profile and version
- intervention and version
- funding programme
- project cost
- verifier and method
- evidence type
- evidence source
- evidence scope
- evidence freshness
- model-input mapping
- market playbook
- submission
- evidence response
- model response
- rating response
- underwriting response
- placement result
- maintenance status
- observed event or claim

Build tenant-specific analytics first.

Potential customer-facing findings include:

- recurring missing evidence
- evidence repeatedly returned for scope clarification
- markets that recognise particular evidence categories
- interventions whose evidence is accepted but whose model mapping is unsupported
- average time from completed work to insurer response
- properties whose maintenance is about to invalidate recognition
- funding programmes producing the highest completion rate
- voluntary-market transitions
- submission reuse across renewals

Do not build predictive acceptance or premium models until:

- sufficient rights-cleared data exists
- bias and calibration are evaluated
- users can understand the method
- legal and regulatory review is complete

---

## 25. Data rights

Create:

- `docs/DATA_RIGHTS_AND_MOAT.md`
- tenant-level configuration
- contract-ready data-right classifications

Distinguish:

- raw customer documents
- personally identifiable information
- property-specific data
- carrier-confidential material
- customer-specific playbooks
- Fortify’s generic ontology
- software telemetry
- de-identified derived events
- cross-customer benchmarks
- model-provider restricted data

Default:

- raw data remains tenant-controlled
- no cross-customer training or analytics
- no carrier-identifiable benchmarks without permission
- no external model redistribution beyond rights
- no use of programme data beyond contract

Cross-customer analytics require:

- explicit opt-in
- contractual permission
- minimum cohort size
- de-identification
- suppression
- access control
- audit
- opt-out and deletion treatment

---

## 26. Imports and integrations

### Initial production imports

Support:

- CSV
- XLSX
- statement of values
- policy schedule
- building schedule
- property-manager export
- claims or loss-run export where permitted
- evidence archive
- GeoJSON

Implement:

- mapping UI
- saved mappings
- stable external IDs
- unit validation
- address reconciliation
- duplicate detection
- dry run
- quarantine
- idempotent rerun
- rollback
- import receipt

### Initial integrations

Prioritise:

1. secure direct upload
2. Microsoft Graph email intake
3. generic Gmail provider boundary
4. S3-compatible object storage
5. generic AMS CSV boundary
6. Applied Epic-compatible import/export from customer-provided schemas
7. AMS360-compatible boundary
8. property-management data boundary
9. external risk/model provider boundary
10. verifier API/export boundary

Never screen-scrape systems or invent undocumented APIs.

---

## 27. Document intelligence

Create a durable asynchronous pipeline:

1. ingest original bytes
2. hash
3. MIME and signature validation
4. malware scan
5. quarantine if required
6. OCR or text extraction
7. classify document
8. extract candidate fields, tables and evidence
9. preserve page/region citations
10. calculate confidence
11. route human review
12. create confirmed records
13. retain original and corrected versions

Support:

- carrier notices
- policy documents
- loss runs
- SOVs
- contractor invoices
- inspection reports
- photographs
- certificates
- grant forms
- correspondence
- model reports
- spreadsheets

Use provider interfaces.

Tests and development may use deterministic fixtures. Production must label provider availability and processing status honestly.

No LLM output is authoritative without confirmation.

---

## 28. Programme administration

Create a sponsor-facing programme console for:

- target profile
- geography
- cohort
- applicants
- eligibility
- property baseline
- interventions
- funding commitments
- milestones
- verification
- payment approvals
- market submissions
- insurance responses
- maintenance
- portfolio outcomes
- reporting

Programme metrics may include:

- applicants
- qualified properties
- projects started
- projects completed
- cost per property
- public contribution
- owner contribution
- verification turnaround
- market-review turnaround
- evidence acceptance
- insurer decision categories
- voluntary-market quotes
- maintenance compliance

Do not claim caused loss reduction without a valid evaluation design.

---

## 29. Analytics and ROI measurement

Measure separately:

### Brokerage workflow

- time from case opening to reviewable submission
- evidence requests
- missing items
- clarification loops
- manual touches
- external-contributor completion
- submission versions
- evidence reuse
- time to insurer response
- active users
- off-platform reconstruction

### Property programme

- intervention completion
- funding leverage
- verification pass rate
- cost variance
- maintenance
- market response

### Insurance recognition

- evidence accepted
- model mapping accepted
- filed treatment applied
- underwriting reconsideration
- quote
- bind
- renewal
- no change
- reason

### Longitudinal performance

- hazard exposure
- observed physical performance
- claims events
- loss severity where rights permit

Do not attribute premium or claims changes to Fortify without a defensible methodology.

---

## 30. Visual and interaction quality

The product should feel like:

- a premium insurance operations system
- an architectural evidence platform
- a serious capital-planning product
- a trusted public-programme administration system

Preserve:

- calm light theme
- excellent typography
- restrained colour
- dense but legible information
- clear status semantics
- map and spatial context where useful
- print-quality generated documents

Avoid:

- gradient-heavy pages
- glassmorphism
- excessive rounded cards
- excessive status pills
- generic AI assistant panels
- chatbot-first workflow
- decorative charts
- fake geospatial intelligence
- animated “AI magic”
- stock wildfire imagery
- unsupported impact claims
- generic template styling

Important product views should include:

- portfolio triage
- property/community record
- intervention capital plan
- profile crosswalk
- funding stack
- project milestones
- evidence and provenance
- verification workbench
- model mapping
- market-recognition case
- reviewer view
- programme dashboard
- maintenance
- outcomes and analytics

Inspect the real browser application throughout implementation.

Use desktop, tablet and mobile viewports.

Add visual-regression tests and accessibility checks.

---

## 31. Security, privacy and reliability

Implement:

- encryption in transit
- encrypted database and object storage
- least privilege
- MFA-ready OIDC
- tenant isolation
- RLS defence in depth
- signed upload and download URLs
- secure webhook verification
- rate limiting
- CSRF protection
- content-security policy
- secure headers
- malware scanning
- audit logs
- support-access controls
- secrets management
- log redaction
- retention
- deletion
- legal hold
- backup
- point-in-time recovery
- restore exercise
- incident response
- dependency scanning
- SAST
- container scanning
- vulnerability reporting
- health and readiness checks

Create:

- `docs/THREAT_MODEL.md`
- `docs/SECURITY_AND_PRIVACY.md`
- `docs/DATA_FLOW.md`
- `docs/INCIDENT_RESPONSE.md`
- `docs/BACKUP_RESTORE_REPORT.md`
- `docs/SECURITY_QUESTIONNAIRE.md`
- `docs/SUBPROCESSORS.md`

Do not claim SOC 2 or any other certification without an actual audit.

---

## 32. CI, release and deployment

Add GitHub Actions for:

- formatting
- lint
- strict TypeScript
- unit tests
- integration tests
- migration tests
- tenant-isolation tests
- generated-artifact verification
- Playwright
- accessibility
- visual regression
- secret scanning
- dependency scanning
- production build
- container build
- prohibited-claims scan

Add:

- staging configuration
- production configuration
- migration-before-release
- rollback
- release tags
- changelog
- environment validation
- backup schedule
- restore test
- observability
- job monitoring

Do not automatically change repository visibility, rewrite Git history or publish customer data.

Create `docs/GITHUB_SETTINGS_CHECKLIST.md` for owner-controlled settings.

---

## 33. Required end-to-end production flow

Automate and validate this complete flow:

1. Create a brokerage organization.
2. Invite users with distinct roles.
3. Import a California property portfolio.
4. Create a wildfire recognition case.
5. Import a policy and insurer notice.
6. Confirm extracted fields.
7. record external risk drivers.
8. select an applicable target profile.
9. assess baseline gaps.
10. create an intervention capital plan.
11. identify and apply a funding programme.
12. approve a funding commitment.
13. assign work and milestones.
14. invite property manager and contractor.
15. collect completion evidence.
16. assign an independent verifier.
17. record verification findings and exceptions.
18. create model-input mappings.
19. crosswalk evidence against one market playbook.
20. resolve blocking items.
21. generate a versioned recognition submission.
22. confirm and deliver it.
23. open an expiring insurer-review session.
24. request clarification.
25. respond with additional evidence.
26. record evidence acceptance.
27. record model, rating and underwriting treatment separately.
28. record quote, bind, no-change or decline outcome.
29. close the case.
30. create maintenance obligations.
31. roll valid evidence into the next renewal.
32. verify audit, permissions and recognition-graph events.
33. generate a brokerage ROI report and programme outcome report.

This flow must run using production architecture with development fixtures—not the legacy global demo state.

---

## 34. Test requirements

### Tenant and authorization

- cross-tenant property access denied
- cross-tenant evidence access denied
- revoked membership
- expired external link
- verifier cannot change insurer response
- insurer reviewer cannot change evidence
- contractor cannot view insurance strategy
- programme reviewer cannot bind insurance
- support access requires recorded reason

### Profiles and intervention projects

- applicability
- versioning
- supersession
- minimum/preferred characteristics
- intervention dependencies
- invalid profile
- unsupported property
- maintenance expiry

### Funding

- eligibility
- cost-share limit
- milestone dependency
- duplicate funding
- human approval
- disbursement export
- cancellation
- correction

### Evidence and verification

- source hashing
- scope
- supersession
- stale evidence
- conflicting evidence
- credential expiry
- failed verification
- corrective action
- certificate revocation

### Model mapping

- model version
- unsupported variable
- proposed versus accepted value
- rejected mapping
- expired mapping
- no automatic acceptance

### Market recognition

- playbook applicability
- blocking requirement
- market version
- submission confirmation
- immutable submitted bytes
- response taxonomy
- clarification loop
- correction history

### Claims and language

Scan UI, APIs, generated files and marketing copy for prohibited claims such as:

- guaranteed insurance
- guaranteed discount
- certified by Fortify
- Fortify risk score
- guaranteed loss reduction
- officially approved unless actually true

### Reliability

- job idempotency
- upload retry
- delivery retry
- provider outage
- partial document processing
- database migration
- backup restore
- deterministic report regeneration

---

## 35. Repository documentation

Create and maintain:

- `docs/COMMERCIAL_NORTH_STAR.md`
- `docs/NORTH_STAR_IMPLEMENTATION_PLAN.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/CALIFORNIA_POLICY_REGISTER.md`
- `docs/TARGET_RESILIENCE_PROFILE_SPEC.md`
- `docs/INTERVENTION_REGISTRY.md`
- `docs/EVIDENCE_HIERARCHY.md`
- `docs/MODEL_MAPPING_SPEC.md`
- `docs/MARKET_COMMITMENT_SPEC.md`
- `docs/RECOGNITION_GRAPH.md`
- `docs/DATA_RIGHTS_AND_MOAT.md`
- `docs/FUNDING_AND_MILESTONES.md`
- `docs/VERIFICATION_GOVERNANCE.md`
- `docs/MARKET_PLAYBOOK_GOVERNANCE.md`
- `docs/INTEGRATIONS.md`
- `docs/SECURITY_AND_PRIVACY.md`
- `docs/THREAT_MODEL.md`
- `docs/DATA_FLOW.md`
- `docs/DEPLOYMENT.md`
- `docs/OPERATIONS_RUNBOOK.md`
- `docs/INCIDENT_RESPONSE.md`
- `docs/BACKUP_RESTORE_REPORT.md`
- `docs/PAID_PILOT_RUNBOOK.md`
- `docs/ROI_MEASUREMENT.md`
- `docs/EXTERNAL_VALIDATION_GATES.md`
- `docs/LAUNCH_READINESS.md`
- `docs/GITHUB_SETTINGS_CHECKLIST.md`
- `.env.example`

`docs/IMPLEMENTATION_STATUS.md` must clearly separate:

- not started
- in progress
- code complete
- locally validated
- deployment validated
- externally blocked
- customer validated
- market validated

---

## 36. Milestone order

Execute in this order unless a documented technical dependency requires adjustment.

### Milestone 0 — repository and release foundation

- update product doctrine
- implementation status
- GitHub Actions
- dependency and secret scans
- current regression baseline

### Milestone 1 — production data plane

- normalized PostgreSQL
- migrations
- tenant scope
- sandbox isolation
- production repositories
- audit

### Milestone 2 — identity and secure evidence

- OIDC
- roles
- authorization
- private object storage
- upload pipeline
- malware quarantine

### Milestone 3 — live brokerage wedge

- portfolio import
- property graph
- policy and renewal
- notice intake
- case workflow
- current packet generation on production architecture

### Milestone 4 — California source and playbook system

- versioned policy register
- market playbooks
- deterministic applicability
- destination-specific readiness

### Milestone 5 — profiles and interventions

- target-profile registry
- intervention registry
- baseline condition
- resilience capital plan

### Milestone 6 — funding and project execution

- funding programmes
- blended capital stack
- milestones
- external contributors
- approvals

### Milestone 7 — verification

- verifier identity
- credentials
- assignments
- findings
- exceptions
- certificates
- maintenance

### Milestone 8 — model mapping and market commitments

- external models
- model inputs
- mapping workflow
- commitment registry
- evidence hierarchy

### Milestone 9 — recognition submission and outcomes

- submission
- secure reviewer
- clarification
- acceptance events
- rating, underwriting and placement outcomes

### Milestone 10 — programme administration and analytics

- sponsor portal
- cohort workflow
- benefit ledger
- recognition graph
- ROI and outcome reports

### Milestone 11 — production integrations

- email
- AMS imports
- property systems
- model-provider adapters
- verifier adapters

### Milestone 12 — operational hardening

- staging
- production
- observability
- backup/restore
- performance
- accessibility
- security review
- launch validation

Do not spend subsequent cycles repeatedly revising this roadmap instead of implementing it.

---

## 37. Definition of code-complete

Code-complete requires:

- no production use of the global DemoState JSON blob
- isolated synthetic sandbox
- normalized tenant-scoped PostgreSQL
- production authentication and authorization
- secure object storage
- portfolio import
- live renewal case workflow
- versioned California source register
- configurable market playbooks
- target-profile registry
- intervention registry
- resilience capital plan
- funding and milestone workflow
- independent-verification workflow
- evidence hierarchy
- external-model mapping
- market-commitment registry
- versioned recognition submission
- secure external reviewer
- normalized evidence, model, rating, underwriting and placement outcomes
- maintenance
- programme administration
- recognition-graph instrumentation
- customer ROI reporting
- CI and deployment
- tenant-isolation tests
- backup and restore
- no fabricated integrations
- no unsupported insurance or resilience claims

---

## 38. Definition of external validation

Do not mark the product externally validated until:

- one real brokerage has been onboarded
- one rights-cleared California property portfolio has been imported
- at least ten redacted or live cases have run through the workflow
- at least one target profile has been reviewed by an appropriate technical stakeholder
- at least one independent verifier has used the verification workflow
- at least one insurer or MGA reviewer has received or reviewed the structured submission
- actual responses have been recorded
- pilot workflow metrics have been captured
- the customer has indicated willingness to continue on paid terms

Additional programme validation requires:

- a real programme sponsor
- a real funding rule
- at least one verified milestone
- a real approval or payment-export decision

Additional moat validation requires:

- contractual rights to retain the relevant derived event data
- enough outcomes to produce a useful finding
- no privacy or confidentiality breach

When an external dependency is missing, record:

- exact blocker
- responsible external party
- required artefact or credential
- production adapter already implemented
- fixture used
- acceptance test
- next executable action

Never report an external gate as complete merely because the code path exists.
