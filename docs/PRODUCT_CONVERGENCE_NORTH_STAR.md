# Fortify product convergence north star

This brief supersedes roadmap language that encourages horizontal feature expansion. It does not supersede Fortify's evidence, authority, data-rights, tenant-isolation, or no-overclaiming doctrine.

## Outcome

Converge Fortify M0-M12 into one coherent, deployable, and sellable product for specialist brokers managing California wildfire-exposed community-association and low-rise multifamily property.

The daily product must help a broker:

1. See which cases need action.
2. Understand what the market requested.
3. Collect the correct property-scoped evidence.
4. Identify resilience gaps and relevant interventions.
5. Coordinate funding only where a real programme applies.
6. Coordinate independent verification.
7. Assemble a market-specific submission.
8. Receive and normalize the external response.
9. Preserve the property and maintenance record.
10. Prove workflow and outcome history.

The user must not need to understand Fortify's internal milestones, services, database schema, or authority graph.

## Product boundary

Fortify is a Resilience Investment and Insurance Recognition OS. It is not a wildfire model, risk score, insurer, rating engine, inspection authority, designation body, contractor marketplace, construction manager, grant fund, lender, generic quoting platform, or legal, actuarial, engineering, or underwriting decision-maker.

Never:

- imply that workflow readiness means insurability;
- imply that verified work guarantees model, rating, premium, or underwriting treatment;
- imply that delivery proves recipient review or that evidence acceptance proves quote or bind;
- imply that programme eligibility proves funding;
- fabricate a live integration or present synthetic records as production facts;
- use an LLM for a safety-, financial-, or authority-critical decision;
- add another broad business domain before pilot readiness; or
- redesign only the visual layer while leaving disconnected workflows underneath.

Retain human confirmation, source/version provenance, explicit missing and unsupported states, corrections through supersession, immutable submitted bytes, external-authority separation, tenant ownership, the isolated Colorado sandbox, deterministic tests, and fail-closed behavior.

## Ordered convergence priorities

### P0. Correctness and security

- Run every tenant query and mutation through one request-bound transaction.
- Set `fortify.organization_id` and actor context with transaction-local PostgreSQL settings.
- Use a non-owner application role with neither table ownership nor `BYPASSRLS`; keep migration and runtime credentials separate.
- Prove that pooled context cannot survive commit or rollback and that cross-tenant reads and writes fail without repository predicates.
- Serialize each organization's append-only audit chain and prevent forked chain links.
- Atomically consume OIDC attempts, invitations, and single-use grants.
- Harden session, CSRF, authorization, and response data minimization behavior.

### P1. Architecture convergence

Split the production schema, authorization registry, and large services by bounded context. Establish a small shared semantic kernel and consistent command/query, transaction, error, audit, and idempotency contracts. Inventory unused or duplicative tables and routes before adding schema.

### P2. Unified product shell

Create one authenticated, case-first product shell with no more than seven role-specific top-level destinations. Internal milestones and service boundaries must not appear as product navigation.

### P3. Design system

Replace milestone-specific global CSS and giant client components with accessible, composable primitives and domain patterns. Remove fixture universes and duplicated DTOs from production client modules.

### P4. Continuous production workflow

Wire one organization, portfolio, property, and case continuously from import and notice intake through evidence, resilience planning, applicable funding, verification, market submission, response, outcome, maintenance, and audit/ROI reporting. Every required customer action must persist through a real production mutation.

### P5. Managed staging

Deploy and validate PostgreSQL/PostGIS, OIDC/MFA, private encrypted object storage, malware scanning, durable jobs, secrets, monitoring, backup, and fresh-target restore. Record exact deployment evidence and keep unavailable external gates explicit.

### P6. Paid design-partner pilot

Use rights-cleared California data, at least ten governed cases, and a measured customer workflow. Pilot readiness does not imply insurer, programme, model-provider, or other external acceptance.

## Experience standard

The product should feel calm, precise, and trustworthy through progressive disclosure, exact language, refined interaction, role-specific navigation, and excellent responsive behavior. Avoid card soup, milestone-labelled screens, fixture controls in production, decorative dashboards, generic AI styling, and implementation-driven navigation.

Every route must provide meaningful populated, loading, error, empty, insufficient-evidence, and permission-denied behavior where applicable. Every visible control must work.

## Definition of done

An authenticated first-time broker can use one coherent deployment to onboard a portfolio, find an urgent case, collect and review evidence, plan relevant interventions, coordinate verification, generate and deliver a market-specific submission, capture the external response, preserve maintenance, and produce an audit/ROI report. Critical operations use managed production infrastructure; tenant, concurrency, security, accessibility, browser, performance, recovery, and end-to-end gates pass; and one rights-cleared pilot cohort can be onboarded without code changes.

Code completion, local validation, deployment validation, customer validation, programme validation, market validation, and paid continuation remain separate claims.
