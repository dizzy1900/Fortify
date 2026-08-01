# California policy and programme register

Status: **governed register not yet implemented; no California source is operative in production**.

This document defines the publication ledger required by M4. It intentionally contains no default legal, insurer, model, or programme rule until a primary or officially authorised source has been reviewed, its use rights recorded, and a human publisher has approved an immutable source version.

## Required source classes

- California statutes and regulations;
- California Department of Insurance guidance and authorised filings;
- CAL FIRE standards or programme material;
- California FAIR Plan rules and forms;
- insurer/MGA rating or underwriting documentation supplied with rights;
- recognised third-party resilience standards;
- grant, lender, reinsurer, philanthropic, county, local-fire-authority, or programme rules;
- external model documentation and limitations.

## Publication record

Each source version must retain:

- stable source and version IDs;
- issuing authority and source class;
- title and official URL;
- exact retrieved bytes or an approved snapshot reference where permitted;
- source hash;
- version, publication/effective/retrieval dates, and status;
- superseding version;
- copyright/use/redistribution restrictions;
- short human-reviewed structured summary;
- review owner, publisher, and approval time;
- verify-current state and next review date;
- relied-on profiles, interventions, funding programmes, playbooks, cases, mappings, commitments, submissions, and reports.

## Workflow

1. Register a candidate source without making it operative.
2. Read exact bytes and record authority, provenance, rights, hash, and dates.
3. Extract only candidate structured facts; model output remains unreviewed.
4. Human reviewer compares candidates with the source and records corrections.
5. An authorised publisher approves an immutable source version.
6. Applicability remains bounded and deterministic.
7. Retrieval or webhook monitoring may create a change candidate, never an automatic operative rule.
8. Supersession runs impact analysis and notifies owners of every relied-on record.
9. Historical cases retain the exact source version used.
10. Withdrawal or uncertainty fails closed and remains visible.

No source in the fictional Colorado sandbox is a production California default. No policy, filing, standard, programme, or insurer rule becomes operative solely because it was extracted by a model.
