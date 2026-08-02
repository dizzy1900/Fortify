"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  DatabaseZap,
  FileCheck2,
  FileKey2,
  FileText,
  Fingerprint,
  FolderArchive,
  History,
  LoaderCircle,
  LockKeyhole,
  MailPlus,
  PackageCheck,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type RuntimeMode = "sandbox" | "production";
type Tab = "case" | "notice" | "requests" | "packet";
type NoticeFact = {
  id: string;
  key: string;
  value: string;
  versionNumber: number;
  confirmedBy: string;
  confirmedAt: string;
  sourcePassageId: string | null;
};
type RequestedItem = {
  evidenceType: string;
  label: string;
  required: boolean;
  scopeType: string;
  scopeReference?: string;
  guidance: string;
};
type EvidenceRequest = {
  id: string;
  recipientType: string;
  recipientLabel: string;
  status: string;
  issuedAt: string | null;
  expiresAt: string | null;
  externalAccessState: string;
  version: {
    id: string;
    versionNumber: number;
    purpose: string;
    instructions: string;
    dueAt: string;
    requestedItems: RequestedItem[];
    confirmedBy: string;
    confirmedAt: string;
  } | null;
};
type Submission = {
  id: string;
  purpose: string;
  status: string;
  version: {
    id: string;
    versionNumber: number;
    confirmedBy: string | null;
    confirmedAt: string | null;
    manifestHash: string | null;
  } | null;
  artifacts: Array<{
    id: string;
    artifactType: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    generatedAt: string;
  }>;
};
type BrokerageCase = {
  id: string;
  title: string;
  status: string;
  caseType: string;
  peril: string;
  jurisdiction: string;
  propertyClass: string;
  renewalDate: string;
  appealDeadline: string | null;
  client: { id: string; name: string };
  community: { id: string; name: string };
  property: {
    id: string;
    name: string;
    unitCount: number | null;
    buildingCount: number | null;
    address: string;
  };
  policy: {
    id: string;
    policyNumber: string;
    effectiveDate: string | null;
    expirationDate: string;
    marketName: string | null;
    sourceAuthority: string;
  };
  notice: {
    id: string;
    filename: string;
    sha256: string | null;
    receivedAt: string;
    facts: NoticeFact[];
    missingRequiredFacts: string[];
  } | null;
  evidenceRequests: EvidenceRequest[];
  evidence: Array<{
    itemId: string;
    versionId: string;
    evidenceType: string;
    filename: string;
    sha256: string;
    sourceType: string;
    scopeType: string;
    scopeReference: string | null;
    reviewStatus: string;
  }>;
  submissions: Submission[];
  gates: {
    noticeFactsConfirmed: boolean;
    evidenceRequestRecorded: boolean;
    openContradictionCount: number;
    packetGenerated: boolean;
  };
};
type Workspace = {
  organization: {
    id: string;
    name: string;
    environment: string;
    synthetic: boolean;
  };
  cases: BrokerageCase[];
};

const fixtureFacts: NoticeFact[] = [
  ["market", "Fictional California Property Market"],
  ["policy", "FIX-CA-2027-001"],
  ["noticeDate", "2026-08-01"],
  ["deadline", "2026-09-15"],
  ["requiredEvidence", "Current roof schedule and building-level defensible-space record"],
].map(([key, value], index) => ({
  id: `fixture-fact-${index + 1}`,
  key,
  value,
  versionNumber: 1,
  confirmedBy: "fixture:maya-chen",
  confirmedAt: "2026-08-01T12:20:00.000Z",
  sourcePassageId: `fixture-passage-${index + 1}`,
}));

const fixtureRequest: EvidenceRequest = {
  id: "request-sierra-fixture",
  recipientType: "property_manager",
  recipientLabel: "Fictional Sierra Vista property manager",
  status: "draft",
  issuedAt: null,
  expiresAt: null,
  externalAccessState: "off_platform_delivery_not_verified",
  version: {
    id: "request-sierra-fixture-v1",
    versionNumber: 1,
    purpose: "Collect scoped roof evidence for the 2027 renewal",
    instructions:
      "Upload the current schedule and identify the exact buildings represented.",
    dueAt: "2026-08-20T17:00:00.000Z",
    requestedItems: [
      {
        evidenceType: "roof_schedule",
        label: "Current roof schedule",
        required: true,
        scopeType: "community",
        scopeReference: "community-ca-fixture-sierra",
        guidance: "Include building labels, dates, and source organization.",
      },
    ],
    confirmedBy: "fixture:maya-chen",
    confirmedAt: "2026-08-01T12:25:00.000Z",
  },
};

