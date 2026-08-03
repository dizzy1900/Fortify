# Fortify design system

## Product character

Fortify should feel calm, exact, and quietly capable. The interface prioritizes the next defensible action, not feature inventory. Visual polish must reinforce comprehension, authority boundaries, and evidence state.

## Information architecture

The authenticated product will expose no more than seven top-level destinations:

1. Home
2. Cases
3. Portfolio
4. Evidence
5. Partners
6. Reports
7. Administration

Role permissions change visible destinations and available actions. Milestone names, database entities, fixture switches, and integration implementation details are not navigation.

## Interaction principles

- Lead with the urgent case, requested action, owner, due date, and blocker.
- Reveal provenance, versions, and technical detail progressively without hiding them.
- Use explicit verbs for governed actions and a confirmation step that states authority and consequence.
- Preserve the user's place after mutations and announce status changes accessibly.
- Distinguish unavailable, insufficient, stale, contradictory, unreviewed, unverified, unsupported, expired, rejected, and permission-denied states.
- Never use color alone to communicate status.

## Foundations

Use a restrained neutral surface system, one functional accent, semantic status colors with text/icon reinforcement, a readable sans-serif UI face, a tabular numeral style for financial and evidence data, an 8-pixel spacing rhythm, and consistent focus rings. Motion is brief and functional and respects reduced-motion preferences.

Touch targets are at least 44 by 44 CSS pixels. Body text remains readable at 200% zoom. Layouts must not introduce document-width overflow at supported desktop, tablet, and mobile viewports.

## Core components

Build composable primitives for application shell, page header, command bar, tabs, disclosure, status/authority badge, field, table/list, timeline, evidence citation, source/version panel, empty/error/permission state, confirmation dialog, toast/live region, and document preview. Domain components compose these primitives; they do not fork new visual languages.

## Content rules

Use plain language and precise nouns. Avoid generic confidence claims, celebratory completion language, scores without an authoritative model, or labels that collapse workflow completion into external acceptance. Fixture content must be visibly synthetic and unavailable in production mode.

## Quality gates

Each converted journey requires keyboard operation, visible focus, semantic landmarks/headings, accessible names and descriptions, zero serious/critical Axe findings, desktop/tablet/mobile inspection, populated/loading/error/empty/insufficient/permission states, and evidence that every visible control works.

## Current implementation status

This specification is authoritative for convergence, but the existing global milestone CSS and large client workspaces have not yet been converted. That work begins only after C0 request/authority safety and C1 architecture boundaries are complete.
