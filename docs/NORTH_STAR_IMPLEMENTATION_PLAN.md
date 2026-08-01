# Fortify north-star implementation plan

This plan implements [COMMERCIAL_NORTH_STAR.md](./COMMERCIAL_NORTH_STAR.md). The commercial north star is authoritative over the earlier demo roadmap. Work proceeds in tested vertical milestones; a milestone is complete only when its code, migration, authorization, user flow, audit behavior, operational documentation, and measured validation are all present.

## Operating rules

- Preserve the deterministic fictional sandbox, guided notice-to-packet story, generated PDF/ZIP artifacts, evidence hashes, provenance, human confirmation gates, and non-predictive language.
- Keep production data tenant-scoped and deny by default. Synthetic sandbox data belongs to an isolated sandbox organization and is never an implicit production fallback.
- Use normalized PostgreSQL for the production source of truth, S3-compatible private object storage, and one PostgreSQL-backed durable worker. Keep local adapters only for deterministic development and tests.
- Record consequential mutations and their audit events in one transaction. Use immutable versions and supersession rather than destructive updates.
- Build provider contracts and deterministic fixtures when live credentials or rights-cleared data are unavailable. Never label fixture validation as live integration validation.
- Do not implement speculative multi-peril features before the Colorado wildfire renewal workflow is production-ready, but keep peril, jurisdiction, market, program, property class, and requirement version first-class.

## Milestone sequence

### M1 — Repository, CI, and status foundation

Deliver the authoritative commercial brief, this execution plan, a measured capability matrix, CI for every gate the current repository can truthfully run, a GitHub settings checklist, and explicit separation between demo-complete and production-complete status.

Exit evidence:

- required documents exist and link to one another;
- CI installs from the lockfile and runs lint, strict typecheck, unit/integration tests, blank-database migration verification, production build, deterministic evaluation, Playwright, dependency audit, secret scan, SAST, and container scan where supported;
- missing tenant-isolation, production accessibility, backup/restore, and external-validation gates are visible rather than represented by placeholders;
- local milestone gates pass and results are recorded in `IMPLEMENTATION_STATUS.md` and `PROGRESS.md`.

### M2 — Normalized PostgreSQL and sandbox isolation

Introduce a PostgreSQL runtime adapter and normalized tenant-owned schema, migrations, repository interfaces, transactions, constraints, optimistic concurrency, idempotency records, append-only audit events, test factories, and a seed-to-normalized migration. Move all fictional data into an explicit sandbox organization. Remove production reads and writes of `app_state.state_json`; retain SQLite only as an explicit deterministic sandbox/test adapter if it remains useful.

Exit evidence: clean database migration from zero, seed migration, rollback rehearsal, repository contract suite against PostgreSQL, audit transaction tests, no production `DemoState` path, and sandbox isolation tests.

### M3 — Identity, organizations, and authorization

Add OIDC-compatible production identity, local development identity, sessions, invitations, organizations, memberships, teams, assignments, external principals, service accounts, scoped API credentials, and deny-by-default policy checks on every repository and mutation boundary.

Exit evidence: role/permission matrix, revocation and expiry behavior, support-access controls, and automated cross-tenant attack tests for every resource class introduced so far.

### M4 — Secure object storage and evidence upload

Add private S3-compatible storage with tenant prefixes, signed operations, encryption settings, checksum and MIME enforcement, filename normalization, size limits, quarantine and malware-scan lifecycle, metadata handling, retention/legal hold/deletion hooks, access audit, and backup contract. Preserve the local adapter for tests only.

Exit evidence: storage authorization and traversal tests, quarantined upload flow, immutable evidence versions, signed-link expiry/revocation, and restoreable fixture backup.

### M5 — Portfolio and SOV import

Implement CSV/XLSX/SOV upload, configurable and saved mappings, validation, dry-run preview, stable external identifiers, address and building reconciliation, duplicate/ambiguity review, rejected-row quarantine, idempotent reruns, receipts, and rollback. Add generic AMS CSV plus Applied Epic and AMS360 fixture-backed boundaries.

Exit evidence: real parser coverage for all listed edge cases, a broker-visible import UI, normalized property graph output, rollback proof, and rights-cleared external validation gate.

### M6 — Production notice and document pipeline

Implement durable jobs for hashing, validation, scanning, classification, OCR/extraction providers, page/region provenance, confidence, human review, corrections, and supersession. Replace the hard-coded notice parser with versioned extractor contracts and fixtures for notices, questionnaires, correspondence, and requested-evidence messages.