const fixtureWorkspace: Workspace = {
  organization: {
    id: "org-fortify-california-fixture",
    name: "Fictional Pacific Resilience Brokerage",
    environment: "sandbox",
    synthetic: true,
  },
  cases: [
    {
      id: "case-sierra-renewal-fixture",
      title: "Fictional Sierra Vista 2027 renewal",
      status: "evidence_collection",
      caseType: "renewal",
      peril: "wildfire",
      jurisdiction: "US-CA",
      propertyClass: "condominium",
      renewalDate: "2027-01-01",
      appealDeadline: "2026-09-15",
      client: {
        id: "client-california-fixture",
        name: "Fictional Sierra Vista Association",
      },
      community: {
        id: "community-ca-fixture-sierra",
        name: "Fictional Sierra Vista Condominiums",
      },
      property: {
        id: "property-ca-fixture-sierra-vista",
        name: "Fictional Sierra Vista Condominiums",
        unitCount: 48,
        buildingCount: 3,
        address: "100 Fictional Ridge Drive, Nevada City, CA, 95959",
      },
      policy: {
        id: "policy-sierra-fixture",
        policyNumber: "FIX-CA-2027-001",
        effectiveDate: "2026-01-01",
        expirationDate: "2027-01-01",
        marketName: "Fictional California Property Market",
        sourceAuthority: "broker-confirmed fixture",
      },
      notice: {
        id: "notice-sierra-fixture",
        filename: "fictional-renewal-notice.txt",
        sha256: "f34b3e5f4a6a0321c7e5d40d335978cc354037105716af15535add698c59f501",
        receivedAt: "2026-08-01T12:10:00.000Z",
        facts: fixtureFacts,
        missingRequiredFacts: [],
      },
      evidenceRequests: [fixtureRequest],
      evidence: [
        {
          itemId: "evidence-item-roof-fixture",
          versionId: "evidence-version-roof-fixture-v1",
          evidenceType: "roof_schedule",
          filename: "fictional-roof-schedule.pdf",
          sha256: "94aa8d24c5a112c159640f940924fcf1e8e9c940747097327128f9647013cd96",
          sourceType: "property_manager_upload",
          scopeType: "community",
          scopeReference: "community-ca-fixture-sierra",
          reviewStatus: "unreviewed",
        },
      ],
      submissions: [],
      gates: {
        noticeFactsConfirmed: true,
        evidenceRequestRecorded: true,
        openContradictionCount: 0,
        packetGenerated: false,
      },
    },
  ],
};

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function shortHash(value: string | null) {
  return value ? `${value.slice(0, 12)}…${value.slice(-8)}` : "Unavailable";
}

async function responseJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || "The request failed closed.");
  return body;
}

