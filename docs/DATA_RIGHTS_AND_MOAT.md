# Data rights and defensible product boundary

Fortify records the permitted use of governed data; possession of bytes or a label is never treated as permission. Raw customer data remains tenant-controlled by default. Cross-customer training, analytics, benchmarking, carrier-identifiable reporting, external-model redistribution, and programme reuse are prohibited unless the applicable contract and tenant configuration explicitly permit them.

This document is an operational classification contract, not a legal opinion. Counsel, customers, providers, and programme sponsors must approve the relevant terms before live data is admitted.

## Contract-ready classifications

| Stored value | Meaning | Default permitted use |
|---|---|---|
| `raw_customer_document` | Customer-supplied source bytes or exact extracted content | Tenant workflow only |
| `personally_identifiable` | Data identifying a natural person | Purpose-limited tenant workflow only |
| `property_specific_data` | Property identity, condition, scope, evidence, or outcomes | Tenant workflow only |
| `carrier_confidential_material` | Non-public carrier, MGA, or market material | Tenant workflow within the recorded source right only |
| `customer_specific_playbook` | Customer-authored methods, mappings, or workflow configuration | Owning tenant only |
| `fortify_generic_ontology` | Fortify-authored generic schemas and non-customer taxonomy | Fortify product operation, subject to source independence |
| `software_telemetry` | Product health and security events | Service operation under the telemetry contract |
| `deidentified_derived_event` | Derived event with direct identifiers removed under an approved method | Prohibited cross-customer by default; explicit opt-in required |
| `cross_customer_benchmark` | Cohort output spanning customers | Prohibited by default; explicit opt-in, contractual permission, minimum cohort, and suppression required |
| `model_provider_restricted` | Licensed model inputs, outputs, or derivative material | Only the exact licensed tenant purpose; no redistribution |

`confidentiality_state` is a separate control: `public`, `tenant_confidential`, `carrier_confidential`, or `restricted`. A public confidentiality label does not itself create a data right. `rights_verified=true` means the tenant has recorded a right for the stated source and use; it is not an independent legal determination by Fortify.

## Required record metadata

Governed property-graph records retain the source system, optional source-record identifier, effective period, confidentiality state, data-right classification, and rights-recorded state. A source correction creates a successor property version; it does not erase the earlier record. Missing or expired rights remain explicit and fail closed.

The California development fixture is synthetic, tenant-confidential, and classified as `property_specific_data`. Its rights flag permits use of that fixture within its own synthetic organization only. It creates no right to customer, carrier, model-provider, geospatial, or programme data.

## Cross-customer gate

Cross-customer analytics remain disabled unless all of the following are present:

1. explicit tenant opt-in for the named use;
2. contractual permission covering source and derived data;
3. approved de-identification and suppression method;
4. a configured minimum cohort size;
5. no carrier-identifiable or model-provider-restricted disclosure;
6. an auditable approval, effective period, and revocation path.

The current M1 implementation stores record-level classifications and defaults cross-customer use to `prohibited`. It does not implement the later M10 consent, cohort, de-identification, suppression, or benchmark workflow and must not be described as doing so.

## Defensible moat

The intended defensible asset is the governed recognition graph: explicit property and scope identity, source/version/effective-period lineage, rights-aware evidence, immutable decisions, and outcome events that customers are contractually permitted to retain and reuse. It is not a proprietary wildfire score, unlicensed corpus, carrier inference, or pooled customer data set.

Predictive acceptance, premium, or loss models remain prohibited until sufficient rights-cleared data exists, bias and calibration are evaluated, methods are understandable to users, and legal/regulatory review is complete.
