# Legacy Colorado sandbox product brief

This document now governs only the preserved deterministic Colorado renewal sandbox and its regression story. The authoritative product doctrine is [COMMERCIAL_NORTH_STAR.md](./COMMERCIAL_NORTH_STAR.md): a California-first Resilience Investment and Insurance Recognition OS. Nothing in this sandbox brief proves or scopes the production target-profile, intervention, capital, funding, verification, model-mapping, market-commitment, recognition, programme, or longitudinal-outcome systems.

## Thesis and wedge

The preserved sandbox is a renewal evidence and appeal workspace for specialist brokers handling fictional Colorado community-association, condominium, townhome, and low-rise multifamily master policies exposed to wildfire. It converts notices, mitigation documents, photos, certificates, invoices, and community records into an underwriter-reviewable fictional case.

The economic buyer is a community-association insurance practice leader or independent brokerage principal. The daily user is a renewal/account executive. Secondary users are community managers, HOA boards or risk committees, mitigation professionals, and read-only underwriter reviewers.

The broker must be able to answer: what did the carrier say; what is required; what is proven; what is missing, stale, or contradictory; what must happen before each deadline; what was submitted; and what did the carrier accept, reject, or change?

## Product doctrine

- Evidence infrastructure, never a competing hazard model. Never infer a wildfire risk score.
- No promise of discount, renewal, insurability, acceptance, pricing change, or successful appeal.
- Organize evidence from credible sources without subordinating carriers, IBHS, contractors, or inspectors to Fortify.
- A human confirms every extracted notice field and every submission.
- Deterministic extraction works without an API key. Any future model provider remains optional.
- The durable evidence record is a by-product of renewal work, not an abstract lead concept.
- Prefer the simplest reversible implementation and record meaningful choices in `DECISIONS.md`.

## Carefully represented reference context

The seeded non-exhaustive demo knowledge base represents Colorado HB25-1182 as effective July 1, 2026, with annual wildfire-score/classification/mitigation notices and an appeal workflow for covered residential property insurance. Demo deadlines are 10 calendar days to acknowledge an appeal and 30 calendar days for a decision. Covered examples include homeowner, residential condominium, multifamily residential, and Colorado FAIR Plan contexts.

It also represents the December 2025 IBHS Wildfire Prepared Multifamily reference supplied for this demo. Live-source review on August 1, 2026 found that IBHS announced formal Multifamily and Neighborhood standards plus updated Home requirements on June 9, 2026. The product therefore preserves the supplied reference as historical demo context while linking the current official update and requiring users to verify current material. These are configurable references, not legal advice. The UI must show citations, version dates, non-exhaustive scope, and a prominent verify-current status. It must not reproduce proprietary requirements wholesale or claim affiliation.

## Required records

The model includes Organization, User, Role, BrokerTeam, Client, Community, Parcel, Building, UnitSummary, Carrier, Policy, RenewalCase, Notice, NoticeField, Standard, Requirement, RequirementVersion, MitigationAction, EvidenceItem, EvidenceLink, EvidenceReview, Task, Submission, SubmissionItem, CarrierResponse, Outcome, MaintenanceEvent, Comment, and AuditEvent.

Evidence records carry source and organization, file metadata and SHA-256 hash, capture/issue/upload dates, property scope, optional geolocation, submitting/verifying parties, requirement links, validity/expiry, confidence and human-review state, case-specific carrier status, and non-destructive supersession.

## Required product surface

Public broker value proposition; role-aware demo entry; portfolio triage; community/property map; policy/renewal timeline; notice intake/extraction/confirmation; source-versioned requirement crosswalk; evidence table/gallery/filters/provenance; case builder; packet preview/generation; read-only underwriter review; structured response/outcome capture; maintenance; reports/audit; carrier/standard/template settings; and one-click demo reset.

Evidence readiness exposes requirement coverage, freshness, source confidence, scope match, unresolved contradictions, and human-review completion. It never means risk reduction, expected loss, underwriting eligibility, or compliance. A 92% ready case can still be declined.

## Deterministic fictional universe

Seed three clearly fictional Colorado cases: a 96-unit, 12-building Boulder County condominium with a clarification notice; a 140-unit Jefferson County townhome association with stale vegetation evidence, missing invoice scope, and an appeal deadline; and a Larimer County low-rise apartment portfolio with a completed mitigation package and successful fictional reconsideration. Include three fictional carriers/formats, 40+ evidence items, 25+ requirements, a duplicate/conflict, an expired item, a clarification return, successful appeal, rejection reason, and year-over-year reuse.

## Five-minute story

The broker sees the case in danger, confirms a new notice, reviews the automatic crosswalk, assigns two evidence tasks, resolves or flags a contradiction, generates and previews the real PDF/ZIP, switches to underwriter view to request clarification, returns as broker to respond and record a fictional outcome, then shows how retained evidence accelerates next year. A persistent guide advances, resets, or exits without blocking product use.

## Generated packet

The PDF includes case cover/purpose, property and policy summary, confirmed notice, deadlines/communications, requirement-evidence matrix, mitigation actions, evidence index with hashes/dates/scope/provenance/expiry, caveats, attestations/limitations, and exhibit references. The ZIP includes a machine-readable manifest and seeded exhibits. The reconsideration letter is editable before export.

## Boundaries and evaluation

Use a local storage adapter with a documented S3-compatible future. Keep a repository/service boundary for future Postgres. No billing, marketplace, remote sensing, actual carrier APIs, real-auth complexity, production legal templates, or fabricated integrations. Core demo operation never requires external maps or services.

Automated checks cover seed integrity, route health, artifacts, readiness, immutable audit behavior, deadlines, source traceability, roles, deterministic reset, and prohibited claims. Playwright covers the guided story. Manual review covers buyer relevance, trust, completeness, polish, and unsupported claims. Carrier acceptance and pricing changes are never guaranteed.
