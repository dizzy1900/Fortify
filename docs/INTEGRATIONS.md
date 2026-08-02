# Governed production integrations

Fortify integrations move candidate records across version-pinned provider boundaries. They do not make imported data authoritative, establish provider availability, or imply external acceptance. Human review remains required wherever provider output would create or change a governed domain record.

## Provider boundaries

The M11 catalog exposes nine explicit adapter contracts:

| Boundary | Direction | Versioned resources | Local evidence |
|---|---|---|---|
| Microsoft Graph email | Pull | Message and attachment | Deterministic pagination, retry/rate-limit, exact-receipt, and health fixture |
| Gmail email | Pull | Message and attachment | Interface and unavailable-live adapter |
| Google Drive | Pull | File | Interface and unavailable-live adapter |
| Generic AMS | Pull/push | Client, property, policy, renewal | Interface and deterministic import-compatible fixture boundary |
| Applied Epic compatible | Pull/push | Client, property, policy, activity | Interface and deterministic fixture; not a certified vendor integration |
| AMS360 compatible | Pull/push | Client, property, policy, activity | Interface and deterministic fixture; not a certified vendor integration |
| Property management | Pull/push | Community, building, unit summary, work order | Interface and unavailable-live adapter |
| External model | Pull/push | Model input and output | Interface and deterministic fixture; model authority remains external |
| Independent verifier | Pull/push | Assignment, finding, certificate | Interface and unavailable-live adapter; Fortify is not the verifier |

Microsoft Graph is the reference intake contract. The deterministic fixture proves stable provider/version identity, bounded page size, cursor progression, provider source references, retryable `429`-style failures, retry-after handling, and exact receipt custody. Gmail and Drive intentionally remain separate provider types rather than being inferred from the Graph implementation.

## Connection and credential boundary

`integration_connections` stores provider type, key, exact version, fixture/live mode, non-secret configuration, capability and data-class allowlists, page/rate limits, owner, and last health state. Inline fields whose names contain secret, token, password, API key, or credential are rejected recursively.

Live connections refer to a scoped `api_credentials` record. A credential resolver supplies the secret only at execution time; the integration configuration and sync receipts never persist it. Provider type, provider key, provider version, and fixture/live mode must match the registered adapter exactly. A fixture health response cannot connect a live configuration.

Connection state changes are human-confirmed and appended to `integration_connection_events`. Prior events remain immutable.

## Schema and synchronization

Each active `integration_schema_versions` row pins one connection, direction, resource kinds, exact mapping JSON, mapping hash, author, and immediate predecessor. Activating a successor supersedes the prior schema rather than editing it.

A sync job stores the exact request payload and SHA-256, idempotency key, provider/schema pins, direction, resource, page size, cursor, attempt budget, retry availability, and optional dead-letter predecessor. One execution processes exactly one pull page or push batch:

1. Resolve the tenant, connected boundary, active schema, provider version, and scoped credential.
2. Claim the durable job with a worker lease.
3. Call the provider for one bounded page or batch.
4. Store an immutable attempt with counts, cursors, rate-limit readback, response hash, and error evidence.
5. Write the exact JSON receipt through the object-storage adapter and independently verify its size and SHA-256.
6. Register the successful receipt only after exact-byte readback.

Retryable errors preserve the failed attempt and schedule the next eligible time. Exhaustion creates a dead letter. Manual replay requires human confirmation and appends a successor job with the same request hash; it never resets or deletes the failed job or attempts.

## Signed webhook intake

Public webhook endpoint keys are globally unique opaque identifiers and are coupled to one tenant connection plus one scoped API credential. Intake requires:

- an active endpoint, connected provider, and unrevoked credential;
- an allowlisted event type and non-empty external event identifier;
- an HMAC-SHA-256 signature over the exact timestamp and body bytes;
- a timestamp inside the configured replay tolerance;
- a valid JSON object body between 1 byte and 5 MiB.

Signature verification happens before storage. Verified bytes are independently read back and registered as `quarantined` with scan state `pending`, then linked to one durable sync job. The endpoint/external-event pair is idempotent. Invalid signatures, stale timestamps, revoked credentials, disallowed events, invalid JSON, or missing active schemas create no delivery or job.

## Health and live gates

Provider health is append-only evidence separate from connection authority. Health retains provider key/version, latency, rate-limit readback, detail, and whether the check was a deterministic fixture. Degraded and disconnected states remain explicit in the service and `/integrations` administrator workspace.

No live Graph, Gmail, Drive, AMS, property-management, model, or verifier credential is configured in this repository. Production runtime registers unavailable adapters and an unavailable credential resolver until an operator supplies reviewed provider implementations and secret-store access. Required live evidence includes provider registration, scoped credentials, network/egress policy, data rights, staging contract runs, rate-limit behavior, replay testing, schema-owner approval, monitoring, and rollback. Local fixtures are not deployment or external validation.

## API and user interface

Authenticated production routes expose tenant workspace readback, connection configuration/state/health, schema versioning, sync queue/run/replay, and webhook endpoint administration. The public webhook route is authenticated by the scoped HMAC contract rather than a Fortify browser session.

`/integrations` provides populated, loading, error, and empty states plus explicit healthy, degraded, rate-limited, dead-letter, and disconnected examples. Every visible control changes an inspectable state or records a status message. The sandbox uses deterministic non-persisting fixtures; production reads only the normalized tenant data plane.

## Validation boundary

Local tests cover all nine catalog boundaries, secret rejection, provider/mode/version matching, Graph pagination, idempotency, exact encrypted receipt readback, retry/backoff/dead-letter/replay, scoped HMAC intake, duplicate replay, cross-tenant database attacks, health history, and desktop/tablet/mobile administration flows. These tests do not prove a live vendor API, credential, webhook sender, customer schema, throughput, provider SLA, external semantics, or deployment security.
