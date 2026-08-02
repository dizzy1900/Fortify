"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Cloud,
  Database,
  FileJson,
  Fingerprint,
  Inbox,
  Link2,
  LoaderCircle,
  LockKeyhole,
  Mail,
  RefreshCw,
  RotateCcw,
  ServerCog,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

type Tab = "connections" | "sync" | "webhooks" | "catalog";
type Scenario =
  | "healthy"
  | "degraded"
  | "rate_limited"
  | "dead_letter"
  | "disconnected";
type Row = Record<string, unknown>;
type Workspace = {
  connections: Row[];
  events: Row[];
  schemas: Row[];
  jobs: Row[];
  attempts: Row[];
  receipts: Row[];
  endpoints: Row[];
  deliveries: Row[];
  healthChecks: Row[];
  providerCatalog: Array<{
    type: string;
    label: string;
    directions: readonly string[];
    resources: string[];
  }>;
  boundaries: {
    liveCredentialsAvailable: boolean;
    fixtureModeExplicit: boolean;
    inlineSecretsAllowed: boolean;
    signedWebhooksRequired: boolean;
    externalAcceptanceImplied: boolean;
    providerRecordsRequireHumanReview: boolean;
  };
};

const fixture: Workspace = {
  connections: [
    {
      id: "connection-graph",
      name: "Microsoft Graph renewal inbox",
      providerType: "microsoft_graph_email",
      providerKey: "fortify-fixture-microsoft-graph-email",
      providerVersion: "2026-07-graph-v1",
      connectionMode: "deterministic_fixture",
      status: "connected",
      capabilities: ["pull"],
      dataClasses: ["carrier_confidential_material", "property_specific_data"],
      pageSize: 50,
      rateLimitPerMinute: 30,
      lastHealthAt: "2026-08-02T12:01:00.000Z",
    },
    {
      id: "connection-epic",
      name: "Applied Epic compatible exchange",
      providerType: "applied_epic",
      providerKey: "fortify-fixture-applied-epic",
      providerVersion: "customer-schema-3",
      connectionMode: "deterministic_fixture",
      status: "configured",
      capabilities: ["pull", "push"],
      dataClasses: ["property_specific_data", "customer_specific_playbook"],
      pageSize: 100,
      rateLimitPerMinute: 60,
    },
    {
      id: "connection-model",
      name: "External model exchange",
      providerType: "external_model",
      providerKey: "fortify-fixture-model-boundary",
      providerVersion: "model-contract-v2",
      connectionMode: "deterministic_fixture",
      status: "degraded",
      capabilities: ["pull", "push"],
      dataClasses: ["model_provider_restricted"],
      pageSize: 25,
      rateLimitPerMinute: 20,
      lastHealthAt: "2026-08-02T11:57:00.000Z",
    },
  ],
  events: [
    { id: "event-2", connectionId: "connection-graph", eventType: "connected", previousStatus: "configured", nextStatus: "connected", reason: "Deterministic provider health verified; no live mailbox connected.", occurredAt: "2026-08-02T12:00:00.000Z" },
    { id: "event-1", connectionId: "connection-graph", eventType: "configured", previousStatus: null, nextStatus: "configured", reason: "Human-confirmed fixture configuration.", occurredAt: "2026-08-02T11:55:00.000Z" },
  ],
  schemas: [
    { id: "schema-graph-v2", connectionId: "connection-graph", versionNumber: 2, schemaKey: "fortify.graph-mail-intake", direction: "pull", resourceKinds: ["mail_message", "mail_attachment", "webhook:message.created"], sourceSchemaHash: "f58b10874507d71d19d0a7fa8a1c03604e5451a3de99fbd726d7878c6b66cdad", status: "active" },
    { id: "schema-epic-v3", connectionId: "connection-epic", versionNumber: 3, schemaKey: "customer.epic-renewal-exchange", direction: "bidirectional", resourceKinds: ["client", "property", "policy", "activity"], sourceSchemaHash: "955b9ba739fd1d1d80c388447443b368631ec71bb6c4e6092889155523850de3", status: "active" },
  ],
  jobs: [
    { id: "job-graph-page-2", connectionId: "connection-graph", resourceKind: "mail_message", direction: "pull", status: "succeeded", attemptCount: 1, maxAttempts: 3, cursorBefore: "page-1", requestedAt: "2026-08-02T12:04:00.000Z" },
    { id: "job-graph-page-1", connectionId: "connection-graph", resourceKind: "mail_message", direction: "pull", status: "succeeded", attemptCount: 2, maxAttempts: 3, cursorBefore: null, requestedAt: "2026-08-02T12:02:00.000Z" },
    { id: "job-model-retry", connectionId: "connection-model", resourceKind: "model_output", direction: "pull", status: "retry_scheduled", attemptCount: 1, maxAttempts: 3, cursorBefore: null, lastErrorCode: "provider_rate_limited", requestedAt: "2026-08-02T11:58:00.000Z" },
    { id: "job-epic-dead", connectionId: "connection-epic", resourceKind: "activity", direction: "push", status: "dead_letter", attemptCount: 3, maxAttempts: 3, lastErrorCode: "fixture_terminal_failure", requestedAt: "2026-08-02T11:40:00.000Z" },
  ],
  attempts: [
    { id: "attempt-graph-1a", jobId: "job-graph-page-1", attemptNumber: 1, status: "failed_retryable", providerKey: "fortify-fixture-microsoft-graph-email", providerVersion: "2026-07-graph-v1", errorCode: "fixture_rate_limited", rateLimitRemaining: 0 },
    { id: "attempt-graph-1b", jobId: "job-graph-page-1", attemptNumber: 2, status: "succeeded", providerKey: "fortify-fixture-microsoft-graph-email", providerVersion: "2026-07-graph-v1", recordsRead: 50, recordsWritten: 50, recordsRejected: 0, cursorAfter: "page-1", rateLimitRemaining: 949 },
    { id: "attempt-graph-2", jobId: "job-graph-page-2", attemptNumber: 1, status: "succeeded", providerKey: "fortify-fixture-microsoft-graph-email", providerVersion: "2026-07-graph-v1", recordsRead: 18, recordsWritten: 18, recordsRejected: 0, cursorAfter: null, rateLimitRemaining: 931 },
  ],
  receipts: [
    { id: "receipt-graph-1", jobId: "job-graph-page-1", receiptType: "pull_page", schemaVersion: "fortify.graph-mail-intake@2", cursorBefore: null, cursorAfter: "page-1", recordsRead: 50, recordsWritten: 50, recordsRejected: 0, payloadHash: "8eb81b1be35b879e4b407dfb6b768cfeff340270582bc0b8648ed31bf09afdea", sourceAuthority: "Fortify deterministic integration fixture", sourceReference: "fixture://microsoft_graph_email/mail_message?offset=0" },
    { id: "receipt-graph-2", jobId: "job-graph-page-2", receiptType: "pull_page", schemaVersion: "fortify.graph-mail-intake@2", cursorBefore: "page-1", cursorAfter: null, recordsRead: 18, recordsWritten: 18, recordsRejected: 0, payloadHash: "7e5cfa22e79b7f10f0f3e9992799af57b68ec5a1346ba38f27ad9754ef50ad52", sourceAuthority: "Fortify deterministic integration fixture", sourceReference: "fixture://microsoft_graph_email/mail_message?offset=50" },
  ],
  endpoints: [
    { id: "endpoint-graph", connectionId: "connection-graph", endpointKey: "graph-message-events", eventTypes: ["message.created", "message.updated"], signatureAlgorithm: "hmac_sha256", toleranceSeconds: 300, status: "active", lastRotatedAt: "2026-08-02T11:50:00.000Z" },
  ],
  deliveries: [
    { id: "delivery-webhook-1", endpointId: "endpoint-graph", syncJobId: "job-webhook-1", externalEventId: "graph-event-fixture-108", eventType: "message.created", signatureValid: true, bodySha256: "3970d17284845c64669ec157ed0d2d8caec85b3830cac45d3c1ac41fe635a12c", receivedAt: "2026-08-02T12:06:00.000Z" },
  ],
  healthChecks: [
    { id: "health-graph", connectionId: "connection-graph", status: "healthy", providerKey: "fortify-fixture-microsoft-graph-email", providerVersion: "2026-07-graph-v1", latencyMs: 0, rateLimitRemaining: 999, detail: "Deterministic provider fixture is available; no live system was contacted." },
    { id: "health-model", connectionId: "connection-model", status: "degraded", providerKey: "fortify-fixture-model-boundary", providerVersion: "model-contract-v2", latencyMs: 0, rateLimitRemaining: 0, detail: "Fixture degraded state exercises rate-limit handling; no model provider was contacted." },
  ],
  providerCatalog: [
    { type: "microsoft_graph_email", label: "Microsoft Graph email intake", directions: ["pull"], resources: ["mail message", "mail attachment"] },
    { type: "gmail_email", label: "Gmail email intake", directions: ["pull"], resources: ["mail message", "mail attachment"] },
    { type: "google_drive", label: "Google Drive evidence intake", directions: ["pull"], resources: ["drive file"] },
    { type: "generic_ams", label: "Generic AMS exchange", directions: ["pull", "push"], resources: ["client", "property", "policy", "renewal"] },
    { type: "applied_epic", label: "Applied Epic compatible exchange", directions: ["pull", "push"], resources: ["client", "property", "policy", "activity"] },
    { type: "ams360", label: "AMS360 compatible exchange", directions: ["pull", "push"], resources: ["client", "property", "policy", "activity"] },
    { type: "property_management", label: "Property-management boundary", directions: ["pull", "push"], resources: ["community", "building", "unit summary", "work order"] },
    { type: "external_model", label: "External model boundary", directions: ["pull", "push"], resources: ["model input", "model output"] },
    { type: "verifier", label: "Independent verifier boundary", directions: ["pull", "push"], resources: ["assignment", "finding", "certificate"] },
  ],
  boundaries: {
    liveCredentialsAvailable: false,
    fixtureModeExplicit: true,
    inlineSecretsAllowed: false,
    signedWebhooksRequired: true,
    externalAcceptanceImplied: false,
    providerRecordsRequireHumanReview: true,
  },
};