Exit evidence: durable retry/dead-letter behavior, document matrix tests, human-confirmation enforcement, and no model-derived confirmed facts without approved policy and audit.

### M7 — Market playbooks and deterministic readiness

Build versioned tenant/market/jurisdiction/peril/property-class playbooks with bounded conditions, effective dates, source citations, author/reviewer lifecycle, diffs, and prior-case linkage. Replace the universal weighted formula with destination-specific deterministic requirement states, blockers, freshness, scope, contradictions, reviewer state, and explicit caveats.

Exit evidence: applicability and version tests, administrator builder UI, explainable readiness output, and proof that averages cannot hide blockers.

### M8 — Renewal workflow and external evidence collection

Add case templates, owners and teams, task dependencies, deadlines, reminders/escalation, communications, bulk portfolio workflows, quality/final review, next-cycle roll-forward, and branded contributor requests with scoped expiring access, consent, mobile support, and clarification.

Exit evidence: complete internal plus external contributor journey, revocation/expiry tests, scope isolation, and audit receipts.

### M9 — Submission and secure reviewer flow

Extend current deterministic artifacts with tenant/market templates, SOV, crosswalk, caveats, hashes, redaction, secure data room, immutable submission versions, delivery receipts, and human confirmation of destination, documents, fields, caveats, message, and permissions. Add scoped underwriter review and clarification.

Exit evidence: artifact regression suite, secure-link and download-control tests, reviewer isolation, delivery idempotency, and immutable version proof.

### M10 — Response and outcome capture

Normalize delivery events, acknowledgements, clarifications, evidence dispositions, quote/decline/bind/renewal outcomes, original response language, reason taxonomy, corrections, and supersession.

Exit evidence: workflow and taxonomy tests, correction history, destination/requirement acceptance graph, and no silent overwrite.

### M11 — Portfolio analytics and moat instrumentation

Measure workflow/ROI inputs and tenant-only descriptive acceptance analytics. Add explicit consent/data-right records, de-identification, cohort thresholds, suppression, and non-disclosure tests before any cross-customer aggregate.

Exit evidence: exportable pilot report, customer-confirmed baseline field, opt-in enforcement, privacy tests, and no predictive underwriting claims.

### M12 — Email and AMS integrations

Implement Microsoft Graph mailbox intake first, Gmail and drive provider boundaries, webhooks, scoped API keys, health, pagination, rate limits, schema versions, sync receipts, retries/dead letters, and production-quality fixture-backed AMS boundaries without screen scraping.

Exit evidence: contract tests, webhook verification, idempotent replay, disconnected/degraded states, admin configuration, and explicit credential-dependent validation gates.

### M13 — Security hardening, backup/restore, and deployment

Complete security headers, CSP, CSRF, rate limits, secrets handling, structured/redacted logs, retention/deletion/legal hold, dependency/SAST/container scans, health/readiness, staging/production release workflow, migration-before-release, rollback, encrypted backups, point-in-time recovery, and a measured restore exercise.

Exit evidence: threat model, security questionnaire, subprocessors, incident/operations runbooks, SOC 2 readiness checklist without certification claims, deployment validation, and dated backup/restore report.

### M14 — Design-partner acceptance and launch report

Run the full 18-step production journey with rights-cleared data, ten redacted cases, an external market reviewer, measured pilot workflow metrics, discrepancy resolution, and paid-continuation decision.

Exit evidence: launch-readiness report distinguishes code-complete, deployment-validated, and externally validated capabilities; any missing customer/carrier evidence remains blocked, never inferred.

## Per-cycle procedure

At the start of every Goal cycle, read `AGENTS.md`, `COMMERCIAL_NORTH_STAR.md`, this plan, `IMPLEMENTATION_STATUS.md`, `git status`, and recent commits. Select the earliest incomplete milestone whose dependencies are satisfied. Implement a coherent vertical slice, inspect the real browser UI on relevant viewport sizes, run proportionate tests plus `git diff --check`, update status with exact evidence and limitations, and commit if repository configuration permits.

## Completion states

- **Implemented**: code and local automated evidence exist.
- **Deployment-validated**: staging/production infrastructure has been exercised with measured results.
- **Externally validated**: rights-cleared customer and market-reviewer evidence satisfies the commercial brief.
- **Blocked**: completion requires an unavailable credential, proprietary document, customer dataset, reviewer, or owner setting. The adapter, fixtures, tests, administration, and exact validation gate must still be complete before using this label.

Fortify is not production-ready until every code-complete criterion in the commercial north star is proven. It is not externally validated until the separate customer and reviewer criteria are proven.
