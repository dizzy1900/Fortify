"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Download,
  ExternalLink,
  FileArchive,
  FileText,
  Filter,
  Flag,
  FolderCheck,
  History,
  Info,
  LayoutGrid,
  List,
  LockKeyhole,
  PackageCheck,
  PencilLine,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Timer,
  Upload,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { useState } from "react";
import { calculateReadiness } from "@/lib/readiness";
import type { DemoRole } from "@/lib/domain";
import { useDemo } from "./demo-provider";
import { CommunityMap } from "./community-map";
import { Metric, Status } from "./status";

export type WorkspaceViewName =
  | "demo"
  | "portfolio"
  | "community"
  | "policy"
  | "notice"
  | "requirements"
  | "evidence"
  | "case"
  | "packet"
  | "underwriter"
  | "outcomes"
  | "maintenance"
  | "reports"
  | "settings";
const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
const date = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));

function PageHead({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
function SectionHead({
  title,
  note,
  action,
}: {
  title: string;
  note?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-head">
      <div>
        <h2>{title}</h2>
        {note && <p>{note}</p>}
      </div>
      {action}
    </div>
  );
}
function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty">
      <FolderCheck size={28} />
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}

export function WorkspaceView({ view }: { view: WorkspaceViewName }) {
  const { state, act, reset, refresh, pending } = useDemo();
  const [query, setQuery] = useState("");
  const [gallery, setGallery] = useState(false);
  const [kind, setKind] = useState("all");
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string>();
  const [generating, setGenerating] = useState(false);
  const [artifact, setArtifact] = useState<{
    pdfPath: string;
    zipPath: string;
    pdfBytes: number;
    zipBytes: number;
  }>();
  const [letter, setLetter] = useState("");
  const [brokerResponse, setBrokerResponse] = useState(
    "The current vegetation invoice covers shared parcels 1-3. Buildings 17-28 were completed on July 19, 2026; the itemized successor invoice and dated photo index are included.",
  );
  const [disposition, setDisposition] = useState<
    "accepted" | "clarification" | "rejected" | "changed"
  >("changed");
  const [renewalStatus, setRenewalStatus] = useState(
    "Renewed - fictional demo outcome",
  );
  const [discount, setDiscount] = useState("None stated");
  const [premiumChange, setPremiumChange] = useState("-6800");
  const [outcomeReason, setOutcomeReason] = useState(
    "Clarified shared-parcel scope accepted after review.",
  );
  const community =
    state.communities.find((item) => item.caseId === state.currentCaseId) ??
    state.communities[1];
  const requirements = state.requirements.filter((item) =>
    community.requirementIds.includes(item.id),
  );
  const evidence = state.evidence.filter((item) =>
    community.evidenceIds.includes(item.id),
  );
  const selectedEvidence = evidence.find(
    (item) => item.id === selectedEvidenceId,
  );
  const notice = state.notices.find(
    (item) => item.caseId === community.caseId,
  )!;
  const submission = state.submissions.find(
    (item) => item.caseId === community.caseId,
  )!;
  const readiness = calculateReadiness(requirements, evidence, state.demoDate);
  const filteredEvidence = evidence.filter(
    (item) =>
      (kind === "all" || item.kind === kind) &&
      `${item.filename} ${item.sourceOrganization} ${item.scopeLabel}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const saveRole = (role: DemoRole) => act({ type: "set-role", role });

  if (view === "demo")
    return (
      <div className="demo-entry">
        <div className="demo-entry-copy">
          <span className="eyebrow">Guided product demonstration</span>
          <h1>Enter the renewal evidence workspace.</h1>
          <p>
            Choose a role, then follow a deterministic five-minute story using
            clearly fictional Colorado cases. No network, API key, or external
            integration is required.
          </p>
          <div className="role-cards">
            {(["broker", "manager", "underwriter"] as const).map((role) => (
              <button
                key={role}
                onClick={async () => {
                  await saveRole(role);
                  window.location.href =
                    role === "underwriter" ? "/underwriter" : "/portfolio";
                }}
              >
                <span>
                  {role === "broker"
                    ? "Primary"
                    : role === "manager"
                      ? "Collaborator"
                      : "Read only"}
                </span>
                <strong>
                  {role === "broker"
                    ? "Renewal executive"
                    : role === "manager"
                      ? "Community manager"
                      : "Underwriter reviewer"}
                </strong>
                <small>
                  {role === "broker"
                    ? "Build and submit cases"
                    : role === "manager"
                      ? "Complete assigned evidence work"
                      : "Review packet and request clarification"}
                </small>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
        </div>
        <div className="demo-manifest">
          <strong>Demo manifest</strong>
          <dl>
            <div>
              <dt>Communities</dt>
              <dd>{state.communities.length}</dd>
            </div>
            <div>
              <dt>Evidence records</dt>
              <dd>{state.evidence.length}</dd>
            </div>
            <div>
              <dt>Requirements</dt>
              <dd>{state.requirements.length}</dd>
            </div>
            <div>
              <dt>External services</dt>
              <dd>None</dd>
            </div>
          </dl>
          <p>
            <Info size={15} />
            All organizations, notices, policies, premiums, and outcomes are
            fictional.
          </p>
        </div>
      </div>
    );

  if (view === "portfolio") {
    const urgent = state.communities.filter(
      (item) => item.caseStatus === "needs-attention",
    ).length;
    const openTasks = state.tasks.filter(
      (item) => item.status === "open",
    ).length;
    return (
      <>
        <PageHead
          eyebrow="Portfolio triage"
          title="Renewals that need a decision"
          description="Prioritize deadlines, missing evidence, and review status without inventing a wildfire risk score."
          actions={
            <>
              <button
                className="button secondary"
                onClick={() => window.print()}
              >
                <FileText size={16} />
                Print brief
              </button>
              <Link className="button primary" href="/notice">
                Continue guided case
                <ArrowRight size={16} />
              </Link>
            </>
          }
        />
        <div className="metrics">
          <Metric
            label="Active master policies"
            value={state.communities.length}
            note="Fictional Colorado portfolio"
          />
          <Metric
            label="Needs attention"
            value={urgent}
            note="Deadline or evidence gap"
            tone="warning"
          />
          <Metric
            label="Open evidence tasks"
            value={openTasks}
            note="Across renewal teams"
          />
          <Metric
            label="Next appeal deadline"
            value="11 days"
            note="Red Rock · Aug 12"
            tone="warning"
          />
        </div>
        <section className="panel">
          <SectionHead
            title="Renewal case queue"
            note="Evidence readiness is a workflow measure, not underwriting eligibility."
            action={
              <div className="table-tools">
                <Search size={15} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search communities"
                  aria-label="Search communities"
                />
              </div>
            }
          />
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Community</th>
                  <th>Carrier / renewal</th>
                  <th>Evidence readiness</th>
                  <th>Next deadline</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.communities
                  .filter((item) =>
                    item.name.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((item) => {
                    const itemReq = state.requirements.filter((req) =>
                      item.requirementIds.includes(req.id),
                    );
                    const itemEv = state.evidence.filter((ev) =>
                      item.evidenceIds.includes(ev.id),
                    );
                    const score = calculateReadiness(
                      itemReq,
                      itemEv,
                      state.demoDate,
                    ).total;
                    return (
                      <tr
                        key={item.id}
                        className={
                          item.caseStatus === "needs-attention"
                            ? "urgent-row"
                            : ""
                        }
                      >
                        <td>
                          <div className="entity">
                            <div className="entity-mark">
                              {item.name
                                .split(" ")
                                .slice(1, 3)
                                .map((part) => part[0])
                                .join("")}
                            </div>
                            <div>
                              <strong>{item.name}</strong>
                              <span>
                                {item.units} units · {item.county}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <strong>{item.carrier}</strong>
                          <span>{date(item.renewalDate)}</span>
                        </td>
                        <td>
                          <div className="score-cell">
                            <strong>{score}%</strong>
                            <div className="progress">
                              <i style={{ width: `${score}%` }} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <strong>{date(item.appealDeadline)}</strong>
                          <span>
                            {item.caseStatus === "resolved"
                              ? "Completed"
                              : "Appeal workflow"}
                          </span>
                        </td>
                        <td>
                          <Status value={item.caseStatus} />
                        </td>
                        <td>
                          <Link
                            href={
                              item.id === "com-jefferson"
                                ? "/case"
                                : "/community"
                            }
                            aria-label={`Open ${item.name}`}
                          >
                            <ChevronRight size={17} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
        <div className="two-col">
          <section className="panel">
            <SectionHead title="Why Red Rock is first" />
            <div className="attention-list">
              <div>
                <AlertTriangle size={18} />
                <p>
                  <strong>Appeal deadline in 11 days</strong>
                  <span>Broker review must finish before August 12.</span>
                </p>
              </div>
              <div>
                <CalendarClock size={18} />
                <p>
                  <strong>Vegetation evidence expired</strong>
                  <span>
                    April 2024 inspection is outside its validity window.
                  </span>
                </p>
              </div>
              <div>
                <Flag size={18} />
                <p>
                  <strong>Invoice scope conflicts</strong>
                  <span>Two records disagree on completed buildings.</span>
                </p>
              </div>
            </div>
          </section>
          <section className="panel">
            <SectionHead title="Today’s ownership" />
            <div className="task-mini">
              {state.tasks
                .filter((item) => item.status === "open")
                .slice(0, 3)
                .map((task) => (
                  <div key={task.id}>
                    <span className="avatar small">
                      {task.owner
                        .split(" ")
                        .map((p) => p[0])
                        .join("")}
                    </span>
                    <p>
                      <strong>{task.title}</strong>
                      <span>
                        {task.owner} · due {date(task.dueDate)}
                      </span>
                    </p>
                  </div>
                ))}
            </div>
          </section>
        </div>
      </>
    );
  }

  if (view === "community")
    return (
      <>
        <PageHead
          eyebrow="Community record"
          title={community.name}
          description={`${community.units} units across ${community.buildings} buildings in ${community.county}. Persistent evidence is retained through renewal cycles.`}
          actions={
            <Link href="/evidence" className="button secondary">
              <FolderCheck size={16} />
              Open evidence room
            </Link>
          }
        />
        <div className="community-grid">
          <CommunityMap
            center={community.coordinates}
            name={community.name}
            buildings={community.buildings}
          />
          <section className="panel property-summary">
            <SectionHead title="Master policy" />
            <dl className="detail-list">
              <div>
                <dt>Carrier</dt>
                <dd>{community.carrier}</dd>
              </div>
              <div>
                <dt>Policy</dt>
                <dd>{community.policyNumber}</dd>
              </div>
              <div>
                <dt>Renewal</dt>
                <dd>{date(community.renewalDate)}</dd>
              </div>
              <div>
                <dt>Entered premium</dt>
                <dd>{money(community.premium)}</dd>
              </div>
              <div>
                <dt>Occupancy</dt>
                <dd>{community.type}</dd>
              </div>
              <div>
                <dt>Case status</dt>
                <dd>
                  <Status value={community.caseStatus} />
                </dd>
              </div>
            </dl>
          </section>
        </div>
        <div className="metrics compact-metrics">
          <Metric
            label="Buildings"
            value={community.buildings}
            note="Mapped property records"
          />
          <Metric
            label="Evidence items"
            value={evidence.length}
            note="Versioned and hash-addressed"
          />
          <Metric
            label="Requirements linked"
            value={requirements.length}
            note="Selected, non-exhaustive"
          />
          <Metric
            label="Evidence readiness"
            value={`${readiness.total}%`}
            note="Not eligibility or risk"
          />
        </div>
        <section className="panel">
          <SectionHead
            title="Persistent mitigation evidence record"
            note="Created by repeated renewal work; earlier versions remain discoverable."
          />
          <div className="passport-strip">
            {evidence.slice(0, 6).map((item) => (
              <div key={item.id}>
                <span>{item.kind}</span>
                <strong>{item.filename}</strong>
                <small>
                  {item.reusedFromYear
                    ? `Reused from ${item.reusedFromYear}`
                    : `Captured ${date(item.captureDate)}`}
                </small>
              </div>
            ))}
          </div>
        </section>
      </>
    );

  if (view === "policy")
    return (
      <>
        <PageHead
          eyebrow="Master policy"
          title="Renewal and appeal timeline"
          description={`${community.policyNumber} · ${community.carrier}. Dates are workflow aids and must be confirmed against current notices and policy terms.`}
        />
        <section className="panel timeline-panel">
          <div className="timeline">
            {[
              ["Notice received", notice.receivedDate, "complete"],
              [
                "Human confirmation",
                notice.confirmed ? notice.receivedDate : "Pending",
                notice.confirmed ? "complete" : "current",
              ],
              ["Evidence freeze", "2026-08-08", "upcoming"],
              ["Appeal deadline", community.appealDeadline, "critical"],
              ["Renewal date", community.renewalDate, "upcoming"],
            ].map(([title, when, status]) => (
              <div key={title} className={`timeline-item ${status}`}>
                <i />
                <div>
                  <span>{when === "Pending" ? when : date(when)}</span>
                  <strong>{title}</strong>
                  <p>
                    {title === "Appeal deadline"
                      ? "Configured from the confirmed carrier notice."
                      : "Broker-managed renewal workflow event."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <div className="two-col">
          <section className="panel">
            <SectionHead title="Notice workflow reference" />
            <div className="reference-callout">
              <Timer size={20} />
              <div>
                <strong>10 / 30 calendar-day demo workflow</strong>
                <p>
                  Acknowledge within 10 days and decide within 30 days are
                  configurable Colorado demo references. Verify current
                  requirements and applicability.
                </p>
                <a
                  href="https://leg.colorado.gov/bills/hb25-1182"
                  target="_blank"
                  rel="noreferrer"
                >
                  Colorado HB25-1182 source
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
          </section>
          <section className="panel">
            <SectionHead title="Entered economics" />
            <dl className="detail-list">
              <div>
                <dt>Current annual premium</dt>
                <dd>{money(community.premium)}</dd>
              </div>
              <div>
                <dt>Outcome guarantee</dt>
                <dd>None</dd>
              </div>
              <div>
                <dt>Pricing authority</dt>
                <dd>Carrier only</dd>
              </div>
            </dl>
          </section>
        </div>
      </>
    );

  if (view === "notice") {
    const confirm = async () => {
      const inputs = Array.from(
        document.querySelectorAll<HTMLInputElement>("[data-notice-field]"),
      );
      await act({
        type: "confirm-notice",
        noticeId: notice.id,
        fields: Object.fromEntries(
          inputs.map((input) => [input.dataset.noticeField!, input.value]),
        ),
      });
    };
    const replaceNotice = async (file?: File) => {
      if (!file) return;
      const data = new FormData();
      data.set("file", file);
      const response = await fetch("/api/notices/extract", {
        method: "POST",
        body: data,
      });
      const body = await response.json();
      if (!response.ok) return alert(body.error);
      await act({
        type: "replace-notice",
        noticeId: notice.id,
        filename: body.filename,
        format: body.format,
        rawText: body.rawText,
        fields: body.fields,
      });
    };
    return (
      <>
        <PageHead
          eyebrow="Carrier notice intake"
          title="Confirm what the carrier said"
          description="Deterministic extraction from plain text or a text-based PDF. Every field remains provisional until a human confirms it."
          actions={
            <label className="button secondary file-button">
              <Upload size={16} />
              Replace source
              <input
                aria-label="Replace notice source"
                type="file"
                accept=".txt,.pdf,text/plain,application/pdf"
                onChange={(event) => replaceNotice(event.target.files?.[0])}
              />
            </label>
          }
        />
        <div className="notice-grid">
          <section className="panel source-preview">
            <SectionHead
              title={notice.filename}
              note={`${notice.format} · received ${date(notice.receivedDate)}`}
            />
            <pre>{notice.rawText}</pre>
            <div className="extractor-note">
              <LockKeyhole size={15} />
              {notice.extractor} · no OCR or model API
            </div>
          </section>
          <section className="panel">
            <SectionHead
              title="Extracted fields"
              note={
                notice.confirmed
                  ? "Human-confirmed"
                  : "Review each value before confirmation."
              }
            />
            <div className="field-stack">
              {notice.fields.map((field) => (
                <label key={`${notice.filename}-${field.key}`}>
                  <span>
                    {field.label}
                    <small>
                      {Math.round(field.confidence * 100)}% parser confidence
                    </small>
                  </span>
                  <input
                    data-notice-field={field.key}
                    defaultValue={field.confirmed}
                  />
                  {field.confirmedByHuman && <CheckCircle2 size={16} />}
                </label>
              ))}
            </div>
            <div className="form-foot">
              <p>
                <Info size={14} />
                Confirmation records the actor and appends an immutable audit
                event.
              </p>
              <button
                className="button primary"
                disabled={pending || notice.confirmed}
                onClick={confirm}
              >
                <UserRoundCheck size={16} />
                {notice.confirmed ? "Confirmed by human" : "Confirm all fields"}
              </button>
            </div>
          </section>
        </div>
      </>
    );
  }

  if (view === "requirements")
    return (
      <>
        <PageHead
          eyebrow="Requirement crosswalk"
          title="What is proven, missing, or ambiguous"
          description="Selected carrier requests, Colorado workflow references, and IBHS summaries are versioned and non-exhaustive. Verify current source material."
          actions={
            <Link href="/case" className="button primary">
              Assign missing work
              <ArrowRight size={16} />
            </Link>
          }
        />
        <div className="readiness-banner">
          <div>
            <span>Evidence readiness</span>
            <strong>{readiness.total}%</strong>
            <p>
              A submission organization measure only. This case can still be
              declined.
            </p>
          </div>
          <div className="readiness-components">
            {Object.entries(readiness)
              .filter(([key]) => key !== "total")
              .map(([key, value]) => (
                <div key={key}>
                  <span>{key.replace(/([A-Z])/g, " $1")}</span>
                  <div className="progress">
                    <i style={{ width: `${value}%` }} />
                  </div>
                  <b>{value}%</b>
                </div>
              ))}
          </div>
        </div>
        <section className="panel">
          <SectionHead
            title="Crosswalk"
            note={`${requirements.length} requirements linked to ${evidence.length} evidence records.`}
          />
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Requirement</th>
                  <th>Scope</th>
                  <th>Source / version</th>
                  <th>Linked evidence</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {requirements.map((requirement) => (
                  <tr key={requirement.id}>
                    <td>
                      <strong>{requirement.code}</strong>
                      <span>{requirement.title}</span>
                    </td>
                    <td>{requirement.scope}</td>
                    <td>
                      <strong>{requirement.source}</strong>
                      <span>
                        {requirement.version} ·{" "}
                        <a
                          href={requirement.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          verify current
                        </a>
                      </span>
                    </td>
                    <td>{requirement.evidenceIds.length}</td>
                    <td>
                      <Status value={requirement.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <div className="legal-note">
          <CircleAlert size={18} />
          <p>
            <strong>Reference content, not legal or standards advice.</strong>{" "}
            Fortify stores source, version, and effective-date context without
            claiming exhaustive compliance or official affiliation.
          </p>
        </div>
      </>
    );

  if (view === "evidence") {
    const uploadEvidence = async (file?: File) => {
      if (!file) return;
      const data = new FormData();
      data.set("file", file);
      data.set("caseId", community.caseId);
      const response = await fetch("/api/evidence", {
        method: "POST",
        body: data,
      });
      const body = await response.json();
      if (!response.ok) return alert(body.error);
      await refresh();
    };
    return (
      <>
        <PageHead
          eyebrow="Evidence room"
          title="Review provenance before submission"
          description="Every item carries scope, dates, source, verifier, SHA-256 metadata, validity, and carrier-specific status."
          actions={
            <label className="button primary file-button">
              <Plus size={16} />
              Add evidence
              <input
                aria-label="Add evidence file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.txt,application/pdf,image/jpeg,image/png,text/plain"
                onChange={(event) => uploadEvidence(event.target.files?.[0])}
              />
            </label>
          }
        />
        <section className="panel">
          <div className="evidence-toolbar">
            <div className="table-tools">
              <Search size={15} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search filename, source, or scope"
                aria-label="Search evidence"
              />
            </div>
            <label className="select-tool">
              <Filter size={15} />
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value)}
                aria-label="Filter evidence kind"
              >
                <option value="all">All evidence</option>
                <option value="photo">Photos</option>
                <option value="invoice">Invoices</option>
                <option value="inspection">Inspections</option>
                <option value="certificate">Certificates</option>
                <option value="attestation">Attestations</option>
              </select>
            </label>
            <div className="view-toggle">
              <button
                className={!gallery ? "active" : ""}
                onClick={() => setGallery(false)}
                aria-label="Table view"
              >
                <List size={16} />
              </button>
              <button
                className={gallery ? "active" : ""}
                onClick={() => setGallery(true)}
                aria-label="Gallery view"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
          {filteredEvidence.length === 0 ? (
            <Empty
              title="No evidence matches"
              detail="Clear the search or choose another evidence type."
            />
          ) : gallery ? (
            <div className="evidence-gallery">
              {filteredEvidence.map((item) => (
                <article key={item.id}>
                  <div className="file-tile">
                    <FileText size={26} />
                    <span>{item.kind}</span>
                  </div>
                  <strong>{item.filename}</strong>
                  <small>{item.scopeLabel}</small>
                  <Status
                    value={
                      item.conflictWith
                        ? "conflict"
                        : item.expiryDate && item.expiryDate < state.demoDate
                          ? "expired"
                          : item.humanReviewed
                            ? "reviewed"
                            : "pending"
                    }
                  />
                  <button
                    className="text-button"
                    onClick={() => setSelectedEvidenceId(item.id)}
                  >
                    View provenance
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Evidence</th>
                    <th>Scope</th>
                    <th>Capture / validity</th>
                    <th>Source & verifier</th>
                    <th>Carrier status</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvidence.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="file-cell">
                          <FileText size={17} />
                          <div>
                            <strong>{item.filename}</strong>
                            <span>
                              {item.sha256.slice(0, 12)}… ·{" "}
                              {(item.sizeBytes / 1000).toFixed(1)} KB
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong>{item.scope}</strong>
                        <span>{item.scopeLabel}</span>
                      </td>
                      <td>
                        <strong>{date(item.captureDate)}</strong>
                        <span>
                          {item.expiryDate
                            ? `Expires ${date(item.expiryDate)}`
                            : "No stated expiry"}
                        </span>
                      </td>
                      <td>
                        <strong>{item.sourceOrganization}</strong>
                        <span>
                          {item.verifiedBy
                            ? `Verified by ${item.verifiedBy}`
                            : "Verifier pending"}
                        </span>
                      </td>
                      <td>
                        <Status value={item.carrierStatus} />
                      </td>
                      <td>
                        <div className="evidence-actions">
                          {item.conflictWith ? (
                            <button
                              className="text-button danger"
                              onClick={() =>
                                act({
                                  type: "resolve-conflict",
                                  evidenceId: item.id,
                                })
                              }
                            >
                              Resolve conflict
                            </button>
                          ) : (
                            <Status
                              value={
                                item.humanReviewed ? "reviewed" : "pending"
                              }
                            />
                          )}
                          <button
                            className="text-button"
                            onClick={() => setSelectedEvidenceId(item.id)}
                          >
                            Provenance
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {selectedEvidence && (
          <>
            <button
              className="drawer-backdrop"
              aria-label="Close evidence provenance"
              onClick={() => setSelectedEvidenceId(undefined)}
            />
            <aside
              className="provenance-drawer"
              role="dialog"
              aria-modal="true"
              aria-labelledby="provenance-title"
            >
              <div className="drawer-head">
                <div>
                  <span className="eyebrow">Evidence provenance</span>
                  <h2 id="provenance-title">{selectedEvidence.filename}</h2>
                </div>
                <button
                  className="button secondary compact"
                  onClick={() => setSelectedEvidenceId(undefined)}
                >
                  Close
                </button>
              </div>
              <dl className="detail-list">
                <div>
                  <dt>SHA-256</dt>
                  <dd className="hash-full">{selectedEvidence.sha256}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{selectedEvidence.sourceOrganization}</dd>
                </div>
                <div>
                  <dt>Submitted by</dt>
                  <dd>{selectedEvidence.submittedBy}</dd>
                </div>
                <div>
                  <dt>Verified by</dt>
                  <dd>
                    {selectedEvidence.verifiedBy ??
                      "Pending human verification"}
                  </dd>
                </div>
                <div>
                  <dt>Scope</dt>
                  <dd>
                    {selectedEvidence.scope} · {selectedEvidence.scopeLabel}
                  </dd>
                </div>
                <div>
                  <dt>Capture / upload</dt>
                  <dd>
                    {date(selectedEvidence.captureDate)} /{" "}
                    {date(selectedEvidence.uploadDate)}
                  </dd>
                </div>
                <div>
                  <dt>Validity</dt>
                  <dd>
                    {selectedEvidence.expiryDate
                      ? `Expires ${date(selectedEvidence.expiryDate)}`
                      : "No stated expiry"}
                  </dd>
                </div>
                <div>
                  <dt>Review</dt>
                  <dd>
                    {selectedEvidence.humanReviewed
                      ? "Human reviewed"
                      : "Human review pending"}
                  </dd>
                </div>
                <div>
                  <dt>Carrier status</dt>
                  <dd>{selectedEvidence.carrierStatus}</dd>
                </div>
                <div>
                  <dt>Supersession</dt>
                  <dd>
                    {selectedEvidence.supersedesId
                      ? `Supersedes ${selectedEvidence.supersedesId}`
                      : "Original retained record"}
                  </dd>
                </div>
              </dl>
              <section className="drawer-links">
                <h3>Linked requirements</h3>
                {selectedEvidence.requirementIds.length ? (
                  selectedEvidence.requirementIds.map((id) => {
                    const requirement = state.requirements.find(
                      (item) => item.id === id,
                    );
                    return (
                      <div key={id}>
                        <strong>{requirement?.code ?? id}</strong>
                        <span>
                          {requirement?.title ?? "Requirement not found"}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p>No requirement linked yet.</p>
                )}
              </section>
              <p className="form-disclaimer">
                Provenance records the submitted source and review state. It
                does not certify the underlying mitigation work.
              </p>
            </aside>
          </>
        )}
      </>
    );
  }

  if (view === "case") {
    const caseTasks = state.tasks.filter(
      (item) => item.caseId === community.caseId,
    );
    const assign = (variant: number) =>
      act({
        type: "assign-task",
        caseId: community.caseId,
        title:
          variant === 1
            ? "Obtain current vegetation inspection"
            : "Request itemized invoice scope",
        owner: variant === 1 ? "Jon Bell" : "Priya Shah",
        dueDate: variant === 1 ? "2026-08-06" : "2026-08-07",
        requirementId: variant === 1 ? "req-14" : "req-17",
      });
    return (
      <>
        <PageHead
          eyebrow="Renewal / appeal workspace"
          title={community.caseTitle}
          description={`${community.name} · ${date(community.appealDeadline)} appeal deadline · ${readiness.total}% evidence-ready.`}
          actions={
            <Link href="/packet" className="button primary">
              Open packet builder
              <ArrowRight size={16} />
            </Link>
          }
        />
        <div className="case-grid">
          <section className="panel">
            <SectionHead
              title="Missing-evidence work"
              note="Assignments append audit events."
              action={
                <div className="split-actions">
                  <button
                    className="button secondary compact"
                    onClick={() => assign(1)}
                  >
                    <Plus size={14} />
                    Vegetation task
                  </button>
                  <button
                    className="button secondary compact"
                    onClick={() => assign(2)}
                  >
                    <Plus size={14} />
                    Invoice task
                  </button>
                </div>
              }
            />
            {caseTasks.length ? (
              <div className="task-list">
                {caseTasks.map((task) => (
                  <label key={task.id}>
                    <input
                      type="checkbox"
                      checked={task.status === "done"}
                      onChange={() =>
                        act({ type: "toggle-task", taskId: task.id })
                      }
                    />
                    <span>
                      <strong>{task.title}</strong>
                      <small>
                        {task.owner} · due {date(task.dueDate)}
                      </small>
                    </span>
                    <Status value={task.status} />
                  </label>
                ))}
              </div>
            ) : (
              <Empty
                title="No tasks assigned"
                detail="Assign work from the controls above."
              />
            )}
          </section>
          <aside className="panel deadline-panel">
            <span className="eyebrow">Decision clock</span>
            <strong>11 days</strong>
            <p>until appeal deadline</p>
            <div>
              <CalendarClock size={16} />
              {date(community.appealDeadline)}
            </div>
            <div>
              <ClipboardList size={16} />
              {
                requirements.filter(
                  (item) =>
                    item.status === "missing" || item.status === "partial",
                ).length
              }{" "}
              requirements need work
            </div>
            <div>
              <Flag size={16} />
              {evidence.filter((item) => item.conflictWith).length} conflicting
              records
            </div>
          </aside>
        </div>
        <section className="panel">
          <SectionHead
            title="Immutable case history"
            note="Corrections create successor events; earlier entries are never overwritten."
          />
          <div className="audit-list">
            {state.audit
              .filter((item) => item.caseId === community.caseId)
              .map((item) => (
                <div key={item.id}>
                  <History size={16} />
                  <p>
                    <strong>{item.action}</strong>
                    <span>{item.detail}</span>
                  </p>
                  <time>
                    {new Date(item.at).toLocaleString("en-US", {
                      timeZone: "UTC",
                    })}{" "}
                    UTC
                  </time>
                </div>
              ))}
          </div>
        </section>
      </>
    );
  }

  if (view === "packet") {
    const activeLetter = letter || submission.letter;
    const generate = async () => {
      setGenerating(true);
      await act({
        type: "update-letter",
        submissionId: submission.id,
        letter: activeLetter,
      });
      const response = await fetch("/api/artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: community.caseId }),
      });
      const body = await response.json();
      setGenerating(false);
      if (!response.ok) alert(body.error);
      else setArtifact(body);
    };
    const fileParam = (value: string) => {
      const normalized = value.replaceAll("\\", "/");
      return encodeURIComponent(normalized.split("/output/")[1] ?? "");
    };
    return (
      <>
        <PageHead
          eyebrow="Packet builder"
          title="Generate the underwriter-ready submission"
          description="Preview contents, edit the reconsideration letter, confirm the exact contents, then create a real PDF and ZIP with manifest and exhibits."
          actions={
            <>
              <button
                className="button secondary"
                disabled={
                  pending || !!submission.confirmedBy || !notice.confirmed
                }
                onClick={() =>
                  act({
                    type: "confirm-submission",
                    submissionId: submission.id,
                  })
                }
              >
                <UserRoundCheck size={16} />
                {submission.confirmedBy
                  ? `Confirmed by ${submission.confirmedBy}`
                  : "Confirm packet contents"}
              </button>
              <button
                className="button primary"
                disabled={generating || pending || !submission.confirmedBy}
                onClick={generate}
              >
                <PackageCheck size={16} />
                {generating ? "Generating…" : "Generate PDF + ZIP"}
              </button>
            </>
          }
        />
        <div className="packet-grid">
          <section className="panel packet-preview">
            <div className="packet-cover">
              <div className="packet-brand">
                FORTIFY <span>RENEWAL EVIDENCE PACKET</span>
              </div>
              <span className="eyebrow">{submission.purpose}</span>
              <h2>{community.name}</h2>
              <p>
                {community.policyNumber} · {community.carrier}
              </p>
              <div className="packet-score">
                <strong>{readiness.total}%</strong>
                <span>
                  evidence readiness
                  <br />
                  not risk or eligibility
                </span>
              </div>
              <dl>
                <div>
                  <dt>Requirements</dt>
                  <dd>{requirements.length}</dd>
                </div>
                <div>
                  <dt>Exhibits</dt>
                  <dd>{evidence.length}</dd>
                </div>
                <div>
                  <dt>Unresolved caveats</dt>
                  <dd>
                    {
                      evidence.filter(
                        (item) =>
                          item.conflictWith ||
                          (item.expiryDate && item.expiryDate < state.demoDate),
                      ).length
                    }
                  </dd>
                </div>
              </dl>
              <small>
                Carrier acceptance, renewal, discounts, and pricing changes are
                not guaranteed.
              </small>
            </div>
          </section>
          <section className="panel letter-editor">
            <SectionHead
              title="Editable reconsideration letter"
              note="Saved before generation."
            />
            <textarea
              value={activeLetter}
              onChange={(event) => setLetter(event.target.value)}
              aria-label="Reconsideration letter"
            />
            <button
              className="button secondary"
              onClick={() =>
                act({
                  type: "update-letter",
                  submissionId: submission.id,
                  letter: activeLetter,
                })
              }
            >
              <PencilLine size={15} />
              Save letter draft
            </button>
          </section>
        </div>
        {artifact && (
          <section className="panel generated">
            <CheckCircle2 size={28} />
            <div>
              <strong>Submission artifacts generated</strong>
              <p>
                {(artifact.pdfBytes / 1024).toFixed(1)} KB PDF ·{" "}
                {(artifact.zipBytes / 1024).toFixed(1)} KB ZIP · manifest +{" "}
                {evidence.length} exhibits
              </p>
            </div>
            <a
              className="button secondary"
              href={`/api/artifacts/download?file=${fileParam(artifact.pdfPath)}`}
            >
              <Download size={15} />
              PDF
            </a>
            <a
              className="button secondary"
              href={`/api/artifacts/download?file=${fileParam(artifact.zipPath)}`}
            >
              <FileArchive size={15} />
              ZIP
            </a>
          </section>
        )}
      </>
    );
  }

  if (view === "underwriter") {
    const requestClarification = () =>
      act({
        type: "request-clarification",
        submissionId: submission.id,
        detail:
          "Please clarify whether the vegetation invoice covers all shared parcels and identify the completion date for Buildings 17-28.",
      });
    return (
      <>
        <PageHead
          eyebrow="Read-only underwriter link"
          title="Structured evidence review"
          description={`${community.name} · submission v${submission.version}. Reviewer actions cannot edit broker evidence or readiness.`}
          actions={
            <span className="read-only">
              <LockKeyhole size={14} />
              Read only
            </span>
          }
        />
        <div className="underwriter-grid">
          <section className="panel">
            <SectionHead title="Submission summary" />
            <div className="metrics compact-metrics">
              <Metric
                label="Evidence readiness"
                value={`${readiness.total}%`}
                note="Not underwriting eligibility"
              />
              <Metric
                label="Exhibits"
                value={evidence.length}
                note="Hash-indexed"
              />
              <Metric
                label="Caveats"
                value={evidence.filter((item) => item.conflictWith).length}
                note="Explicitly unresolved"
                tone="warning"
              />
            </div>
            <h3 className="subheading">Requirement review</h3>
            <div className="review-list">
              {requirements.map((item) => (
                <div key={item.id}>
                  <Status value={item.status} />
                  <p>
                    <strong>
                      {item.code} · {item.title}
                    </strong>
                    <span>
                      {item.evidenceIds.length} linked exhibits · {item.scope}{" "}
                      scope
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </section>
          <aside className="panel review-action">
            <ShieldCheck size={25} />
            <h2>Request clarification</h2>
            <p>
              Requests are structured carrier responses and append to the
              immutable case history.
            </p>
            <textarea
              defaultValue="Please clarify whether the vegetation invoice covers all shared parcels and identify the completion date for Buildings 17-28."
              aria-label="Clarification request"
            />
            <button
              className="button primary"
              disabled={
                state.currentRole !== "underwriter" ||
                submission.status === "clarification"
              }
              onClick={requestClarification}
            >
              {submission.status === "clarification"
                ? "Clarification requested"
                : state.currentRole !== "underwriter"
                  ? "Switch to underwriter role"
                  : "Send clarification request"}
            </button>
            <small>
              No carrier integration is connected. This is a fictional review
              workflow.
            </small>
          </aside>
        </div>
      </>
    );
  }

  if (view === "outcomes") {
    const record = () =>
      act({
        type: "record-outcome",
        caseId: community.caseId,
        disposition,
        detail: outcomeReason,
        discount,
        renewalStatus,
        premiumChange: premiumChange === "" ? undefined : Number(premiumChange),
      });
    return (
      <>
        <PageHead
          eyebrow="Response and outcome"
          title="Close the review loop without overclaiming"
          description="Capture the carrier’s structured response exactly as entered. Outcomes are fictional and never predictive."
          actions={
            state.currentRole !== "broker" ? (
              <button
                className="button secondary"
                onClick={() => saveRole("broker")}
              >
                <Users size={16} />
                Return to broker role
              </button>
            ) : undefined
          }
        />
        <div className="outcome-grid">
          <section className="panel">
            <SectionHead
              title="Clarification response"
              note={
                submission.clarification
                  ? "Carrier request received"
                  : "No clarification request yet"
              }
            />
            {submission.clarification ? (
              <>
                <div className="message carrier">
                  <span>Fictional underwriter reviewer</span>
                  <p>{submission.clarification}</p>
                </div>
                <div className="message broker">
                  <span>Maya Chen · broker response draft</span>
                  <textarea
                    aria-label="Broker clarification response"
                    value={brokerResponse}
                    onChange={(event) => setBrokerResponse(event.target.value)}
                  />
                </div>
                <button
                  className="button secondary"
                  disabled={!!submission.responseReadyAt}
                  onClick={() =>
                    act({
                      type: "respond-clarification",
                      submissionId: submission.id,
                      detail: brokerResponse,
                    })
                  }
                >
                  <Check size={15} />
                  {submission.responseReadyAt
                    ? "Response ready"
                    : "Mark response ready"}
                </button>
              </>
            ) : (
              <Empty
                title="No clarification pending"
                detail="Use the underwriter view to create the seeded review request."
              />
            )}
          </section>
          <section className="panel">
            <SectionHead title="Structured fictional outcome" />
            <div className="field-stack">
              <label>
                <span>Disposition</span>
                <select
                  value={disposition}
                  onChange={(event) =>
                    setDisposition(
                      event.target.value as
                        | "accepted"
                        | "clarification"
                        | "rejected"
                        | "changed",
                    )
                  }
                >
                  <option value="accepted">Accepted</option>
                  <option value="clarification">Clarification</option>
                  <option value="rejected">Rejected</option>
                  <option value="changed">
                    Score / classification changed
                  </option>
                </select>
              </label>
              <label>
                <span>Entered discount</span>
                <input
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                />
              </label>
              <label>
                <span>Renewal status</span>
                <input
                  value={renewalStatus}
                  onChange={(event) => setRenewalStatus(event.target.value)}
                />
              </label>
              <label>
                <span>Entered premium change</span>
                <input
                  type="number"
                  value={premiumChange}
                  onChange={(event) => setPremiumChange(event.target.value)}
                />
              </label>
              <label>
                <span>Reason</span>
                <textarea
                  value={outcomeReason}
                  onChange={(event) => setOutcomeReason(event.target.value)}
                />
              </label>
            </div>
            <button
              className="button primary"
              disabled={state.currentRole !== "broker" || !!community.outcome}
              onClick={record}
            >
              {community.outcome
                ? "Outcome recorded"
                : "Record fictional outcome"}
            </button>
            <p className="form-disclaimer">
              Carrier acceptance and pricing changes are not guaranteed.
            </p>
          </section>
        </div>
        {community.outcome && (
          <div className="success-callout">
            <CheckCircle2 size={22} />
            <div>
              <strong>Fictional outcome recorded</strong>
              <p>
                {community.outcome.detail} Entered premium change:{" "}
                {money(community.outcome.premiumChange ?? 0)}.
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  if (view === "maintenance")
    return (
      <>
        <PageHead
          eyebrow="Maintenance and reuse"
          title="Make next year’s renewal faster"
          description="Schedule evidence refreshes, preserve accepted records, and revalidate scope rather than starting from an empty inbox."
        />
        <div className="metrics">
          <Metric
            label="Evidence reusable next year"
            value={state.evidence.filter((item) => item.reusedFromYear).length}
            note="Subject to revalidation"
            tone="good"
          />
          <Metric
            label="Refresh due"
            value={
              state.maintenance.filter((item) => item.status === "due").length
            }
            note="Vegetation inspection"
            tone="warning"
          />
          <Metric
            label="Scheduled"
            value={
              state.maintenance.filter((item) => item.status === "scheduled")
                .length
            }
            note="Before next renewal"
          />
          <Metric
            label="Destructive deletions"
            value="0"
            note="Supersession preserves history"
          />
        </div>
        <section className="panel">
          <SectionHead
            title="Maintenance calendar"
            note="Dates are operational reminders, not inspection or compliance schedules."
          />
          <div className="maintenance-list">
            {state.maintenance.map((item) => {
              const owner = state.communities.find(
                (communityItem) => communityItem.id === item.communityId,
              )!;
              return (
                <div key={item.id}>
                  <div className="date-block">
                    <strong>{date(item.dueDate).split(" ")[0]}</strong>
                    <span>{item.dueDate.slice(-2)}</span>
                  </div>
                  <div>
                    <strong>{item.title}</strong>
                    <span>
                      {owner.name} · {item.recurrence}
                    </span>
                  </div>
                  <Status value={item.status} />
                  <button
                    className="text-button"
                    disabled={item.status === "complete"}
                    onClick={() =>
                      act({
                        type: "complete-maintenance",
                        maintenanceId: item.id,
                      })
                    }
                  >
                    {item.status === "complete" ? "Completed" : "Mark complete"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
        <section className="panel">
          <SectionHead
            title="Year-over-year reuse example"
            note="Horsetooth Flats retained evidence from its prior renewal package."
          />
          <div className="reuse-flow">
            <div>
              <span>2025 renewal</span>
              <strong>4 accepted records</strong>
              <small>Certificates, inspection scope, and dated photos</small>
            </div>
            <ArrowRight />
            <div>
              <span>2026 revalidation</span>
              <strong>Scope and validity checked</strong>
              <small>Earlier files remain immutable</small>
            </div>
            <ArrowRight />
            <div>
              <span>2026 submission</span>
              <strong>Reused with provenance</strong>
              <small>Carrier made a fictional independent decision</small>
            </div>
          </div>
        </section>
      </>
    );

  if (view === "reports")
    return (
      <>
        <PageHead
          eyebrow="Reports and audit"
          title="Evidence operations, with traceable history"
          description="Operational reporting separates evidence completeness from carrier decisions, premium changes, and risk."
          actions={
            <button className="button secondary" onClick={() => window.print()}>
              <FileText size={16} />
              Print report
            </button>
          }
        />
        <section className="panel">
          <SectionHead title="Portfolio evidence readiness" />
          <div className="report-bars">
            {state.communities.map((item) => {
              const score = calculateReadiness(
                state.requirements.filter((req) =>
                  item.requirementIds.includes(req.id),
                ),
                state.evidence.filter((ev) => item.evidenceIds.includes(ev.id)),
                state.demoDate,
              ).total;
              return (
                <div key={item.id}>
                  <span>{item.name.replace("Fictional ", "")}</span>
                  <div className="progress">
                    <i style={{ width: `${score}%` }} />
                  </div>
                  <strong>{score}%</strong>
                </div>
              );
            })}
          </div>
        </section>
        <section className="panel">
          <SectionHead
            title="Immutable audit log"
            note="Hash-chained application events. Database triggers reject update or delete operations."
          />
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Detail</th>
                  <th>Integrity</th>
                </tr>
              </thead>
              <tbody>
                {[...state.audit].reverse().map((item) => (
                  <tr key={item.id}>
                    <td>
                      {new Date(item.at).toLocaleString("en-US", {
                        timeZone: "UTC",
                      })}{" "}
                      UTC
                    </td>
                    <td>{item.actor}</td>
                    <td>
                      <strong>{item.action}</strong>
                    </td>
                    <td>{item.detail}</td>
                    <td>
                      <span className="hash">{item.hash.slice(0, 12)}…</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </>
    );

  return (
    <>
      <PageHead
        eyebrow="Workspace settings"
        title="Demo configuration and sources"
        description="Manage deterministic fixtures, carrier templates, versioned references, and local-only operation."
        actions={
          <button
            className="button danger-button"
            onClick={() =>
              confirm(
                "Reset all demo mutations and regenerated local evidence fixtures?",
              ) && reset()
            }
          >
            <RotateCcw size={16} />
            Reset demo
          </button>
        }
      />
      <div className="settings-grid">
        <section className="panel">
          <SectionHead title="Demo environment" />
          <dl className="detail-list">
            <div>
              <dt>Seed version</dt>
              <dd>{state.seedVersion}</dd>
            </div>
            <div>
              <dt>Demo date</dt>
              <dd>{date(state.demoDate)}</dd>
            </div>
            <div>
              <dt>Database</dt>
              <dd>Local SQLite</dd>
            </div>
            <div>
              <dt>File storage</dt>
              <dd>Local adapter</dd>
            </div>
            <div>
              <dt>Network dependency</dt>
              <dd>None</dd>
            </div>
          </dl>
        </section>
        <section className="panel">
          <SectionHead title="Fictional carrier templates" />
          <div className="settings-list">
            {state.communities.map((item) => (
              <div key={item.carrierId}>
                <span className="entity-mark">
                  {item.carrier
                    .split(" ")
                    .slice(1)
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)}
                </span>
                <p>
                  <strong>{item.carrier}</strong>
                  <span>
                    {
                      state.notices.find(
                        (noticeItem) => noticeItem.caseId === item.caseId,
                      )?.format
                    }{" "}
                    format
                  </span>
                </p>
                <Status value="fictional" />
              </div>
            ))}
          </div>
        </section>
        <section className="panel wide">
          <SectionHead
            title="Versioned reference library"
            note="Selected summaries only; verify current requirements."
          />
          <div className="settings-list">
            {Array.from(
              new Map(
                state.requirements.map((item) => [item.source, item]),
              ).values(),
            ).map((item) => (
              <div key={item.source}>
                <ShieldCheck size={19} />
                <p>
                  <strong>{item.source}</strong>
                  <span>{item.version}</span>
                </p>
                <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                  Verify current
                  <ExternalLink size={13} />
                </a>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
