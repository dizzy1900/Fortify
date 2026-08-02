# Market playbook governance

Fortify market playbooks are tenant-owned evidence-workflow configurations. They are not carrier rules, legal opinions, compliance determinations, underwriting models, or predictions of acceptance, renewal, pricing, or insurability. A tenant must have the right to use every configured source and must verify it remains current.

## Version and approval model

- `market_playbooks` provide a stable tenant-owned identity and name.
- Every `playbook_version` is an immutable snapshot of destination, program, jurisdiction, peril, property class, optional policy form, effective period, exact governed-source-version pin, historical source/version/citation snapshot, change summary, and content hash.
- Requirements, freshness, accepted evidence/source types, scope, review authority, deadlines, template/delivery fields, caveats, and conditions are immutable children of the exact version.
- A successor points to the immediately prior version. The prior version and every case link remain available; corrections never rewrite them.
- A playbook can be created only from a published, verified-current governed source version. Creation adds an immutable source dependency. The author cannot review the same playbook version, and approval rechecks that the governed source remains published and verified current. A changes-requested decision requires a successor rather than editing the reviewed version.
- Database triggers reject update/delete of versions, rules, reviews, and case links and reject cross-organization parent references.

## Bounded applicability

The executable condition language is deliberately small. Fields are limited to `market_id`, `program_id`, `jurisdiction`, `peril`, `property_class`, and `policy_form`. Operators are limited to `equals`, `not_equals`, `one_of`, and `not_one_of`, with explicit non-empty string values. Arbitrary JavaScript, SQL, regular expressions, and model-generated executable code are not accepted.

An approved version matches only when its market, exact optional program, jurisdiction, peril, property class, optional policy form, and effective period match the case destination and renewal date. No match fails closed. More than one match also fails closed for administrator resolution; Fortify does not silently choose one.

## Case linkage and version history

An authorized broker can pin the one applicable approved version to a case destination. A later pin is a new append-only link with a pointer to the prior link. The database validates playbook approval, governed-source publication/current state, tenant ownership, scope, destination, and effective date before accepting a link. The link also adds an exact case/source dependency. This preserves the playbook and source versions used for prior-case decisions and future impact analysis.

## Deterministic evidence readiness

Each applicable requirement reports one of:

- `ready`
- `missing`
- `stale`
- `scope_mismatch`
- `contradiction`
- `unreviewed`
- `insufficient`
- `not_applicable`

A linked evidence version must satisfy accepted type/source/disposition, exact scope, freshness/expiry, and required human-review state together. Separate weak evidence records cannot be combined to manufacture a ready state. An unresolved contradiction remains explicit.

The destination result is rule-based:

1. any unresolved blocking requirement makes the result `blocked`;
2. otherwise an unresolved required item makes it `review_required`;
3. otherwise an unresolved recommended item makes it `ready_with_caveats`;
4. otherwise it is `ready_for_human_confirmation`.

No average is used. Completed recommended items cannot offset a blocker. The output is labelled **submission evidence readiness** and always carries the non-score/non-outcome caveat.

## Roles and validation boundary

Organization owners, brokerage administrators, and practice leaders may author and independently review playbooks. Case roles may read applicable guidance; authorized case operators may pin an approved version. External contributors do not receive authoring authority.

The checked-in Colorado sandbox uses a fictional, published broker-authored governed source and deterministic evidence. The separate `/sources` sandbox demonstrates California primary-page metadata boundaries but does not make those fixtures operative in the Colorado workflow. PGlite tests prove local PostgreSQL-compatible migration, source publication/current-state enforcement, isolation, immutability, lifecycle, applicability, and evaluation behavior. They do not prove that a carrier accepts the configuration or that a rights-cleared live source/customer guide, managed PostgreSQL service, or production deployment has been validated.