export function BrokerageCaseWorkspace({ mode }: { mode: RuntimeMode }) {
  const sandbox = mode === "sandbox";
  const [workspace, setWorkspace] = useState<Workspace | null>(
    sandbox ? fixtureWorkspace : null,
  );
  const [selectedCaseId, setSelectedCaseId] = useState(
    sandbox ? fixtureWorkspace.cases[0].id : "",
  );
  const [tab, setTab] = useState<Tab>("case");
  const [loading, setLoading] = useState(!sandbox);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [recipientType, setRecipientType] = useState("property_manager");
  const [recipientLabel, setRecipientLabel] = useState(
    "Fictional Sierra Vista property manager",
  );
  const [requestPurpose, setRequestPurpose] = useState(
    "Collect scoped roof evidence for the 2027 renewal",
  );
  const [requestInstructions, setRequestInstructions] = useState(
    "Upload the current schedule and identify the exact buildings represented.",
  );
  const [requestDueAt, setRequestDueAt] = useState("2026-08-20");
  const [requestConfirmed, setRequestConfirmed] = useState(false);
  const [packetPurpose, setPacketPurpose] = useState(
    "Carrier renewal evidence review",
  );
  const [letter, setLetter] = useState(
    "Please review the enclosed human-confirmed property evidence for the fictional 2027 renewal. The packet preserves unresolved caveats and does not imply an insurance, pricing, model, verification, or funding outcome.",
  );
  const [packetConfirmed, setPacketConfirmed] = useState(false);

  const selectedCase = useMemo(
    () =>
      workspace?.cases.find((item) => item.id === selectedCaseId) ??
      workspace?.cases[0] ??
      null,
    [selectedCaseId, workspace],
  );

  const refresh = async () => {
    if (sandbox) return;
    setLoading(true);
    setError(null);
    try {
      const next = await responseJson<Workspace>(
        await fetch("/api/production/brokerage/workspace", { cache: "no-store" }),
      );
      setWorkspace(next);
      setSelectedCaseId((current) =>
        next.cases.some((item) => item.id === current)
          ? current
          : next.cases[0]?.id ?? "",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The brokerage workspace could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sandbox) return;
    let cancelled = false;
    void fetch("/api/production/brokerage/workspace", { cache: "no-store" })
      .then((response) => responseJson<Workspace>(response))
      .then((next) => {
        if (cancelled) return;
        setWorkspace(next);
        setSelectedCaseId(next.cases[0]?.id ?? "");
      })
      .catch((caught: unknown) => {
        if (!cancelled)
          setError(
            caught instanceof Error
              ? caught.message
              : "The brokerage workspace could not be loaded.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sandbox]);

  const replaceCase = (updated: BrokerageCase) => {
    setWorkspace((current) =>
      current
        ? {
            ...current,
            cases: current.cases.map((item) =>
              item.id === updated.id ? updated : item,
            ),
          }
        : current,
    );
  };

  const createRequest = async () => {
    if (!selectedCase) return;
    setPending("create-request");
    setError(null);
    setNotice(null);
    try {
      if (sandbox) {
        const id = `fixture-request-${selectedCase.evidenceRequests.length + 1}`;
        replaceCase({
          ...selectedCase,
          evidenceRequests: [
            {
              id,
              recipientType,
              recipientLabel: recipientLabel.trim(),
              status: "draft",
              issuedAt: null,
              expiresAt: null,
              externalAccessState: "off_platform_delivery_not_verified",
              version: {
                id: `${id}-v1`,
                versionNumber: 1,
                purpose: requestPurpose.trim(),
                instructions: requestInstructions.trim(),
                dueAt: `${requestDueAt}T17:00:00.000Z`,
                requestedItems: [
                  {
                    evidenceType: "roof_schedule",
                    label: "Current roof schedule",
                    required: true,
                    scopeType: "community",
                    scopeReference: selectedCase.community.id,
                    guidance:
                      "Include building labels, dates, and source organization.",
                  },
                ],
                confirmedBy: "fixture:maya-chen",
                confirmedAt: "2026-08-01T12:30:00.000Z",
              },
            },
            ...selectedCase.evidenceRequests,
          ],
          gates: { ...selectedCase.gates, evidenceRequestRecorded: true },
        });
      } else {
        await responseJson(
          await fetch("/api/production/brokerage/evidence-requests", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              idempotencyKey: crypto.randomUUID(),
              caseId: selectedCase.id,
              recipientType,
              recipientLabel: recipientLabel.trim(),
              purpose: requestPurpose.trim(),
              instructions: requestInstructions.trim(),
              dueAt: `${requestDueAt}T17:00:00.000Z`,
              requestedItems: [
                {
                  evidenceType: "roof_schedule",
                  label: "Current roof schedule",
                  required: true,
                  scopeType: "community",
                  scopeReference: selectedCase.community.id,
                  guidance:
                    "Include building labels, dates, and source organization.",
                },
              ],
              humanConfirmation: requestConfirmed,
            }),
          }),
        );
        await refresh();
      }
      setRequestConfirmed(false);
      setNotice(
        "The human-confirmed request draft was recorded as an immutable version.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request creation failed.");
    } finally {
      setPending(null);
    }
  };

  const issueRequest = async (request: EvidenceRequest) => {
    if (!selectedCase) return;
    setPending(request.id);
    setError(null);
    setNotice(null);
    try {
      if (sandbox) {
        replaceCase({
          ...selectedCase,
          evidenceRequests: selectedCase.evidenceRequests.map((item) =>
            item.id === request.id
              ? {
                  ...item,
                  status: "issued",
                  issuedAt: "2026-08-01T12:35:00.000Z",
                  expiresAt: "2026-08-21T17:00:00.000Z",
                }
              : item,
          ),
        });
      } else {
        await responseJson(
          await fetch(
            `/api/production/brokerage/evidence-requests/${request.id}/issue`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                expiresAt:
                  request.version?.dueAt ?? `${requestDueAt}T23:59:59.000Z`,
                humanConfirmation: true,
              }),
            },
          ),
        );
        await refresh();
      }
      setNotice(
        "Request status changed to issued. Delivery remains separate from this workflow record.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request issue failed.");
    } finally {
      setPending(null);
    }
  };

  const generatePacket = async () => {
    if (!selectedCase) return;
    setPending("generate-packet");
    setError(null);
    setNotice(null);
    try {
      if (sandbox) {
        const generatedAt = "2026-08-01T12:40:00.000Z";
        const submission: Submission = {
          id: `fixture-submission-${selectedCase.submissions.length + 1}`,
          purpose: packetPurpose.trim(),
          status: "confirmed",
          version: {
            id: `fixture-submission-version-${selectedCase.submissions.length + 1}`,
            versionNumber: 1,
            confirmedBy: "fixture:maya-chen",
            confirmedAt: generatedAt,
            manifestHash:
              "47c5de9b8c2da8dfc040951b57697a2081fec8f1b3817e5148480aefaf9aef9a",
          },
          artifacts: [
            ["pdf", "case-sierra-renewal-fixture-brokerage-packet.pdf", 14682],
            ["zip", "case-sierra-renewal-fixture-brokerage-packet.zip", 28411],
            ["manifest", "case-sierra-renewal-fixture-manifest.json", 4980],
            ["letter", "case-sierra-renewal-fixture-accompanying-letter.txt", 208],
          ].map(([artifactType, filename, sizeBytes], index) => ({
            id: `fixture-artifact-${index + 1}`,
            artifactType: String(artifactType),
            filename: String(filename),
            mimeType:
              artifactType === "pdf"
                ? "application/pdf"
                : artifactType === "zip"
                  ? "application/zip"
                  : artifactType === "manifest"
                    ? "application/json"
                    : "text/plain",
            sizeBytes: Number(sizeBytes),
            sha256: `${String(index + 1).repeat(64)}`,
            generatedAt,
          })),
        };
        replaceCase({
          ...selectedCase,
          submissions: [submission, ...selectedCase.submissions],
          gates: { ...selectedCase.gates, packetGenerated: true },
        });
      } else {
        await responseJson(
          await fetch(
            `/api/production/brokerage/cases/${selectedCase.id}/packets`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                idempotencyKey: crypto.randomUUID(),
                purpose: packetPurpose.trim(),
                letter: letter.trim(),
                humanConfirmation: packetConfirmed,
              }),
            },
          ),
        );
        await refresh();
      }
      setPacketConfirmed(false);
      setNotice(
        "The confirmed packet version and exact artifact hashes were recorded.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Packet generation failed.");
    } finally {
      setPending(null);
    }
  };

  if (loading)
    return (
      <main className="brokerage-page brokerage-state">
        <LoaderCircle className="spin" aria-hidden="true" />
        <h1>Loading brokerage cases</h1>
        <p>Resolving tenant scope, confirmed notice facts, requests, and packet history.</p>
      </main>
    );

  if (!workspace)
    return (
      <main className="brokerage-page brokerage-state">
        <CircleAlert aria-hidden="true" />
        <h1>Organization access required</h1>
        <p>{error ?? "Sign in to an authorized brokerage organization."}</p>
        <Link className="button primary" href="/sign-in">Organization sign in</Link>
      </main>
    );

  return (
    <main className="brokerage-page">
      <a className="skip-link" href="#brokerage-main">Skip to brokerage case</a>
      <header className="brokerage-topbar">
        <Link className="brokerage-brand" href="/">
          <span>F</span>
          <div><strong>Fortify</strong><small>California brokerage operations</small></div>
        </Link>
        <div className="brokerage-top-actions">
          <span className={sandbox ? "brokerage-mode synthetic" : "brokerage-mode"}>
            {sandbox ? "Synthetic fixture" : "Production tenant"}
          </span>
          <Link href="/imports">Imports</Link>
          <Link href="/documents">Documents</Link>
          <Link href="/property-graph">Property graph</Link>
          <Link href="/access">Access</Link>
        </div>
      </header>

      <div id="brokerage-main" className="brokerage-shell">
        <section className="brokerage-hero">
          <div>
            <span className="eyebrow">M3 · Live brokerage wedge</span>
            <h1>One governed case, from confirmed notice to exact packet bytes.</h1>
            <p>
              Organize the California policy, human-confirmed notice facts, scoped external requests,
              source evidence, and an immutable PDF/ZIP packet without falling back to global demo state.
            </p>
          </div>
          <div className="brokerage-assurance">
            <ShieldCheck size={21} />
            <div><strong>Evidence workflow only</strong><span>No wildfire score, inspection, market acceptance, pricing, or insurance outcome is inferred.</span></div>
          </div>
        </section>

        <section className="brokerage-context" aria-label="Organization and case context">
          <div><span>Organization</span><strong>{workspace.organization.name}</strong></div>
          <div><span>Environment</span><strong>{label(workspace.organization.environment)}</strong></div>
          <label>
            <span>Active case</span>
            <select value={selectedCase?.id ?? ""} onChange={(event) => setSelectedCaseId(event.target.value)}>
              {workspace.cases.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}
            </select>
          </label>
          <button className="button ghost compact" onClick={() => void refresh()} disabled={sandbox || loading}>
            <RefreshCw size={14} /> Refresh
          </button>
        </section>

        {sandbox ? (
          <div className="brokerage-banner synthetic">
            <DatabaseZap size={18} />
            <div><strong>Fictional California development fixture</strong><span>Controls work locally for inspection. No real brokerage, carrier, contributor, policy, or property relationship is represented.</span></div>
          </div>
        ) : null}
        {error ? (
          <div className="brokerage-banner error" role="alert">
            <CircleAlert size={18} />
            <div><strong>Action failed closed</strong><span>{error}</span></div>
            <button onClick={() => setError(null)} aria-label="Dismiss error"><X size={16} /></button>
          </div>
        ) : null}
        {notice ? (
          <div className="brokerage-banner success" role="status">
            <Check size={18} />
            <div><strong>Governed record updated</strong><span>{notice}</span></div>
            <button onClick={() => setNotice(null)} aria-label="Dismiss notice"><X size={16} /></button>
          </div>
        ) : null}

        {!selectedCase ? (
          <section className="brokerage-state empty">
            <FolderArchive aria-hidden="true" />
            <h2>No assigned brokerage cases</h2>
            <p>Import a portfolio and create a tenant-scoped renewal or appeal case first.</p>
            <Link className="button primary" href="/imports"><UploadCloud size={15} /> Open imports</Link>
          </section>
        ) : (
          <>
            <section className="brokerage-gates" aria-label="Case gate summary">
              <article className={selectedCase.gates.noticeFactsConfirmed ? "complete" : "blocked"}>
                <Fingerprint size={18} /><div><span>Notice facts</span><strong>{selectedCase.gates.noticeFactsConfirmed ? "Human confirmed" : "Review required"}</strong></div>
              </article>
              <article className={selectedCase.gates.evidenceRequestRecorded ? "complete" : "blocked"}>
                <MailPlus size={18} /><div><span>Evidence request</span><strong>{selectedCase.gates.evidenceRequestRecorded ? "Version recorded" : "Missing"}</strong></div>
              </article>
              <article className={selectedCase.gates.openContradictionCount ? "blocked" : "complete"}>
                <AlertTriangle size={18} /><div><span>Contradictions</span><strong>{selectedCase.gates.openContradictionCount} open</strong></div>
              </article>
              <article className={selectedCase.gates.packetGenerated ? "complete" : "pending"}>
                <PackageCheck size={18} /><div><span>Packet</span><strong>{selectedCase.gates.packetGenerated ? "Exact bytes stored" : "Not generated"}</strong></div>
              </article>
            </section>

            <nav className="brokerage-tabs" aria-label="Brokerage case sections">
              {(["case", "notice", "requests", "packet"] as const).map((item) => (
                <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>
                  {item === "case" ? "Case record" : item === "requests" ? "Evidence requests" : label(item)}
                </button>
              ))}
            </nav>

            {tab === "case" ? (
              <section className="brokerage-panel">
                <div className="brokerage-section-heading"><div><span>Normalized case record</span><h2>{selectedCase.title}</h2></div><span className="brokerage-status">{label(selectedCase.status)}</span></div>
                <div className="brokerage-case-grid">
                  <article className="brokerage-card primary-record">
                    <div className="brokerage-card-title"><Building2 size={20} /><div><span>Property</span><h3>{selectedCase.property.name}</h3></div></div>
                    <p>{selectedCase.property.address}</p>
                    <dl><div><dt>Community</dt><dd>{selectedCase.community.name}</dd></div><div><dt>Physical record</dt><dd>{selectedCase.property.unitCount ?? "Unknown"} units · {selectedCase.property.buildingCount ?? "Unknown"} buildings</dd></div><div><dt>Scope</dt><dd>{label(selectedCase.propertyClass)} · {selectedCase.jurisdiction} · {label(selectedCase.peril)}</dd></div></dl>
                  </article>
                  <article className="brokerage-card">
                    <div className="brokerage-card-title"><FileKey2 size={20} /><div><span>Policy</span><h3>{selectedCase.policy.policyNumber}</h3></div></div>
                    <dl><div><dt>Market</dt><dd>{selectedCase.policy.marketName ?? "Not recorded"}</dd></div><div><dt>Policy period</dt><dd>{formatDate(selectedCase.policy.effectiveDate)} – {formatDate(selectedCase.policy.expirationDate)}</dd></div><div><dt>Source authority</dt><dd>{selectedCase.policy.sourceAuthority}</dd></div></dl>
                  </article>
                  <article className="brokerage-card timeline-card">
                    <div className="brokerage-card-title"><History size={20} /><div><span>Case timeline</span><h3>Traceable operating chain</h3></div></div>
                    <ol>
                      <li className="complete"><CheckCircle2 size={15} /><span><strong>Property and policy normalized</strong><small>Tenant-scoped identifiers retained</small></span></li>
                      <li className={selectedCase.gates.noticeFactsConfirmed ? "complete" : "blocked"}><FileCheck2 size={15} /><span><strong>Notice reviewed</strong><small>{selectedCase.gates.noticeFactsConfirmed ? "Required facts human confirmed" : "Confirmation incomplete"}</small></span></li>
                      <li className={selectedCase.gates.evidenceRequestRecorded ? "complete" : "blocked"}><MailPlus size={15} /><span><strong>Evidence requested</strong><small>{selectedCase.evidenceRequests.length} governed version{selectedCase.evidenceRequests.length === 1 ? "" : "s"}</small></span></li>
                      <li className={selectedCase.gates.packetGenerated ? "complete" : "pending"}><PackageCheck size={15} /><span><strong>Packet preserved</strong><small>{selectedCase.gates.packetGenerated ? "Exact submitted bytes and hashes" : "Awaiting explicit confirmation"}</small></span></li>
                    </ol>
                  </article>
                </div>
              </section>
            ) : null}

            {tab === "notice" ? (
              <section className="brokerage-panel">
                <div className="brokerage-section-heading"><div><span>Human-confirmed facts</span><h2>Carrier notice provenance</h2></div>{selectedCase.notice ? <span className="brokerage-lock"><LockKeyhole size={14} /> Append-only review</span> : null}</div>
                {!selectedCase.notice ? (
                  <div className="brokerage-empty"><FileText size={24} /><strong>No case-linked notice</strong><span>Intake and process a carrier notice, then confirm every required candidate field.</span><Link href="/documents" className="button primary compact">Document intake <ArrowRight size={14} /></Link></div>
                ) : (
                  <div className="brokerage-notice-layout">
                    <article className="brokerage-source-card"><FileText size={24} /><div><span>Source document</span><h3>{selectedCase.notice.filename}</h3><p>Received {formatDate(selectedCase.notice.receivedAt)}</p><code>{shortHash(selectedCase.notice.sha256)}</code></div></article>
                    <div className="brokerage-facts">
                      {selectedCase.notice.facts.map((fact) => <article key={fact.id}><div><span>{label(fact.key)}</span><strong>{fact.value}</strong></div><small><CheckCircle2 size={13} /> Confirmed by {fact.confirmedBy} · v{fact.versionNumber}</small></article>)}
                      {selectedCase.notice.missingRequiredFacts.length ? <div className="brokerage-inline-warning"><AlertTriangle size={16} /> Missing confirmations: {selectedCase.notice.missingRequiredFacts.map(label).join(", ")}</div> : null}
                    </div>
                  </div>
                )}
              </section>
            ) : null}

            {tab === "requests" ? (
              <section className="brokerage-panel">
                <div className="brokerage-section-heading"><div><span>Scoped contributor workflow</span><h2>External evidence requests</h2></div><strong className="brokerage-count">{selectedCase.evidenceRequests.length} versions</strong></div>
                <div className="brokerage-request-layout">
                  <form className="brokerage-form" onSubmit={(event) => { event.preventDefault(); void createRequest(); }}>
                    <div className="brokerage-form-title"><Plus size={18} /><div><span>New immutable draft</span><h3>Confirm what is being requested</h3></div></div>
                    <label><span>Recipient type</span><select value={recipientType} onChange={(event) => setRecipientType(event.target.value)}><option value="property_manager">Property manager</option><option value="board_contributor">Board contributor</option><option value="contractor_evidence_contributor">Contractor evidence contributor</option><option value="other_authorized_contributor">Other authorized contributor</option></select></label>
                    <label><span>Recipient label</span><input value={recipientLabel} onChange={(event) => setRecipientLabel(event.target.value)} required minLength={3} /></label>
                    <label><span>Purpose</span><input value={requestPurpose} onChange={(event) => setRequestPurpose(event.target.value)} required minLength={8} /></label>
                    <label><span>Instructions</span><textarea value={requestInstructions} onChange={(event) => setRequestInstructions(event.target.value)} required minLength={12} rows={3} /></label>
                    <label><span>Due date</span><input type="date" value={requestDueAt} onChange={(event) => setRequestDueAt(event.target.value)} required /></label>
                    <label className="brokerage-confirm"><input type="checkbox" checked={requestConfirmed} onChange={(event) => setRequestConfirmed(event.target.checked)} /><span><strong>I confirm this request scope</strong><small>A member—not an extractor or model—is accountable for the exact draft.</small></span></label>
                    <button className="button primary" disabled={pending === "create-request" || !requestConfirmed} type="submit">{pending === "create-request" ? <LoaderCircle className="spin" size={15} /> : <Plus size={15} />} Record request draft</button>
                  </form>
                  <div className="brokerage-request-list">
                    {selectedCase.evidenceRequests.length ? selectedCase.evidenceRequests.map((request) => <article className="brokerage-request" key={request.id}><div className="brokerage-request-head"><div><span>{label(request.recipientType)}</span><h3>{request.recipientLabel}</h3></div><em className={request.status}>{label(request.status)}</em></div><p>{request.version?.purpose ?? "Version unavailable"}</p><div className="brokerage-request-items">{request.version?.requestedItems.map((item) => <span key={`${request.id}-${item.label}`}><b>{item.required ? "Required" : "Requested"}</b>{item.label} · {label(item.scopeType)}</span>)}</div><div className="brokerage-request-foot"><span><Clock3 size={13} /> Due {formatDate(request.version?.dueAt ?? null)}</span><span><LockKeyhole size={13} /> {label(request.externalAccessState)}</span></div>{request.status === "draft" ? <button className="button secondary compact" onClick={() => void issueRequest(request)} disabled={pending === request.id}>{pending === request.id ? <LoaderCircle className="spin" size={14} /> : <Send size={14} />} Confirm and mark issued</button> : null}</article>) : <div className="brokerage-empty"><MailPlus size={24} /><strong>No request versions</strong><span>Record the exact recipient, purpose, scope, items, and human confirmer.</span></div>}
                  </div>
                </div>
              </section>
            ) : null}

            {tab === "packet" ? (
              <section className="brokerage-panel">
                <div className="brokerage-section-heading"><div><span>Exact generated bytes</span><h2>Brokerage packet versions</h2></div><span className="brokerage-lock"><Archive size={14} /> Never overwritten</span></div>
                <div className="brokerage-packet-layout">
                  <form className="brokerage-form packet-form" onSubmit={(event) => { event.preventDefault(); void generatePacket(); }}>
                    <div className="brokerage-form-title"><PackageCheck size={18} /><div><span>New packet version</span><h3>Confirm destination purpose and contents</h3></div></div>
                    <label><span>Submission purpose</span><input value={packetPurpose} onChange={(event) => setPacketPurpose(event.target.value)} required minLength={8} /></label>
                    <label><span>Accompanying letter</span><textarea value={letter} onChange={(event) => setLetter(event.target.value)} required minLength={40} rows={6} /></label>
                    <div className="brokerage-packet-gate-list"><span className={selectedCase.gates.noticeFactsConfirmed ? "complete" : "blocked"}>{selectedCase.gates.noticeFactsConfirmed ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />} Required notice facts confirmed</span><span className={selectedCase.gates.evidenceRequestRecorded ? "complete" : "blocked"}>{selectedCase.gates.evidenceRequestRecorded ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />} Evidence request version recorded</span><span className={selectedCase.gates.openContradictionCount ? "blocked" : "complete"}>{selectedCase.gates.openContradictionCount ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />} {selectedCase.gates.openContradictionCount} open contradictions retained</span></div>
                    <label className="brokerage-confirm"><input type="checkbox" checked={packetConfirmed} onChange={(event) => setPacketConfirmed(event.target.checked)} /><span><strong>I confirm these packet contents</strong><small>Generation records exact PDF, ZIP, manifest, letter, and exhibit bytes.</small></span></label>
                    <button className="button primary" type="submit" disabled={pending === "generate-packet" || !packetConfirmed || !selectedCase.gates.noticeFactsConfirmed || !selectedCase.gates.evidenceRequestRecorded}>{pending === "generate-packet" ? <LoaderCircle className="spin" size={15} /> : <PackageCheck size={15} />} Generate immutable packet</button>
                  </form>
                  <div className="brokerage-submissions">
                    {selectedCase.submissions.length ? selectedCase.submissions.map((submission) => <article className="brokerage-submission" key={submission.id}><div className="brokerage-submission-head"><div><span>Version {submission.version?.versionNumber ?? "?"}</span><h3>{submission.purpose}</h3></div><em>{label(submission.status)}</em></div><p><Fingerprint size={14} /> Manifest {shortHash(submission.version?.manifestHash ?? null)}</p><div className="brokerage-artifacts">{submission.artifacts.map((artifact) => <div key={artifact.id}><span className={`artifact-kind ${artifact.artifactType}`}>{artifact.artifactType.toUpperCase()}</span><div><strong>{artifact.filename}</strong><small>{artifact.sizeBytes.toLocaleString()} bytes · {shortHash(artifact.sha256)}</small></div></div>)}</div><footer><span>Confirmed by {submission.version?.confirmedBy ?? "Unavailable"}</span><span>{formatDate(submission.version?.confirmedAt ?? null)}</span></footer></article>) : <div className="brokerage-empty"><PackageCheck size={24} /><strong>No production packet version</strong><span>Generation remains unavailable until the notice and request gates are satisfied and a human confirms the contents.</span></div>}
                  </div>
                </div>
              </section>
            ) : null}

            <section className="brokerage-boundary">
              <LockKeyhole size={18} />
              <div><strong>Authority remains separate</strong><span>A confirmed fact is not verified installation. A packet is not model acceptance, filed rating treatment, underwriting recognition, a quote, bind, renewal, funding decision, or observed performance.</span></div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
