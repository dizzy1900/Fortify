# External model and input-mapping specification

## Purpose and authority boundary

Fortify records how independently verified property evidence may be proposed against an exact external model input. Fortify does not operate the external model, generate a wildfire or property-risk score, certify the model, infer hidden conditions, or predict pricing, eligibility, acceptance, renewal, or insurability.

Every model version is provider-owned and must pin an exact published, verified-current, rights-reviewed governed source. The register stores geography, property class, effective period, methodology summary, input/output definitions, usage rights, redistribution restrictions, and limitations. A human author, separate human reviewer, and third human publisher are required before the version becomes active.

## Mapping contract

A mapping binds all of the following without substitution:

- one tenant and property;
- one project intervention;
- one conforming, independently approved verification finding;
- every exact finding-linked evidence version used;
- one active external model version and one of its input definitions;
- the pre-intervention value;
- the proposed post-intervention value;
- the transformation method and recipe version;
- confidence, source, limitations, proposal time, and optional expiry.

The reviewer must be different from the mapping author. `approved_for_submission` is available only when the input is explicitly `supported` and both the model documentation and verification evidence have been checked. `unsupported` and `requires_provider_confirmation` remain visible states and never pass silently.

## Lifecycle and value separation

The append-only lifecycle is:

`proposed → internally_reviewed → submitted → accepted_by_model_market | accepted_with_modification | rejected`

An explicitly unsupported proposal records `unsupported`; an out-of-window proposal records `expired`. Each event is human-confirmed, cites its source authority and reference, and supersedes only the latest event.

The proposal is immutable. An unmodified acceptance must exactly equal the proposed value. A modified acceptance must differ and is stored in a separate `accepted_value` field. Submission, internal review, or the mere existence of a model definition never implies external acceptance.

## External outputs

An output record is an externally supplied observation. It must identify the active model version, exact output definition, property, as-of date, source authority/reference, assumptions, limitations, and importing human. Optional supporting evidence must belong to the same property. Fortify does not calculate or endorse the value.

## Evidence hierarchy

Model mappings build on—but do not upgrade—the underlying verification evidence level. `physical_specification`, `verified_installation`, modeled reduction, filed rating treatment, underwriting treatment, financing/programme treatment, observed-event performance, and claims evidence remain distinct. A model mapping cannot convert one level into another.

## Validation boundary

The local contract suite proves deterministic service rules, PostgreSQL-compatible constraints, immutability, authorization, and tenant isolation. It does not prove external model accuracy, provider authorization, source rights, semantic mapping validity, carrier use, market acceptance, managed deployment, or customer reliance. Those require rights-cleared sources and an authorized provider/customer review.
