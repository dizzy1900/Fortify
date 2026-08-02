# Fortify north-star implementation plan

This plan executes [COMMERCIAL_NORTH_STAR.md](./COMMERCIAL_NORTH_STAR.md). The commercial north star and [AGENTS.md](../AGENTS.md) are authoritative. Work proceeds in tested vertical slices; a milestone is not complete merely because an earlier renewal feature has an adjacent name.

## Operating rules

- Preserve the Colorado renewal workflow as an explicit synthetic sandbox and regression suite. California is the first production jurisdiction.
- Production persistence is normalized PostgreSQL behind tenant-scoped repositories. Synthetic `DemoState`, role switching, and current-case globals never serve production.
- Keep one Next.js application, private S3-compatible storage, OIDC-compatible identity, one PostgreSQL-backed durable worker, and provider interfaces. Add PostGIS only for material spatial relationships.
- Record consequential writes and audit events in one transaction. Governed records are immutable or corrected through explicit supersession.
- Keep evidence levels, model treatment, filed rating treatment, underwriting treatment, financing/programme treatment, observed performance, and claims evidence separate.
- Implement adapters, admin workflow, deterministic fixtures, and explicit external gates when credentials or rights-cleared sources are unavailable. Never label fixture evidence as live validation.
- Human approval is required for verification conclusions, payment/disbursement exports, model or market acceptance, market delivery, and normalized insurance/funding outcomes.

## Milestone sequence

### M0 — Product doctrine and release foundation

Reconcile repository doctrine, status, architecture, CI, claims scanning, and release evidence with the California Resilience Investment and Insurance Recognition OS. Preserve the published M1–M7 renewal foundations as measured inputs, not proof of profiles, interventions, funding, verification, model mapping, or market recognition.

Exit evidence:

- `AGENTS.md`, commercial north star, this plan, implementation status, progress, and validation report agree on product boundary and milestone states;
- current regression, secret, dependency, build, migration, tenant-isolation, browser, and prohibited-claims gates remain measurable;
- owner-controlled GitHub and external-validation gates remain explicit.

### M1 — Production data plane and sandbox isolation

Complete normalized organizations, portfolios, property graph, insurance, governance, audit, retention, and spatial-ready data foundations. Keep the Colorado sandbox isolated from production routing and data.

Exit evidence: blank migration, seed migration, transactional audit, optimistic concurrency, idempotency, cross-tenant tests, no production `DemoState`, and an explicit California fixture organization.

### M2 — Identity and secure evidence

Complete OIDC-compatible identity, expanded resilience roles, portfolio/case assignments, controlled support access, private encrypted object storage, quarantine/scanning, signed operations, evidence provenance, retention/legal hold, and access logs.

Exit evidence: revocation/expiry/MFA-ready behavior, cross-tenant attacks for every resource, scoped external links, upload authorization, immutable evidence versions, and exact-byte backup/readback fixtures.

### M3 — Live brokerage wedge

Deliver California portfolio/SOV/policy imports, the persistent property evidence graph, policy/renewal/appeal cases, document and notice intake, human confirmation, renewal workflow, external evidence requests, and production-architecture packet generation.

Exit evidence: one complete development-fixture brokerage journey from import through versioned packet without legacy global state; rights-cleared brokerage acceptance remains external.

### M4 — California source and recognition playbooks

Add the governed California policy/programme/model/insurer source register, source publication and supersession, relied-on-source change alerts, impact analysis, market playbooks, deterministic applicability, and destination-specific evidence readiness.

Exit evidence: primary/authorised source fixtures, admin publication UI, affected-record impact report, playbook lifecycle, blockers, and no legal or insurer rule made operative solely by extraction.

### M5 — Target profiles, interventions, and capital planning

Add versioned Target Resilience Performance Profiles, intervention specifications, baseline conditions, gap assessment, evidence hierarchy, project candidates, transparent cost/timeline/dependency scenarios, maintenance requirements, and a resilience capital plan.

Exit evidence: applicable and inapplicable California scenarios, independent author/reviewer lifecycle, minimum/preferred distinctions, no opaque ROI score, and explicit insufficient-evidence/no-attractive-path results.

### M6 — Funding and project execution

