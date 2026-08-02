"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CircleAlert,
  DatabaseZap,
  Fingerprint,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Network,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

type RuntimeMode = "sandbox" | "production";
type Tab = "overview" | "assignments" | "access-log" | "boundaries";
type ScopeType = "portfolio" | "case";
type Member = {
  id: string;
  role: string;
  status: string;
  displayName: string;
  email: string | null;
  emailVerified: boolean;
  mfaCapable: boolean;
  acceptedAt: string | null;
  revokedAt: string | null;
};
type Assignment = {
  id: string;
  membershipId: string | null;
  teamId?: string | null;
  assignmentRole: string;
  accessPurpose: string;
  permissions: string[];
  dataDomains: string[];
  expiresAt: string | null;
  revokedAt: string | null;
  revocationReason: string | null;
  portfolioId?: string;
  caseId?: string;
};
type AccessLog = {
  id: string;
  actorSubject: string;
  accessPurpose: string;
  resourceType: string;
  resourceId: string;
  action: string;
  outcome: string;
  dataClasses: string[];
  occurredAt: string;
};
type Workspace = {
  organization: { id: string; name: string; environment: string; synthetic: boolean } | null;
  currentPrincipal: {
    actorSubject: string;
    role: string | null;
    assignedCaseIds: string[] | null;
    assignedPortfolioIds: string[] | null;
  };
  memberships: Member[];
  portfolios: Array<{ id: string; name: string; jurisdiction: string; primaryPeril: string }>;
  cases: Array<{ id: string; title: string; status: string; renewalDate: string }>;
  portfolioAssignments: Assignment[];
  caseAssignments: Assignment[];
  supportGrants: Array<{ id: string; reason: string; scopes: string[]; expiresAt: string; revokedAt: string | null }>;
  accessLogs: AccessLog[];
  securityPosture: {
    identityInterface: string;
    localProviderProductionState: string;
    activeSessionCount: number;
    mfaCapableMembershipCount: number;
    encryptedObjectCount: number;
    quarantinedObjectCount: number;
    cleanObjectCount: number;
  };
};

const dataDomains = [
  ["property_identity", "Property identity"],
  ["evidence", "Evidence"],
  ["insurance_strategy", "Insurance strategy"],
  ["funding", "Funding"],
  ["verification", "Verification"],
  ["programme", "Programme"],
  ["audit", "Audit"],
] as const;

const roleBoundary = [
  ["Property operator administrator", "Portfolio people, property records, evidence, tasks", "Cannot bind insurance or verify own work"],
  ["Property manager", "Assigned property identity, evidence, maintenance", "No insurance strategy or funding decisions"],
  ["Contractor evidence contributor", "Assigned task and evidence uploads", "No policy, submission, funding, or audit access"],
  ["Independent verifier", "Assigned evidence and verification context", "Cannot mutate market responses or source evidence"],
  ["Programme administrator", "Assigned programme delivery and maintenance", "No insurer or capital decision authority"],
  ["Insurer / MGA reviewer", "Assigned submission evidence and clarification response", "Cannot change property evidence or Fortify readiness"],
  ["Lender / funder reviewer", "Assigned property, funding evidence, milestones", "No insurance decision or market submission authority"],
] as const;

