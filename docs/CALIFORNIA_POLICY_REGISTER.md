# California policy and programme register

Status: **M4 source-governance workflow implemented and locally validated; no fixture is production authority and no live source or rule is operative by default**.

Fortify now has a tenant-owned publication ledger for California policy, programme, standard, insurer/MGA, FAIR Plan, funding, local-authority, and external-model documentation. The production register starts empty. An organization member must register each stable source identity and immutable version, record source/snapshot provenance and rights, obtain independent human review, and record a separate publication decision before a playbook can rely on it.

## Governed records

The normalized PostgreSQL graph contains:

- `governed_sources`: stable canonical identity, source class, issuing authority, jurisdiction, official URL, authority tier, and review owner;
- `governed_source_versions`: immediate predecessor lineage, version/effective/retrieval dates, SHA-256, exact-byte/approved-snapshot/restricted-metadata state, clean storage-object reference where applicable, rights and redistribution decision, short structured summary, verify-current state, next review date, extraction method, human confirmation, author, and change summary;
- `governed_source_reviews`: one immutable independent review, exact-source comparison flag, rights confirmation, note, reviewer, and time;
- `governed_source_publications`: a distinct immutable human publication or rejection decision;
- `governed_source_dependencies`: exact published version pins for playbook versions and renewal cases; and
- `source_change_alerts`: immutable predecessor-to-successor impact snapshots assigned to the stable source owner.

Database guards independently enforce organization ownership, immediate version lineage, clean stored-byte/hash agreement, author/reviewer separation, rights/source comparison on approval, publication prerequisites, published-source-only dependencies, typed in-tenant consumers, exact successor alerts, and immutable source/version/review/publication/dependency/alert history.

## Publication workflow

1. Register a stable candidate source identity. This has no operative effect.
2. Register an immutable source version. Exact bytes or an approved snapshot require a clean tenant storage object whose SHA-256 matches the recorded source hash. Restricted material may retain metadata and a hash without redistributing content.
3. Record structured facts as candidates. `model_assisted` and `deterministic_extraction` are provenance labels, never authority.
4. A different human reviewer compares the candidate with the source and records the rights decision. Authors cannot review their own versions.
5. A human publisher other than the author records a separate publication decision. Publication fails closed unless the version is human-confirmed, verified current, independently approved, source-compared, and has an approved or explicitly restricted rights state.
6. A market playbook may pin only a published, verified-current governed source version. It retains a historical source snapshot for readback and adds an exact dependency record.
7. A case pinned to the playbook adds its own exact source dependency. No latest-version lookup can rewrite a historical case.
8. Publishing an immediate successor computes relied-on playbook/case impact and creates an immutable alert when any dependency exists. The alert does not mutate the playbook or case.

No legal, programme, model, insurer, or other rule becomes operative solely because it was extracted. Publication is source authority within Fortify's bounded evidence-readiness configuration only; it is not legal advice, compliance, insurer recognition, a commitment, designation, eligibility, pricing, or underwriting authority.

## Deterministic source fixtures

The `/sources` sandbox presents three metadata-only fixtures so the full lifecycle can run offline. Their URLs were checked against the primary publishers on August 1, 2026. The fixture does not store or reproduce the publishers' pages and does not establish legal currency, applicability, use rights, or insurer treatment.

| Fixture | Primary publisher | Source class | Fixture state | Boundary |
|---|---|---|---|---|
| [Safer from Wildfires](https://www.insurance.ca.gov/01-consumers/200-wrr/Safer-from-Wildfires.cfm) | California Department of Insurance | Regulator guidance | Two published metadata versions and a relied-on successor alert | Reference metadata only; destination rules need their own review |
| [Prior Approval Rate Filing Information](https://www.insurance.ca.gov/0250-insurers/0800-rate-filings/0200-prior-approval-factors/index.cfm) | California Department of Insurance | Statute/regulation index | Published metadata version | An index entry is not an insurer commitment or operative rule |
| [Defensible Space Zones 0, 1, and 2](https://bof.fire.ca.gov/projects-and-programs/defensible-space-zones-0-1-and-2) | California Board of Forestry and Fire Protection | CAL FIRE programme material | Model-assisted candidate blocked on rights, human confirmation, and verify-current review | Draft and meeting material remains non-operative |

The service contract test separately creates a synthetic primary-source fixture backed by a clean storage object and proves exact hash binding. It does not claim that the synthetic bytes are a California authority.

## Impact-analysis boundary

M5 extends exact relied-on dependency reporting to `target_profile_version` consumers. A successor source identifies affected playbooks, renewal cases, and target profiles without mutating them. Governed report dependencies are not implemented and remain explicitly unavailable, never zero impact or current; future milestones must extend the typed dependency graph and tenant guards before reports can be evaluated.

## Local evidence

`tests/governed-source.test.ts` proves exact clean-byte/hash binding, author/reviewer/publisher separation, rights and human-confirmation gates, no model-only activation, cross-tenant rejection, immediate successor lineage, immutable history, exact case impact, explicit unavailable categories, and successor alert creation. `tests/market-playbook.test.ts` proves that playbook creation, approval, applicability, and case links now require and retain a published governed source version.

The responsive `/sources` route includes loading, error/retry, empty, populated, candidate, blocked, reviewed, published, supersession, and impact states. Every visible lifecycle control is functional in the deterministic sandbox; production actions use authenticated route handlers and the deny-by-default policy.
