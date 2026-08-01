# Evidence hierarchy

Fortify keeps materially different forms of evidence separate. A higher ordinal is not automatically “better,” and no level inherits the authority of another. Every benefit or impact statement must carry its level, source, version, method, date, applicable property/intervention, uncertainty, reviewer, and independent-verification state.

| Level | Code | Meaning | Authority boundary |
|---|---|---|---|
| 1 | `physical_specification` | A work scope or condition is compared with a stated technical or engineering specification | Does not prove installation, performance, model treatment, funding, or insurance treatment |
| 2 | `verified_installation` | An accountable independent verifier confirms installation or condition using a recorded method | Does not itself prove loss reduction, rating treatment, underwriting recognition, or observed event performance |
| 3 | `modelled_vulnerability_reduction` | A named external model/version estimates reduced vulnerability or ignition probability | Model output with assumptions; not ground truth, filed rating, or underwriting treatment |
| 4 | `modelled_expected_loss_reduction` | A named catastrophe or actuarial model/version estimates lower expected loss | Does not establish a filed rate, premium change, eligibility, or observed loss |
| 5 | `filed_rating_treatment` | A carrier filing or authorised source contains an applicable rating treatment | Applicability and actual application remain separate governed facts |
| 6 | `underwriting_treatment` | A carrier changes or records classification, eligibility, terms, capacity, or review state | Does not prove physical performance, rating causation, quote, bind, or renewal |
| 7 | `financing_or_programme_treatment` | A lender, grant programme, insurer, reinsurer, or funder changes a decision | Does not confer insurance authority or prove physical/model outcomes |
| 8 | `observed_event_performance` | Physical performance is observed during a recorded hazard event | Property/event-specific evidence; generalisation requires a suitable method and rights |
| 9 | `claims_evidence` | Rights-cleared claims or loss outcomes exist for a suitable property or cohort | No causal Fortify or intervention claim without defensible design, rights, bias review, and uncertainty |

## Required claim provenance

Every stored claim or range must include:

- stable claim and governed source identifiers;
- evidence level;
- issuing/provider organization;
- source title, URL or object reference, version, effective/retrieval dates, and use rights;
- methodology and assumptions;
- applicable jurisdiction, hazard, property scope, profile, and intervention;
- value or bounded range with units;
- uncertainty and limitations;
- reviewer, review date, and confirmation state;
- independent-verification status and verifier reference where applicable;
- correction/supersession lineage;
- market, programme, or model acceptance state recorded separately.

## Forbidden collapses

Fortify must never transform:

- specification into verified installation;
- verified installation into modelled loss reduction;
- modelled loss reduction into filed rating treatment;
- filed rating treatment into underwriting eligibility;
- underwriting review into quote, bind, renewal, or availability;
- programme eligibility into funding approval or payment;
- market review into market acceptance;
- evidence completeness into safety, compliance, insurability, or physical resilience;
- one property or event into a population-level causal claim.

Production services and UIs must use the exact codes above or a versioned successor ontology, expose insufficient/unsupported/unverified states, and require human confirmation at every authority transition.
