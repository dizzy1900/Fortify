# Incident response

Severity 1 covers suspected cross-tenant disclosure, credential/key compromise, destructive corruption, or broad outage. Severity 2 covers material workflow/provider degradation without confirmed disclosure. Any team member may declare an incident.

1. Open an incident record with UTC times, commander, scope, systems, and evidence-preservation owner.
2. Contain with the smallest reversible action: revoke sessions/credentials/grants, disable one adapter or webhook, isolate a tenant path, or roll back an image. Do not destroy logs or evidence.
3. Preserve request ids, immutable audit/receipt hashes, image and migration digests, provider event ids, database logs, and object versions. Never paste secrets or customer bytes into chat/tickets.
4. Assess affected tenants, data classes, jurisdictions, contractual notice duties, and whether counsel/privacy leadership must decide notification. Fortify does not itself determine legal obligations.
5. Eradicate and recover through reviewed changes, fresh credentials, integrity readback, readiness checks, queue reconciliation, and an isolated restore when corruption is possible.
6. Record customer-safe facts, known unknowns, decisions, and updates. Do not speculate about insurance or security outcomes.
7. Complete a blameless review within five business days with root cause, detection gap, corrective owners/dates, and validation evidence.

Contacts, paging routes, cyber-insurance contacts, counsel, and regulator/customer notification trees are deployment-owner inputs and must be populated before launch.