const fixture: Workspace = {
  organization: {
    id: "org-california-access-fixture",
    name: "Fictional Pacific Resilience Brokerage",
    environment: "sandbox",
    synthetic: true,
  },
  currentPrincipal: {
    actorSubject: "fixture:maya-chen",
    role: "brokerage_administrator",
    assignedCaseIds: null,
    assignedPortfolioIds: null,
  },
  memberships: [
    ["member-maya", "Maya Chen", "maya@fictional-fortify.test", "brokerage_administrator"],
    ["member-jon", "Jon Bell", "jon@fictional-fortify.test", "property_manager"],
    ["member-aria", "Aria Flores", "aria@fictional-fortify.test", "contractor_evidence_contributor"],
    ["member-noah", "Noah Grant", "noah@fictional-fortify.test", "independent_verifier"],
    ["member-lee", "Lee Park", "lee@fictional-fortify.test", "insurer_mga_reviewer"],
  ].map(([id, displayName, email, role]) => ({
    id,
    displayName,
    email,
    role,
    status: "active",
    emailVerified: true,
    mfaCapable: id !== "member-aria",
    acceptedAt: "2026-08-01T12:00:00.000Z",
    revokedAt: null,
  })),
  portfolios: [
    {
      id: "portfolio-sierra-fixture",
      name: "Fictional Sierra association book",
      jurisdiction: "US-CA",
      primaryPeril: "wildfire",
    },
  ],
  cases: [
    {
      id: "case-sierra-renewal-fixture",
      title: "Fictional Sierra Vista 2027 renewal",
      status: "evidence_collection",
      renewalDate: "2027-01-01",
    },
  ],
  portfolioAssignments: [
    {
      id: "assignment-manager-fixture",
      membershipId: "member-jon",
      assignmentRole: "manager",
      accessPurpose: "Maintain property evidence for the 2027 renewal",
      permissions: ["property:read", "evidence_item:create", "maintenance_event:update"],
      dataDomains: ["property_identity", "evidence"],
      expiresAt: "2027-02-01T00:00:00.000Z",
      revokedAt: null,
      revocationReason: null,
      portfolioId: "portfolio-sierra-fixture",
    },
  ],
  caseAssignments: [
    {
      id: "assignment-reviewer-fixture",
      membershipId: "member-lee",
      assignmentRole: "reviewer",
      accessPurpose: "Review the confirmed market submission",
      permissions: ["submission:read", "market_response:create"],
      dataDomains: ["evidence", "insurance_strategy"],
      expiresAt: "2026-09-15T00:00:00.000Z",
      revokedAt: null,
      revocationReason: null,
      caseId: "case-sierra-renewal-fixture",
    },
  ],
  supportGrants: [],
  accessLogs: [
    {
      id: "log-fixture-1",
      actorSubject: "fixture:maya-chen",
      accessPurpose: "Administer workforce access",
      resourceType: "access_control_workspace",
      resourceId: "org-california-access-fixture",
      action: "read",
      outcome: "allowed",
      dataClasses: ["identity_profile", "authorization_assignment"],
      occurredAt: "2026-08-01T12:15:00.000Z",
    },
    {
      id: "log-fixture-2",
      actorSubject: "fixture:jon-bell",
      accessPurpose: "Prepare renewal evidence",
      resourceType: "evidence_item",
      resourceId: "evidence-roof-fixture",
      action: "read",
      outcome: "allowed",
      dataClasses: ["evidence", "property_identity"],
      occurredAt: "2026-08-01T11:42:00.000Z",
    },
  ],
  securityPosture: {
    identityInterface: "OIDC authorization code with PKCE, state, and nonce",
    localProviderProductionState: "disabled",
    activeSessionCount: 4,
    mfaCapableMembershipCount: 4,
    encryptedObjectCount: 47,
    quarantinedObjectCount: 2,
    cleanObjectCount: 45,
  },
};

const permissionPresets = {
  evidence: ["property:read", "evidence_item:read", "evidence_item:create", "evidence_version:create"],
  operations: ["property:read", "evidence_item:read", "task:update", "maintenance_event:update"],
  review: ["submission:read", "evidence_item:read", "market_response:create"],
  audit: ["audit_event:read", "data_access_log:read"],
} as const;

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "No expiry";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

async function responseJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) throw new Error(body.error || "The request failed closed.");
  return body;
}