Add funding programmes and versions, deterministic eligibility, blended capital stacks, commitments, owner/grant/financing/insurer contributions, project milestones, dependencies, human approvals, disbursement-export boundary, external property-manager/board/contractor workflows, and stakeholder benefit ledger.

Exit evidence: cost-share and duplicate-funding controls, milestone dependencies, approval/correction/cancellation history, scoped external access, and no movement of customer funds.

### M7 — Independent verification and maintenance

Add verifier organizations, credentials and expiry, conflicts, assignments, methods, evidence-level findings, exceptions, corrective action, reinspection, certificates, revocation, maintenance obligations, refresh, and longitudinal condition events.

Exit evidence: every conclusion traces to profile, intervention, evidence, verifier, method, date, exceptions, and human approval; Fortify never represents itself as the substantive verifier.

### M8 — External model mapping and market commitments

Add external model/version/input/output/source/rights registers, proposed model-input mappings, internal review, submitted/accepted/modified/rejected/unsupported/expired states, and explicit insurer/MGA/reinsurer/lender/programme commitments.

Exit evidence: proposed and accepted values remain distinct, unsupported mappings fail closed, commitments retain source/exclusions/effective period, and “will review” never becomes “will insure.”

### M9 — Recognition submissions, secure review, and outcomes

Extend deterministic artifacts into versioned recognition submissions with exact bytes/hashes, human confirmation, delivery receipts, scoped insurer review, clarification, evidence disposition, model response, rating treatment, underwriting treatment, placement response, funding response, corrections, and maintenance roll-forward.

Exit evidence: immutable submissions/delivery, reviewer isolation, idempotent delivery, original language plus normalized taxonomies, no silent overwrite, and production-fixture end-to-end coverage.

### M10 — Programme administration, recognition graph, and analytics

Add sponsor cohort administration, programme dashboard, stakeholder benefit ledger, governed recognition-graph events, tenant-only descriptive analytics, brokerage ROI, programme outcomes, and opt-in/de-identification/suppression controls for any cross-customer aggregate.

Exit evidence: exportable reports, customer-confirmed baselines, privacy attacks, cohort thresholds, no predictive acceptance/premium claims, and no causal loss-reduction claim without evaluation design.

### M11 — Production integrations

Complete Microsoft Graph intake first, Gmail/drive boundaries, AMS/property-system/model/verifier adapters, webhook verification, scoped API keys, pagination, rate limits, health, schema versions, sync receipts, retries, and dead letters.

Exit evidence: deterministic provider fixtures, idempotent replay, degraded/disconnected states, admin configuration, and credential-dependent live gates.

### M12 — Operational hardening and launch validation

Complete CSP/CSRF/security headers/rate limits, structured redacted logs, secrets, RLS defence in depth, retention/deletion, staging/production release process, observability, dependency/SAST/container/accessibility/visual gates, encrypted backup/PITR, restore exercise, incident response, and launch evidence.

Exit evidence: measured deployment and restore records, threat/data-flow/security documents, full 33-step production-fixture flow, and launch status separating code, local, deployment, customer, market, programme, and external validation.

## Per-cycle procedure

At the beginning of each Goal cycle read `AGENTS.md`, `COMMERCIAL_NORTH_STAR.md`, this plan, `IMPLEMENTATION_STATUS.md`, `git status`, and recent commits. Select the earliest incomplete unblocked milestone. Implement a coherent vertical slice, inspect the real browser at desktop/tablet/mobile, run proportionate tests plus `git diff --check`, update measured evidence and limitations, commit where repository configuration permits, and continue.

## Status vocabulary

- **Not started** — no governed implementation evidence.
- **In progress** — an incomplete vertical slice exists.
- **Code complete** — the milestone implementation and contracts exist.
- **Locally validated** — required local gates and real UI/artifact inspection passed.
- **Deployment validated** — selected managed infrastructure was exercised.
- **Externally blocked** — adapter/admin/fixtures/tests exist but required outside evidence is unavailable.
- **Customer validated** — a rights-cleared customer used the flow successfully.
- **Market validated** — an insurer/MGA or other market actor used and responded to it.
- **Programme validated** — a real sponsor, funding rule, milestone, and approval/export decision were exercised.

Fortify is not production-ready until every code-complete criterion is proven, deployed, secured, and restorable. It is not externally validated until the separate customer, verifier, market, programme, data-rights, and paid-continuation conditions are met.
