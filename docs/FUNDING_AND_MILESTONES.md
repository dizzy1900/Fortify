# Funding and milestone governance

## Boundary

Fortify records versioned programme rules, deterministic candidate eligibility, prepared applications, capital sources, commitments, project milestones, human payment recommendations, and instruction exports. It does not award grants, lend, hold customer funds, execute transfers, settle payments, or represent that an external sponsor paid.

An `eligible` assessment means only that the recorded facts matched one exact human-published programme version. It is not an award, reimbursement promise, insurance outcome, or programme validation.

## Programme governance

A stable `funding_programme` owns immutable immediate-successor versions. Each version records:

- one exact published governed-source version;
- optional published target-profile version;
- jurisdiction, hazard, and property classes;
- application window;
- maximum award and cost-share basis points;
- evidence, payment, maintenance, and reporting conditions;
- explicit limitations;
- bounded ordered eligibility rules.

The programme author cannot review their own version. Approval requires a source-and-rule check. Publication requires a third human who is neither author nor reviewer. Database triggers duplicate those separation and lineage gates, and governed rows reject update/delete.

## Deterministic eligibility

Rules support only `equals`, `one_of`, `includes`, `at_least`, and `at_most`. The assessment stores exact input facts, a canonical SHA-256 input hash, and one result/reason per rule.

Outcomes are:

- `eligible` — all required rules matched;
- `ineligible` — at least one available required fact did not match;
- `insufficient_evidence` — at least one required fact or numeric value was unavailable.

No average or model score can hide a failed or missing rule. Only an eligible assessment can support a human-confirmed prepared application. Fortify does not infer external submission or sponsor approval.

## Blended capital controls

A stack is bound to one tenant-owned resilience project and explicit project cost. Contributions may be owner, grant, financing, insurer, reinsurer, local-government, or philanthropic sources. Each stores contributor, exact source reference, amount, cost-share basis points, and purpose.

Creation rejects:

- fewer than two sources;
- duplicate source references;
- the same programme version appearing twice;
- non-positive or non-integer amounts;
- contributions above project cost;
- programme contributions without an eligible assessment;
- programme award or cost-share ceiling breaches.

The stack is planning evidence only. No bank details or transfer state exists.

## Commitments and corrections

The immutable commitment stores the original proposed amount and terms. State is derived from append-only events:

`proposed → approved → corrected → cancelled`

The proposer cannot approve their own commitment. Corrections and cancellations must supersede the latest event. A correction cannot exceed the original commitment, and cancellation fixes the effective amount at zero. Earlier records remain queryable and immutable.

## Project milestones

Milestone definitions are immutable and ordered within one project. A dependency must reference an earlier milestone in the same project. Progress is recorded as append-only events: `started`, `evidence_submitted`, `approved`, `changes_requested`, `corrected`, or `cancelled`.

Human approval requires submitted or corrected evidence, a different human from the submitter, and every predecessor’s latest state to be `approved`. A payment recommendation is additionally bound to a contribution from the same project at both service and database layers. M6 records the workflow; M7 will add independent-verifier identity, credentials, findings, exceptions, and certificates. A milestone label is not physical proof by itself.

## External collaborators

Project assignments support property manager, board contributor, and contractor roles. Each carries purpose, an allowlisted scope set, due date, expiry, random digest-only `fproject_` bearer token, and one-way revocation. Authorization intersects exact project assignment scopes with the organization-role ceiling. The project workspace endpoint filters readback to one assigned project and omits capital stacks or stakeholder benefits when their explicit read scopes are absent.

Contractors can read assigned project/intervention/milestone facts and submit milestone events; they cannot read capital-stack or insurance-strategy records. Boards can receive authorised funding visibility without payment or insurance decision authority. Property managers receive only the scoped project/evidence workflow.

## Payment and export boundary

A payment recommendation requires:

- a payment-eligible milestone whose latest event is human-approved;
- an effective approved/corrected commitment;
- an amount within both the milestone and commitment boundaries;
- an explicit human approval or rejection.

Export requires a second human and exact confirmation. The deterministic payload contains only schema version, approval, milestone, contribution, amount, currency, instruction-only flag, and content hash. Its database-constrained execution state is always `not_executed_export_only`.

Future payment providers must remain adapters outside domain logic. A provider receipt may record what an external system reported, but Fortify still must not claim custody or settlement without independently verified evidence and deliberate product/legal expansion.

## Stakeholder benefit ledger

The ledger keeps stakeholder, expected benefit category, expected cost, funding contribution, evidence level, source, timeframe, uncertainty, commitment, realized response, and correction lineage separate. It does not assume every stakeholder benefits, equate premium savings with total value, claim a Pareto improvement, or aggregate these records into an opaque ROI score.

## Local evidence and external gates

The deterministic fixture covers eligible/ineligible/insufficient rules, application confirmation, cost-share and duplicate rejection, blended sources, commitment approval/correction/cancellation, milestone dependency failure and success, contractor scope denial, revocation, payment approval, separate export confirmation, cross-tenant attacks, and immutable history.

This is local implementation evidence only. Programme validation requires a real sponsor, rights-cleared rule, real cohort/property costs, one verified milestone, an actual approval or payment-export decision, and independently read-back external evidence. No such external validation is present.
