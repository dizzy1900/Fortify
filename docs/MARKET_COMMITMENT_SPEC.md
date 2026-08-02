# Market commitment specification

## Purpose

The market commitment register stores explicit, versioned actions authored by an identified insurer/MGA, reinsurer, lender, public programme, philanthropic funder, or property operator. A model mapping, evidence package, meeting, or expression of interest is not a commitment.

## Required version scope

Each version pins:

- the committing organization and exact commitment type;
- a published target profile and optional active external model version;
- geography, property classes, evidence requirements, and exclusions;
- the exact response, underwriting, rating, data-sharing, or financial action;
- its authority scope and effective period;
- an exact published, verified-current, rights-reviewed governed source;
- limitations, author, independent review, publication, and successor lineage.

The author, reviewer, and publisher must be three different humans. Publication requires explicit human confirmation. Supersession preserves every prior version.

## Commitment types and authority

Review-only types—`evidence_review_commitment`, `response_service_level`, `quote_review`, and `reinsurance_portfolio_review`—can use only `review_only` authority. “Will review” never means “will insure.” It cannot be translated into rating treatment, underwriting action, capacity, bind authority, renewal, price, premium savings, or a financial obligation.

Other commitment types must match their exact authority:

- `approved_rating_treatment` → `rating_treatment`;
- `underwriting_reconsideration` or `capacity_allocation` → `underwriting_action`;
- `grant_payment`, `milestone_payment`, or `financing_product` → `financial_action`;
- `data_sharing_commitment` → `data_sharing`.

The register records the stated authority; it does not create it. Legal, underwriting, rating, lending, funding, payment, custody, and settlement authority remain external.

## Fail-closed states

No commitment is inferred when the register is empty, expired, withdrawn, unpublished, source-stale, rights-pending, out of geography/property scope, or missing required evidence. Missing and contradictory information remain explicit. A model response and a market commitment are separate evidence objects.

## Validation boundary

Local tests prove source/profile/model pins, type-to-authority checks, three-human publication, immutable history, authorization, and tenant isolation. They do not prove that a named external party exists, has authority, approved the language, will act, or will produce any insurance or financial outcome. Production use requires an authorized counterparty, executed or otherwise authoritative source evidence, currentness review, managed deployment, and customer acceptance.