const label = (value: unknown) =>
  String(value ?? "Unavailable")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export function IntegrationOperationsWorkspace({
  mode,
}: {
  mode: "sandbox" | "production";
}) {
  const [workspace, setWorkspace] = useState<Workspace | null>(
    mode === "sandbox" ? fixture : null,
  );
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    mode === "sandbox" ? "ready" : "loading",
  );
  const [tab, setTab] = useState<Tab>("connections");
  const [scenario, setScenario] = useState<Scenario>("healthy");
  const [selectedConnectionId, setSelectedConnectionId] = useState("connection-graph");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (mode !== "production") return;
    const controller = new AbortController();
    fetch("/api/production/integrations/workspace", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load integration operations.");
        return response.json() as Promise<Workspace>;
      })
      .then((data) => {
        setWorkspace(data);
        setSelectedConnectionId(String(data.connections[0]?.id ?? ""));
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if ((error as Error).name !== "AbortError") setStatus("error");
      });
    return () => controller.abort();
  }, [mode]);

  if (status === "loading")
    return (
      <section className="integration-state">
        <LoaderCircle className="spin" />
        <h1>Loading integration operations</h1>
        <p>Reading governed connections, schema pins, sync custody, webhooks, and health history.</p>
      </section>
    );
  if (status === "error")
    return (
      <section className="integration-state error">
        <AlertTriangle />
        <h1>Integration operations unavailable</h1>
        <p>No external connection, import, delivery, or provider health was inferred.</p>
        <button className="button primary" onClick={() => location.reload()}>Retry</button>
      </section>
    );
  if (!workspace || !workspace.connections.length)
    return (
      <section className="integration-state">
        <Inbox />
        <h1>No integration connection</h1>
        <p>Configure a version-pinned provider boundary with a scoped credential reference before running a sync.</p>
      </section>
    );

  const selected =
    workspace.connections.find((item) => item.id === selectedConnectionId) ??
    workspace.connections[0];
  const activeSchema = workspace.schemas.find(
    (item) => item.connectionId === selected.id && item.status === "active",
  );
  const scenarioState = {
    healthy: {
      tone: "pass",
      Icon: CheckCircle2,
      title: "Provider fixture healthy",
      detail: "The pinned deterministic provider responded. No live mailbox, AMS, model, or verifier system was contacted.",
    },
    degraded: {
      tone: "warn",
      Icon: AlertTriangle,
      title: "Provider degraded",
      detail: "Health is retained separately from connection authority; no unavailable record is silently treated as synchronized.",
    },
    rate_limited: {
      tone: "warn",
      Icon: Clock3,
      title: "Rate limit respected",
      detail: "The failed attempt is immutable and the next retry remains unavailable until its provider backoff window.",
    },
    dead_letter: {
      tone: "stop",
      Icon: XCircle,
      title: "Sync dead-lettered",
      detail: "All attempts remain visible. Replay creates a successor job and never erases the failed request.",
    },
    disconnected: {
      tone: "stop",
      Icon: Link2,
      title: "Live credential unavailable",
      detail: "The production provider remains disconnected; fixture health cannot establish a live connection.",
    },
  } as const;
  const currentState = scenarioState[scenario];
  const GateIcon = currentState.Icon;
  const chooseTab = (next: Tab) => {
    setTab(next);
    setNotice(`${label(next)} operations opened.`);
  };
  const replay = () => {
    setScenario("healthy");
    setNotice("Append-only replay job queued; the dead-letter and its three attempts remain preserved.");
  };

  return (
    <div className="integration-operations" data-testid="integration-operations-workspace">
      <header className="integration-hero">
        <div>
          <span className="eyebrow">M11 · production integration control plane</span>
          <h1>Connect deliberately. Replay without losing custody.</h1>
          <p>Version-pinned provider boundaries, scoped credential references, signed webhook intake, durable pagination, exact receipts, and honest degraded states.</p>
        </div>
        <div className="integration-hero-mark">
          <ServerCog />
          <span>Provider boundaries</span>
          <strong>{workspace.providerCatalog.length} versionable adapters</strong>
          <small>0 live credentials · explicit fixture mode</small>
        </div>
      </header>

      <section className="integration-boundary">
        <LockKeyhole />
        <div>
          <strong>Credentials referenced—not stored in configuration</strong>
          <span>Provider output is staged with exact provenance and requires governed human review before authoritative records are created.</span>
        </div>
        <b>{mode === "sandbox" ? "Deterministic fixtures" : "Production tenant"}</b>
      </section>

      <section className={`integration-gate ${currentState.tone}`} aria-live="polite">
        <div>
          <GateIcon />
          <div>
            <span>Operational state</span>
            <strong>{currentState.title}</strong>
            <p>{currentState.detail}</p>
          </div>
        </div>
        <label>
          <span>Inspect control state</span>
          <select
            aria-label="Inspect integration control state"
            value={scenario}
            onChange={(event) => setScenario(event.target.value as Scenario)}
          >
            <option value="healthy">Healthy fixture</option>
            <option value="degraded">Provider degraded</option>
            <option value="rate_limited">Rate limited</option>
            <option value="dead_letter">Dead letter</option>
            <option value="disconnected">Live disconnected</option>
          </select>
        </label>
      </section>

      <section className="integration-metrics">
        <div><Link2 /><span>Connections</span><strong>{workspace.connections.length}</strong><small>1 connected fixture</small></div>
        <div><RefreshCw /><span>Sync custody</span><strong>{workspace.receipts.length} receipts</strong><small>{workspace.attempts.length} immutable attempts</small></div>
        <div><ShieldCheck /><span>Webhooks</span><strong>{workspace.deliveries.length} verified</strong><small>HMAC + replay key</small></div>
        <div><Activity /><span>Live providers</span><strong>Unavailable</strong><small>credential-dependent gate</small></div>
      </section>

      <nav className="integration-tabs" aria-label="Integration operation views">
        <button className={tab === "connections" ? "active" : ""} aria-pressed={tab === "connections"} onClick={() => chooseTab("connections")}><Link2 />Connections</button>
        <button className={tab === "sync" ? "active" : ""} aria-pressed={tab === "sync"} onClick={() => chooseTab("sync")}><RefreshCw />Sync & receipts</button>
        <button className={tab === "webhooks" ? "active" : ""} aria-pressed={tab === "webhooks"} onClick={() => chooseTab("webhooks")}><ShieldCheck />Signed webhooks</button>
        <button className={tab === "catalog" ? "active" : ""} aria-pressed={tab === "catalog"} onClick={() => chooseTab("catalog")}><ServerCog />Provider catalog</button>
      </nav>

      {tab === "connections" ? (
        <section className="integration-layout">
          <aside className="integration-connection-list">
            <span className="eyebrow">Governed connections</span>
            <h2>Provider and version remain pinned</h2>
            {workspace.connections.map((connection) => (
              <button
                key={String(connection.id)}
                className={selected.id === connection.id ? "active" : ""}
                onClick={() => setSelectedConnectionId(String(connection.id))}
              >
                <div><strong>{String(connection.name)}</strong><span>{label(connection.providerType)}</span></div>
                <b>{label(connection.status)}</b>
              </button>
            ))}
          </aside>
          <article className="integration-panel connection-detail">
            <div className="integration-panel-head"><div><span className="eyebrow">Selected connection</span><h2>{String(selected.name)}</h2></div><Cloud /></div>
            <p>Provider availability and connection authority remain separate. This fixture exercises the exact contract without claiming a live external session.</p>
            <dl>
              <div><dt>Provider pin</dt><dd>{String(selected.providerKey)}@{String(selected.providerVersion)}</dd></div>
              <div><dt>Mode</dt><dd>{label(selected.connectionMode)}</dd></div>
              <div><dt>Capabilities</dt><dd>{(selected.capabilities as string[]).join(" · ")}</dd></div>
              <div><dt>Data classes</dt><dd>{(selected.dataClasses as string[]).map(label).join(" · ")}</dd></div>
              <div><dt>Page limit</dt><dd>{String(selected.pageSize)} records</dd></div>
              <div><dt>Rate limit</dt><dd>{String(selected.rateLimitPerMinute)} / minute</dd></div>
            </dl>
            <button className="button primary" onClick={() => { setScenario("healthy"); setNotice("Immutable fixture health check recorded; no live provider was contacted."); }}>Run health check</button>
          </article>
          <article className="integration-panel schema-detail">
            <div className="integration-panel-head"><div><span className="eyebrow">Active mapping schema</span><h2>{activeSchema ? `${String(activeSchema.schemaKey)} · v${String(activeSchema.versionNumber)}` : "No active schema"}</h2></div><FileJson /></div>
            {activeSchema ? <><div className="schema-hash"><Fingerprint /><div><span>Exact mapping hash</span><code>{String(activeSchema.sourceSchemaHash)}</code></div></div><div className="resource-tags">{(activeSchema.resourceKinds as string[]).map((resource) => <span key={resource}>{label(resource)}</span>)}</div><p>Successor schemas retain immediate lineage. Prior mappings are superseded, never silently overwritten.</p></> : <div className="integration-inline-empty"><AlertTriangle />Configure a versioned field mapping before synchronization.</div>}
          </article>
        </section>
      ) : null}

      {tab === "sync" ? (
        <section className="integration-sync-layout">
          <article className="integration-panel sync-flow">
            <div className="integration-panel-head"><div><span className="eyebrow">Durable pagination</span><h2>Cursor → attempt → exact receipt</h2></div><RefreshCw /></div>
            <div className="cursor-chain"><div><span>Page 1</span><strong>50 staged</strong><small>cursor: none</small></div><ArrowRight /><div><span>Receipt</span><strong>SHA-256 bound</strong><small>cursor: page-1</small></div><ArrowRight /><div><span>Page 2</span><strong>18 staged</strong><small>cursor: complete</small></div></div>
            <p>Each page has its own idempotency key, provider/version pin, rate-limit readback, and encrypted exact-byte receipt.</p>
            <button className="button" onClick={() => setNotice("Next-page job inspected; cursor and request hash are immutable.")}>Inspect pagination lineage</button>
          </article>
          <article className="integration-panel attempt-ledger">
            <span className="eyebrow">Attempt history</span>
            <h2>Failures remain evidence</h2>
            {workspace.attempts.map((attempt) => (
              <div key={String(attempt.id)} className={String(attempt.status)}>
                {attempt.status === "succeeded" ? <CheckCircle2 /> : <Clock3 />}
                <div><span>Attempt {String(attempt.attemptNumber)} · {label(attempt.status)}</span><strong>{String(attempt.providerKey)}@{String(attempt.providerVersion)}</strong><small>{attempt.errorCode ? label(attempt.errorCode) : `${String(attempt.recordsWritten)} records staged · ${String(attempt.rateLimitRemaining)} remaining`}</small></div>
              </div>
            ))}
          </article>
          <article className="integration-panel receipt-register">
            <span className="eyebrow">Exact sync receipts</span>
            <h2>Read back before registration</h2>
            {workspace.receipts.map((receipt) => (
              <div key={String(receipt.id)}><Database /><div><span>{label(receipt.receiptType)} · {String(receipt.schemaVersion)}</span><strong>{String(receipt.recordsRead)} read · {String(receipt.recordsWritten)} staged</strong><code>{String(receipt.payloadHash)}</code><small>{String(receipt.sourceReference)}</small></div></div>
            ))}
          </article>
          <article className="integration-panel dead-letter-panel">
            <AlertTriangle />
            <span className="eyebrow">Dead-letter control</span>
            <h2>Replay appends; it does not reset</h2>
            <p>Three failed Applied Epic fixture attempts remain immutable. A human-confirmed replay preserves the exact request hash and points to the failed predecessor.</p>
            <button className="button primary" onClick={replay}><RotateCcw />Queue append-only replay</button>
          </article>
        </section>
      ) : null}

      {tab === "webhooks" ? (
        <section className="integration-webhook-layout">
          <article className="integration-panel webhook-contract">
            <div className="integration-panel-head"><div><span className="eyebrow">Inbound contract</span><h2>Verify before quarantine</h2></div><ShieldCheck /></div>
            <dl>
              <div><dt>Endpoint</dt><dd>{String(workspace.endpoints[0]?.endpointKey)}</dd></div>
              <div><dt>Signature</dt><dd>HMAC SHA-256</dd></div>
              <div><dt>Replay window</dt><dd>{String(workspace.endpoints[0]?.toleranceSeconds)} seconds</dd></div>
              <div><dt>Secret handling</dt><dd>Scoped credential reference</dd></div>
            </dl>
            <div className="webhook-sequence"><span>Raw bytes</span><ArrowRight /><span>Timestamp</span><ArrowRight /><span>HMAC</span><ArrowRight /><span>Quarantine</span><ArrowRight /><span>Durable job</span></div>
            <p>An accepted signature proves message authenticity under the configured secret. It does not replace malware scanning or human review.</p>
          </article>
          <article className="integration-panel webhook-custody">
            <span className="eyebrow">Verified delivery custody</span>
            <h2>{String(workspace.deliveries[0]?.externalEventId)}</h2>
            <div className="signature-proof"><Fingerprint /><div><span>Exact body SHA-256</span><code>{String(workspace.deliveries[0]?.bodySha256)}</code><strong>Signature valid · bytes quarantined</strong></div></div>
            <button className="button" onClick={() => setNotice("Duplicate external event rejected by the endpoint-scoped replay key.")}>Test duplicate event</button>
          </article>
          <article className="integration-panel webhook-stop">
            <XCircle />
            <div><span className="eyebrow">Fail-closed examples</span><h2>No signature, no intake</h2><ul><li>Invalid HMAC creates no delivery or job.</li><li>Stale timestamps fail the replay window.</li><li>Unlisted event types remain unavailable.</li><li>Revoked credentials disable intake.</li></ul></div>
          </article>
        </section>
      ) : null}

      {tab === "catalog" ? (
        <section className="provider-catalog">
          {workspace.providerCatalog.map((provider, index) => (
            <article key={provider.type}>
              <div>{index < 3 ? <Mail /> : index < 7 ? <Database /> : <ServerCog />}<span>{String(index + 1).padStart(2, "0")}</span></div>
              <h2>{provider.label}</h2>
              <p>{provider.resources.map(label).join(" · ")}</p>
              <footer><b>{provider.directions.join(" / ")}</b><span>{workspace.connections.some((connection) => connection.providerType === provider.type) ? "Fixture configured" : "Boundary only"}</span></footer>
            </article>
          ))}
          <div className="catalog-boundary"><LockKeyhole /><div><strong>Credential-dependent live gate</strong><span>No Graph, Gmail, Drive, AMS, property, model, or verifier credential is configured. Adapter code and fixtures are not deployment validation.</span></div></div>
        </section>
      ) : null}

      <footer className="integration-footer">
        <ShieldCheck />
        <strong>Provider output is candidate input</strong>
        <span>No connection, receipt, webhook, model response, verifier result, or AMS export implies external acceptance or authority.</span>
      </footer>
      <p className="sr-only" role="status" aria-live="polite">{notice}</p>
    </div>
  );
}