export function AccessControlWorkspace({ mode }: { mode: RuntimeMode }) {
  const sandbox = mode === "sandbox";
  const [workspace, setWorkspace] = useState<Workspace | null>(sandbox ? fixture : null);
  const [loading, setLoading] = useState(!sandbox);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [pending, setPending] = useState<string | null>(null);
  const [scopeType, setScopeType] = useState<ScopeType>("portfolio");
  const [membershipId, setMembershipId] = useState("member-aria");
  const [scopeId, setScopeId] = useState("portfolio-sierra-fixture");
  const [assignmentRole, setAssignmentRole] = useState("contributor");
  const [purpose, setPurpose] = useState("Collect requested mitigation evidence");
  const [preset, setPreset] = useState<keyof typeof permissionPresets>("evidence");
  const [domains, setDomains] = useState<string[]>(["property_identity", "evidence"]);
  const [expiresAt, setExpiresAt] = useState("2026-12-31");

  const refresh = async () => {
    if (sandbox) return;
    setLoading(true);
    setError(null);
    try {
      setWorkspace(
        await responseJson<Workspace>(
          await fetch("/api/production/access/workspace", { cache: "no-store" }),
        ),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Access workspace failed to load.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sandbox) return;
    let cancelled = false;
    void fetch("/api/production/access/workspace", { cache: "no-store" })
      .then((response) => responseJson<Workspace>(response))
      .then((nextWorkspace) => {
        if (!cancelled) setWorkspace(nextWorkspace);
      })
      .catch((caught: unknown) => {
        if (!cancelled)
          setError(
            caught instanceof Error
              ? caught.message
              : "Access workspace failed to load.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sandbox]);

  const scopeOptions = scopeType === "portfolio" ? workspace?.portfolios ?? [] : workspace?.cases ?? [];
  const allAssignments = [
    ...(workspace?.portfolioAssignments ?? []).map((assignment) => ({ ...assignment, scopeType: "portfolio" as const })),
    ...(workspace?.caseAssignments ?? []).map((assignment) => ({ ...assignment, scopeType: "case" as const })),
  ];
  const memberById = new Map((workspace?.memberships ?? []).map((member) => [member.id, member]));
  const portfolioById = new Map((workspace?.portfolios ?? []).map((portfolio) => [portfolio.id, portfolio.name]));
  const caseById = new Map((workspace?.cases ?? []).map((caseRecord) => [caseRecord.id, caseRecord.title]));
  const liveAssignments = allAssignments.filter((assignment) => !assignment.revokedAt).length;

  const changeScopeType = (next: ScopeType) => {
    setScopeType(next);
    const first = next === "portfolio" ? workspace?.portfolios[0]?.id : workspace?.cases[0]?.id;
    setScopeId(first ?? "");
    setAssignmentRole(next === "portfolio" ? "contributor" : "reviewer");
  };

  const toggleDomain = (domain: string) => {
    setDomains((current) =>
      current.includes(domain)
        ? current.filter((item) => item !== domain)
        : [...current, domain],
    );
  };

  const createAssignment = async () => {
    if (!workspace || !membershipId || !scopeId || purpose.trim().length < 8 || domains.length === 0) return;
    const input = {
      scopeType,
      scopeId,
      membershipId,
      assignmentRole,
      accessPurpose: purpose,
      permissions: [...permissionPresets[preset]],
      dataDomains: domains,
      expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59.000Z`).toISOString() : undefined,
    };
    setPending("create");
    setError(null);
    try {
      if (sandbox) {
        const assignment: Assignment = {
          id: `fixture-assignment-${Date.now()}`,
          membershipId,
          assignmentRole,
          accessPurpose: purpose.trim(),
          permissions: [...permissionPresets[preset]],
          dataDomains: [...domains],
          expiresAt: input.expiresAt ?? null,
          revokedAt: null,
          revocationReason: null,
          ...(scopeType === "portfolio" ? { portfolioId: scopeId } : { caseId: scopeId }),
        };
        setWorkspace((current) =>
          current
            ? {
                ...current,
                portfolioAssignments:
                  scopeType === "portfolio"
                    ? [...current.portfolioAssignments, assignment]
                    : current.portfolioAssignments,
                caseAssignments:
                  scopeType === "case"
                    ? [...current.caseAssignments, assignment]
                    : current.caseAssignments,
              }
            : current,
        );
        setNotice("Synthetic purpose grant created locally. No production identity was changed.");
      } else {
        await responseJson(
          await fetch("/api/production/access/assignments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          }),
        );
        setNotice("Purpose grant created and audit event appended.");
        await refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Assignment failed closed.");
    } finally {
      setPending(null);
    }
  };

  const revokeAssignment = async (assignment: Assignment & { scopeType: ScopeType }) => {
    const reason = "Access purpose ended by administrator";
    setPending(assignment.id);
    setError(null);
    try {
      if (sandbox) {
        setWorkspace((current) => {
          if (!current) return current;
          const revoke = (item: Assignment) =>
            item.id === assignment.id
              ? { ...item, revokedAt: new Date().toISOString(), revocationReason: reason }
              : item;
          return {
            ...current,
            portfolioAssignments: current.portfolioAssignments.map(revoke),
            caseAssignments: current.caseAssignments.map(revoke),
          };
        });
        setNotice("Synthetic grant revoked locally; its earlier record remains visible.");
      } else {
        await responseJson(
          await fetch(`/api/production/access/assignments/${assignment.id}/revoke`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scopeType: assignment.scopeType, reason }),
          }),
        );
        setNotice("Grant revoked. Its assignment and audit history were retained.");
        await refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Revocation failed closed.");
    } finally {
      setPending(null);
    }
  };

  if (loading)
    return (
      <main className="access-page access-state">
        <LoaderCircle className="access-spinner" aria-hidden="true" />
        <h1>Resolving organization access</h1>
        <p>Loading memberships, scoped grants, sessions, and the immutable access ledger.</p>
      </main>
    );

  if (!workspace)
    return (
      <main className="access-page access-state">
        <LockKeyhole size={30} aria-hidden="true" />
        <h1>Organization access required</h1>
        <p>{error || "A current Fortify organization session is required."}</p>
        <div className="access-state-actions">
          <Link className="button primary" href="/sign-in">Sign in <ArrowRight size={15} /></Link>
          <button className="button ghost" onClick={() => void refresh()}><RefreshCw size={15} /> Retry</button>
        </div>
      </main>
    );

  const posture = workspace.securityPosture;
  return (
    <main className="access-page">
      <a className="skip-link" href="#access-main">Skip to access controls</a>
      <header className="access-topbar">
        <Link className="access-brand" href="/">
          <span>F</span><div><strong>Fortify</strong><small>Identity and evidence access</small></div>
        </Link>
        <div className="access-topbar-actions">
          <span className={sandbox ? "access-mode synthetic" : "access-mode"}>
            {sandbox ? "Synthetic walkthrough" : "Organization secured"}
          </span>
          <Link href="/property-graph" className="button ghost compact">Property graph</Link>
        </div>
      </header>

      <div id="access-main" className="access-shell">
        <section className="access-hero">
          <div>
            <span className="eyebrow">M2 · Identity and secure evidence</span>
            <h1>Give each collaborator only the evidence context their work requires.</h1>
            <p>
              Organization roles set the ceiling. Expiring portfolio and case grants narrow scope,
              permissions, data domains, and purpose. Revocation never erases the earlier record.
            </p>
          </div>
          <div className="access-assurance">
            <ShieldCheck size={22} aria-hidden="true" />
            <div><strong>Deny by default</strong><span>Tenant, role, assignment, expiry, and purpose enforced</span></div>
          </div>
        </section>

        <section className="access-context" aria-label="Active organization context">
          <div><span>Organization</span><strong>{workspace.organization?.name ?? "Unavailable"}</strong></div>
          <div><span>Signed-in authority</span><strong>{label(workspace.currentPrincipal.role ?? "unavailable")}</strong></div>
          <div><span>Identity interface</span><strong>OIDC-compatible</strong></div>
          <div><span>Sandbox boundary</span><strong>{sandbox ? "Fixture only" : "Production tenant"}</strong></div>
        </section>

        {sandbox ? (
          <div className="access-banner synthetic"><DatabaseZap size={18} /><div><strong>Fictional access fixture</strong><span>Controls work locally for the walkthrough. No real identity, customer evidence, or carrier system is connected.</span></div></div>
        ) : null}
        {error ? <div className="access-banner error" role="alert"><CircleAlert size={18} /><div><strong>Action failed closed</strong><span>{error}</span></div><button onClick={() => setError(null)} aria-label="Dismiss error"><X size={16} /></button></div> : null}
        {notice ? <div className="access-banner success" role="status"><Check size={18} /><div><strong>Access ledger updated</strong><span>{notice}</span></div><button onClick={() => setNotice(null)} aria-label="Dismiss notice"><X size={16} /></button></div> : null}

        <nav className="access-tabs" aria-label="Access workspace sections">
          {(["overview", "assignments", "access-log", "boundaries"] as const).map((item) => (
            <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)} aria-current={tab === item ? "page" : undefined}>
              {item === "access-log" ? "Access log" : label(item)}
            </button>
          ))}
        </nav>

        {tab === "overview" ? (
          <section className="access-panel">
            <div className="access-section-heading"><div><span>Security posture</span><h2>Current organization controls</h2></div><button className="button ghost compact" onClick={() => void refresh()} disabled={sandbox || loading}><RefreshCw size={14} /> Refresh</button></div>
            <div className="access-metrics">
              <article><UserCheck size={18} /><span>Active memberships</span><strong>{workspace.memberships.filter((member) => member.status === "active").length}</strong><small>{posture.mfaCapableMembershipCount} MFA-capable identities</small></article>
              <article><KeyRound size={18} /><span>Live purpose grants</span><strong>{liveAssignments}</strong><small>{workspace.supportGrants.filter((grant) => !grant.revokedAt).length} customer-approved support grants</small></article>
              <article><Activity size={18} /><span>Active sessions</span><strong>{posture.activeSessionCount}</strong><small>Opaque, expiring, revocable sessions</small></article>
              <article><LockKeyhole size={18} /><span>Clean encrypted objects</span><strong>{posture.cleanObjectCount}</strong><small>{posture.quarantinedObjectCount} isolated pending review</small></article>
            </div>
            <div className="access-overview-grid">
              <article className="access-card">
                <div className="access-card-title"><Fingerprint size={19} /><div><span>Authentication boundary</span><h3>Enterprise identity, local fail-closed</h3></div></div>
                <dl><div><dt>Protocol</dt><dd>{posture.identityInterface}</dd></div><div><dt>Local provider in production</dt><dd>{posture.localProviderProductionState}</dd></div><div><dt>Session material</dt><dd>Opaque token; hash stored server-side</dd></div></dl>
              </article>
              <article className="access-card">
                <div className="access-card-title"><Network size={19} /><div><span>Authorization evaluation</span><h3>Five gates before data access</h3></div></div>
                <ol className="access-gates"><li>Active identity and organization membership</li><li>Same-tenant resource reference</li><li>Organization role ceiling</li><li>Live portfolio or case assignment</li><li>Assignment permission and data purpose</li></ol>
              </article>
            </div>
          </section>
        ) : null}

        {tab === "assignments" ? (
          <section className="access-panel">
            <div className="access-section-heading"><div><span>Purpose grants</span><h2>Portfolio and case assignments</h2></div><strong className="access-count">{liveAssignments} live</strong></div>
            <div className="access-assignment-layout">
              <form className="access-form" onSubmit={(event) => { event.preventDefault(); void createAssignment(); }}>
                <div className="access-form-title"><Plus size={18} /><div><span>New assignment</span><h3>Narrow access before inviting work</h3></div></div>
                <label><span>Scope type</span><select value={scopeType} onChange={(event) => changeScopeType(event.target.value as ScopeType)}><option value="portfolio">Portfolio</option><option value="case">Renewal case</option></select></label>
                <label><span>Active member</span><select value={membershipId} onChange={(event) => setMembershipId(event.target.value)}>{workspace.memberships.filter((member) => member.status === "active").map((member) => <option key={member.id} value={member.id}>{member.displayName} · {label(member.role)}</option>)}</select></label>
                <label><span>{scopeType === "portfolio" ? "Portfolio" : "Case"}</span><select value={scopeId} onChange={(event) => setScopeId(event.target.value)}>{scopeOptions.map((scope) => <option key={scope.id} value={scope.id}>{"name" in scope ? scope.name : scope.title}</option>)}</select></label>
                <label><span>Assignment role</span><select value={assignmentRole} onChange={(event) => setAssignmentRole(event.target.value)}>{(scopeType === "portfolio" ? ["manager", "contributor", "verifier", "reviewer", "auditor"] : ["team_member", "contributor", "reviewer", "auditor"]).map((role) => <option key={role}>{role}</option>)}</select></label>
                <label><span>Purpose</span><textarea value={purpose} onChange={(event) => setPurpose(event.target.value)} rows={2} minLength={8} required /></label>
                <label><span>Permission preset</span><select value={preset} onChange={(event) => setPreset(event.target.value as keyof typeof permissionPresets)}><option value="evidence">Evidence contribution</option><option value="operations">Property operations</option><option value="review">Market review</option><option value="audit">Read-only audit</option></select></label>
                <fieldset><legend>Data domains</legend><div className="access-domain-grid">{dataDomains.map(([value, text]) => <label key={value} className={domains.includes(value) ? "selected" : ""}><input type="checkbox" checked={domains.includes(value)} onChange={() => toggleDomain(value)} /><span>{text}</span></label>)}</div></fieldset>
                <label><span>Expires</span><input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label>
                <button className="button primary" type="submit" disabled={pending === "create" || !scopeId || domains.length === 0 || purpose.trim().length < 8}>{pending === "create" ? <LoaderCircle className="access-spinner" size={15} /> : <Plus size={15} />} Create purpose grant</button>
                <p className="access-form-note"><LockKeyhole size={13} /> Organization role permissions remain the maximum authority.</p>
              </form>

              <div className="access-assignment-list">
                {allAssignments.length === 0 ? <div className="access-empty"><KeyRound size={22} /><strong>No assignments yet</strong><span>Create an explicit portfolio or case purpose grant.</span></div> : allAssignments.map((assignment) => {
                  const member = assignment.membershipId ? memberById.get(assignment.membershipId) : null;
                  const scopeName = assignment.scopeType === "portfolio" ? portfolioById.get(assignment.portfolioId ?? "") : caseById.get(assignment.caseId ?? "");
                  return <article className={assignment.revokedAt ? "access-assignment revoked" : "access-assignment"} key={assignment.id}>
                    <div className="access-assignment-head"><div className="access-avatar">{member?.displayName.split(" ").map((part) => part[0]).join("").slice(0, 2) || "TM"}</div><div><strong>{member?.displayName ?? "Assigned team"}</strong><span>{label(member?.role ?? assignment.assignmentRole)}</span></div><span className={assignment.revokedAt ? "access-status revoked" : "access-status live"}>{assignment.revokedAt ? "Revoked" : "Live"}</span></div>
                    <div className="access-scope"><BriefcaseBusiness size={15} /><div><span>{label(assignment.scopeType)}</span><strong>{scopeName ?? "Scope unavailable"}</strong></div></div>
                    <p>{assignment.accessPurpose}</p>
                    <div className="access-domain-tags">{assignment.dataDomains.map((domain) => <span key={domain}>{label(domain)}</span>)}</div>
                    <div className="access-assignment-foot"><span>Expires {formatDate(assignment.expiresAt)}</span>{assignment.revokedAt ? <span>Reason: {assignment.revocationReason}</span> : <button className="button danger compact" disabled={pending === assignment.id} onClick={() => void revokeAssignment(assignment)}>{pending === assignment.id ? "Revoking…" : "Revoke"}</button>}</div>
                  </article>;
                })}
              </div>
            </div>
          </section>
        ) : null}

        {tab === "access-log" ? (
          <section className="access-panel">
            <div className="access-section-heading"><div><span>Immutable ledger</span><h2>Purpose-specific data access</h2></div><span className="access-ledger-lock"><LockKeyhole size={14} /> Append only</span></div>
            {workspace.accessLogs.length === 0 ? <div className="access-empty"><Activity size={22} /><strong>No access events recorded</strong><span>The first governed data read will appear here.</span></div> : <div className="access-table-wrap"><table className="access-table"><thead><tr><th>When</th><th>Actor</th><th>Purpose</th><th>Resource</th><th>Data classes</th><th>Outcome</th></tr></thead><tbody>{workspace.accessLogs.map((log) => <tr key={log.id}><td>{new Date(log.occurredAt).toLocaleString()}</td><td><strong>{log.actorSubject}</strong><span>{label(log.action)}</span></td><td>{log.accessPurpose}</td><td><strong>{label(log.resourceType)}</strong><span>{log.resourceId}</span></td><td>{log.dataClasses.map((item) => label(item)).join(" · ")}</td><td><span className={`access-status ${log.outcome}`}>{label(log.outcome)}</span></td></tr>)}</tbody></table></div>}
          </section>
        ) : null}

        {tab === "boundaries" ? (
          <section className="access-panel">
            <div className="access-section-heading"><div><span>Separation of duties</span><h2>Resilience ecosystem role boundaries</h2></div></div>
            <div className="access-boundary-intro"><ShieldCheck size={21} /><p>Roles govern workflow access only. They do not establish inspection authority, insurer acceptance, funding authority, compliance, designation, premium savings, renewal, or insurability.</p></div>
            <div className="access-boundary-table"><div className="access-boundary-row header"><span>Role</span><span>Working context</span><span>Hard boundary</span></div>{roleBoundary.map(([role, context, boundary]) => <div className="access-boundary-row" key={role}><strong>{role}</strong><span>{context}</span><span>{boundary}</span></div>)}</div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
