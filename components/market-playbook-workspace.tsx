"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Ban,
  BookOpenCheck,
  CalendarRange,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock3,
  FileWarning,
  GitCompareArrows,
  History,
  LoaderCircle,
  LockKeyhole,
  Plus,
  RefreshCw,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type RuntimeMode = "sandbox" | "production";
type Market = { id: string; name: string; marketType: string };
type Program = {
  id: string;
  marketId: string;
  name: string;
  peril: string;
  jurisdiction: string;
  propertyClass: string;
};
type RequirementVersion = {
  id: string;
  version: string;
  summary: string;
  sourceUrl: string;
  requirementId: string;
  code: string;
  title: string;
  scopeType: string;
};
type PublishedSourceVersion = {
  id: string;
  sourceId: string;
  title: string;
  issuingAuthority: string;
  officialUrl: string;
  versionLabel: string;
  verifyCurrentStatus: string;
  publishedAt: string;
};
type Playbook = { id: string; name: string; description: string };
type Version = {
  id: string;
  playbookId: string;
  versionNumber: number;
  marketId: string;
  programId: string | null;
  jurisdiction: string;
  peril: string;
  propertyClass: string;
  policyForm: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  governedSourceVersionId: string | null;
  sourceName: string;
  sourceUrl: string;
  sourceVersion: string;
  sourceCitation: string;
  verifyCurrent: boolean;
  changeSummary: string;
  contentHash: string;
  authorSubject: string;
  supersedesVersionId: string | null;
};
type PlaybookRequirement = {
  id: string;
  playbookVersionId: string;
  requirementVersionId: string;
  position: number;
  importance: "required" | "recommended";
  blocking: boolean;
  acceptedEvidenceTypes: string[];
  freshnessDays: number | null;
  requiredScopeType: string;
  acceptedSourceTypes: string[];
  requiredReviewStatus: string;
  caveat: string | null;
};
type Review = {
  id: string;
  playbookVersionId: string;
  decision: "approved" | "changes_requested";
  reviewerSubject: string;
  note: string;
  reviewedAt: string;
};
type Workspace = {
  markets: Market[];
  programs: Program[];
  requirementVersions: RequirementVersion[];
  publishedSourceVersions: PublishedSourceVersion[];
  playbooks: Playbook[];
  versions: Version[];
  requirements: PlaybookRequirement[];
  rules: Array<{
    id: string;
    playbookRequirementId: string;
    position: number;
    field: string;
    operator: string;
    expectedValues: string[];
  }>;
  reviews: Review[];
  cases: Array<{
    id: string;
    title: string;
    renewalDate: string;
    peril: string;
    jurisdiction: string;
    propertyClass: string;
  }>;
  links: Array<{
    id: string;
    caseId: string;
    playbookVersionId: string;
    destinationMarketId: string;
    linkedAt: string;
    supersedesLinkId: string | null;
  }>;
};
type RequirementResult = {
  requirementId: string;
  code: string;
  title: string;
  importance: string;
  blocking: boolean;
  state:
    | "ready"
    | "missing"
    | "stale"
    | "scope_mismatch"
    | "contradiction"
    | "unreviewed"
    | "insufficient"
    | "not_applicable";
  explanation: string;
  evidenceVersionIds: string[];
  caveat?: string | null;
};
type Readiness = {
  status:
    | "blocked"
    | "review_required"
    | "ready_with_caveats"
    | "ready_for_human_confirmation";
  label: string;
  pinned: boolean;
  playbookVersion: {
    id: string;
    versionNumber: number;
    contentHash: string;
    sourceName: string;
    sourceVersion: string;
    sourceCitation: string;
    verifyCurrent: boolean;
  };
  requirements: RequirementResult[];
  blockers: string[];
  caveats: string[];
  calculation: { method: string; averageUsed: false; rule: string };
};
type DraftRequirementConfig = {
  importance: "required" | "recommended";
  blocking: boolean;
  freshnessDays: string;
  requiredScopeType: string;
  evidenceTypes: string;
  sourceTypes: string;
  conditionField:
    | "market_id"
    | "program_id"
    | "jurisdiction"
    | "peril"
    | "property_class"
    | "policy_form";
  conditionOperator: "equals" | "not_equals" | "one_of" | "not_one_of";
  conditionValues: string;
};

const fixtureMarketId = "market-fixture-summit";
const fixtureCaseId = "case-fixture-red-rock";
const fixtureVersionId = "playbook-version-fixture-2";
const fixtureRequirementVersions: RequirementVersion[] = [
  ["roof_schedule", "Roof and building schedule", "property"],
  ["inspection", "Current inspection record", "property"],
  ["vegetation", "Vegetation work record", "property"],
  ["photo_index", "Dated photo index", "building"],
  ["optional_context", "Optional community context", "property"],
].map(([code, title, scopeType]) => ({
  id: `requirement-version-${code}`,
  version: "2026.2",
  summary: `Fictional ${title.toLowerCase()} configuration.`,
  sourceUrl: "https://example.test/fictional-destination-guide",
  requirementId: `requirement-${code}`,
  code,
  title,
  scopeType,
}));
const fixtureRequirements: PlaybookRequirement[] =
  fixtureRequirementVersions.map((requirement, index) => ({
    id: `playbook-requirement-${requirement.code}`,
    playbookVersionId: fixtureVersionId,
    requirementVersionId: requirement.id,
    position: index + 1,
    importance: index === 4 ? "recommended" : "required",
    blocking: [1, 2].includes(index),
    acceptedEvidenceTypes: [
      index === 0 ? "building_schedule" : "inspection_report",
    ],
    freshnessDays: index === 0 ? 365 : 180,
    requiredScopeType: requirement.scopeType,
    acceptedSourceTypes: ["property_manager", "inspector"],
    requiredReviewStatus: "human_confirmed",
    caveat: index === 3 ? "Building labels must match the imported SOV." : null,
  }));
const fixtureWorkspace: Workspace = {
  markets: [
    {
      id: fixtureMarketId,
      name: "Summit Mutual — fictional",
      marketType: "carrier",
    },
  ],
  programs: [],
  requirementVersions: fixtureRequirementVersions,
  publishedSourceVersions: [
    {
      id: "source-version-fictional-destination-guide",
      sourceId: "source-fictional-destination-guide",
      title: "Fictional broker-authored destination guide",
      issuingAuthority: "Alpine Community Insurance — fictional",
      officialUrl: "https://example.test/fictional-destination-guide",
      versionLabel: "2026.2",
      verifyCurrentStatus: "verified_current",
      publishedAt: "2026-07-28T16:20:00.000Z",
    },
  ],
  playbooks: [
    {
      id: "playbook-fixture-summit",
      name: "Colorado condominium renewal — fictional",
      description:
        "Broker-authored evidence guidance for a fictional destination.",
    },
  ],
  versions: [
    {
      id: fixtureVersionId,
      playbookId: "playbook-fixture-summit",
      versionNumber: 2,
      marketId: fixtureMarketId,
      programId: null,
      jurisdiction: "Colorado",
      peril: "wildfire",
      propertyClass: "condominium",
      policyForm: "HOA master policy",
      effectiveFrom: "2026-07-01",
      effectiveTo: "2027-06-30",
      governedSourceVersionId: "source-version-fictional-destination-guide",
      sourceName: "Fictional destination evidence guide",
      sourceUrl: "https://example.test/fictional-destination-guide",
      sourceVersion: "2026.2",
      sourceCitation: "Section 4 · Evidence package · fictional fixture",
      verifyCurrent: true,
      changeSummary:
        "Added building-level photo scope and shortened inspection freshness.",
      contentHash:
        "74cb54e8f12a44edb222a9a5d5cdb07e5732fa2673dd3a4a7101b2749aa20d88",
      authorSubject: "playbook-author-fixture",
      supersedesVersionId: "playbook-version-fixture-1",
    },
  ],
  requirements: fixtureRequirements,
  rules: [
    {
      id: "rule-optional-program",
      playbookRequirementId: "playbook-requirement-optional_context",
      position: 1,
      field: "program_id",
      operator: "equals",
      expectedValues: ["program-not-selected"],
    },
  ],
  reviews: [
    {
      id: "review-fixture",
      playbookVersionId: fixtureVersionId,
      decision: "approved",
      reviewerSubject: "independent-reviewer-fixture",
      note: "Source, scope, effective period, and blocker flags reviewed.",
      reviewedAt: "2026-07-28T16:30:00.000Z",
    },
  ],
  cases: [
    {
      id: fixtureCaseId,
      title: "Red Rock Commons 2027 renewal — fictional",
      renewalDate: "2027-01-15",
      peril: "wildfire",
      jurisdiction: "Colorado",
      propertyClass: "condominium",
    },
  ],
  links: [
    {
      id: "case-link-fixture",
      caseId: fixtureCaseId,
      playbookVersionId: fixtureVersionId,
      destinationMarketId: fixtureMarketId,
      linkedAt: "2026-07-29T14:00:00.000Z",
      supersedesLinkId: "case-link-fixture-v1",
    },
  ],
};
const fixtureReadiness: Readiness = {
  status: "blocked",
  label: "Submission evidence readiness",
  pinned: true,
  playbookVersion: {
    id: fixtureVersionId,
    versionNumber: 2,
    contentHash: fixtureWorkspace.versions[0].contentHash,
    sourceName: fixtureWorkspace.versions[0].sourceName,
    sourceVersion: fixtureWorkspace.versions[0].sourceVersion,
    sourceCitation: fixtureWorkspace.versions[0].sourceCitation,
    verifyCurrent: true,
  },
  requirements: [
    {
      requirementId: "playbook-requirement-roof_schedule",
      code: "roof_schedule",
      title: "Roof and building schedule",
      importance: "required",
      blocking: false,
      state: "ready",
      explanation:
        "A human-confirmed property-scoped schedule is current and linked.",
      evidenceVersionIds: ["evidence-roof-schedule-v3"],
    },
    {
      requirementId: "playbook-requirement-inspection",
      code: "inspection",
      title: "Current inspection record",
      importance: "required",
      blocking: true,
      state: "stale",
      explanation:
        "The linked inspection is 223 days old; this version permits 180 days.",
      evidenceVersionIds: ["evidence-inspection-v1"],
    },
    {
      requirementId: "playbook-requirement-vegetation",
      code: "vegetation",
      title: "Vegetation work record",
      importance: "required",
      blocking: true,
      state: "missing",
      explanation: "No evidence version is linked to this requirement version.",
      evidenceVersionIds: [],
    },
    {
      requirementId: "playbook-requirement-photo_index",
      code: "photo_index",
      title: "Dated photo index",
      importance: "required",
      blocking: false,
      state: "contradiction",
      explanation:
        "Two linked photo manifests disagree on the building labels.",
      evidenceVersionIds: ["evidence-photo-v1", "evidence-photo-v2"],
      caveat: "Building labels must match the imported SOV.",
    },
    {
      requirementId: "playbook-requirement-optional_context",
      code: "optional_context",
      title: "Optional community context",
      importance: "recommended",
      blocking: false,
      state: "not_applicable",
      explanation:
        "The bounded program condition does not match this destination.",
      evidenceVersionIds: [],
    },
  ],
  blockers: ["inspection", "vegetation"],
  caveats: [
    "Building labels must match the imported SOV.",
    "Evidence readiness is not an underwriting risk score, compliance finding, acceptance probability, or insurance outcome prediction.",
  ],
  calculation: {
    method: "deterministic_requirement_states_v1",
    averageUsed: false,
    rule: "Any unresolved blocking requirement makes the destination blocked; averages cannot offset blockers.",
  },
};

async function responseJson<T>(
  input: Response | Promise<Response>,
): Promise<T> {
  const response = await input;
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new Error(
      payload.error || `Request failed with status ${response.status}.`,
    );
  return payload;
}

function shortHash(value: string) {
  return `${value.slice(0, 10)}…${value.slice(-8)}`;
}

const statePresentation = {
  ready: { label: "Ready", icon: CheckCircle2 },
  missing: { label: "Missing", icon: XCircle },
  stale: { label: "Stale", icon: Clock3 },
  scope_mismatch: { label: "Scope mismatch", icon: Scale },
  contradiction: { label: "Contradiction", icon: FileWarning },
  unreviewed: { label: "Unreviewed", icon: CircleDashed },
  insufficient: { label: "Insufficient", icon: AlertCircle },
  not_applicable: { label: "Not applicable", icon: Ban },
} as const;

function statusLabel(version: Version, reviews: Review[]) {
  const review = reviews.find((item) => item.playbookVersionId === version.id);
  return review?.decision === "approved"
    ? "Approved"
    : review?.decision === "changes_requested"
      ? "Changes requested"
      : "Draft";
}

export function MarketPlaybookWorkspace({ mode }: { mode: RuntimeMode }) {
  const sandbox = mode === "sandbox";
  const [workspace, setWorkspace] = useState<Workspace | null>(
    sandbox ? fixtureWorkspace : null,
  );
  const [readiness, setReadiness] = useState<Readiness | null>(
    sandbox ? fixtureReadiness : null,
  );
  const [role, setRole] = useState<string | null>(
    sandbox ? "brokerage_administrator" : null,
  );
  const [loading, setLoading] = useState(!sandbox);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [view, setView] = useState<"readiness" | "builder" | "history">(
    "readiness",
  );
  const [selectedVersionId, setSelectedVersionId] = useState(fixtureVersionId);
  const [caseId, setCaseId] = useState(sandbox ? fixtureCaseId : "");
  const [marketId, setMarketId] = useState(sandbox ? fixtureMarketId : "");
  const [programId, setProgramId] = useState("");
  const [name, setName] = useState(
    sandbox ? fixtureWorkspace.playbooks[0].name : "",
  );
  const [jurisdiction, setJurisdiction] = useState("Colorado");
  const [peril, setPeril] = useState("wildfire");
  const [propertyClass, setPropertyClass] = useState("condominium");
  const [policyForm, setPolicyForm] = useState(
    sandbox ? "HOA master policy" : "",
  );
  const [effectiveFrom, setEffectiveFrom] = useState("2027-07-01");
  const [effectiveTo, setEffectiveTo] = useState("2028-06-30");
  const [governedSourceVersionId, setGovernedSourceVersionId] = useState(
    sandbox ? "source-version-fictional-destination-guide" : "",
  );
  const [sourceName, setSourceName] = useState(
    sandbox ? "Broker-verified destination guide" : "",
  );
  const [sourceUrl, setSourceUrl] = useState(
    sandbox ? "https://example.test/fictional-destination-guide" : "",
  );
  const [sourceVersion, setSourceVersion] = useState(
    sandbox ? "2027.1" : "",
  );
  const [sourceCitation, setSourceCitation] = useState(
    sandbox ? "Section and page citation required" : "",
  );
  const [verifyCurrent, setVerifyCurrent] = useState(false);
  const [changeSummary, setChangeSummary] = useState(
    sandbox ? "Describe the bounded requirement changes." : "",
  );
  const [newPlaybook, setNewPlaybook] = useState(false);
  const [selectedRequirementIds, setSelectedRequirementIds] = useState<
    string[]
  >(
    sandbox
      ? fixtureRequirementVersions.slice(0, 3).map((item) => item.id)
      : [],
  );
  const [ruleDrafts, setRuleDrafts] = useState<
    Record<string, DraftRequirementConfig>
  >({});
  const [expandedRuleIds, setExpandedRuleIds] = useState<string[]>(
    sandbox ? [fixtureRequirementVersions[0].id] : [],
  );

  const hydrateBuilderFromVersion = (
    version: Version | undefined,
    data: Workspace,
  ) => {
    if (!version) return;
    setName(
      data.playbooks.find((playbook) => playbook.id === version.playbookId)
        ?.name ?? "",
    );
    setMarketId(version.marketId);
    setProgramId(version.programId ?? "");
    setJurisdiction(version.jurisdiction);
    setPeril(version.peril);
    setPropertyClass(version.propertyClass);
    setPolicyForm(version.policyForm ?? "");
    setEffectiveFrom(version.effectiveFrom);
    setEffectiveTo(version.effectiveTo ?? "");
    setGovernedSourceVersionId(version.governedSourceVersionId ?? "");
    setSourceName(version.sourceName);
    setSourceUrl(version.sourceUrl);
    setSourceVersion(version.sourceVersion);
    setSourceCitation(version.sourceCitation);
    setVerifyCurrent(version.verifyCurrent);
    setChangeSummary("");
    setNewPlaybook(false);
  };

  const loadWorkspace = async () => {
    if (sandbox) return;
    setLoading(true);
    setError(null);
    try {
      const [nextWorkspace, session] = await Promise.all([
        responseJson<Workspace>(
          fetch("/api/production/playbooks/workspace", { cache: "no-store" }),
        ),
        responseJson<{ role: string | null }>(
          fetch("/api/auth/session", { cache: "no-store" }),
        ),
      ]);
      setWorkspace(nextWorkspace);
      setRole(session.role);
      const nextVersion =
        nextWorkspace.versions.find(
          (version) => version.id === selectedVersionId,
        ) ?? nextWorkspace.versions[0];
      setSelectedVersionId(nextVersion?.id ?? "");
      hydrateBuilderFromVersion(nextVersion, nextWorkspace);
      setCaseId((current) => current || nextWorkspace.cases[0]?.id || "");
      setMarketId((current) => current || nextWorkspace.markets[0]?.id || "");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Playbook workspace failed to load.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sandbox) return;
    let cancelled = false;
    void Promise.all([
      responseJson<Workspace>(
        fetch("/api/production/playbooks/workspace", { cache: "no-store" }),
      ),
      responseJson<{ role: string | null }>(
        fetch("/api/auth/session", { cache: "no-store" }),
      ),
    ])
      .then(([nextWorkspace, session]) => {
        if (cancelled) return;
        setWorkspace(nextWorkspace);
        setRole(session.role);
        setSelectedVersionId(nextWorkspace.versions[0]?.id || "");
        hydrateBuilderFromVersion(nextWorkspace.versions[0], nextWorkspace);
        setCaseId(nextWorkspace.cases[0]?.id || "");
        setMarketId(nextWorkspace.markets[0]?.id || "");
      })
      .catch((caught: unknown) => {
        if (!cancelled)
          setError(
            caught instanceof Error
              ? caught.message
              : "Playbook workspace failed to load.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sandbox]);

  const canAdmin = [
    "organization_owner",
    "brokerage_administrator",
    "practice_leader",
  ].includes(role ?? "");
  const selectedVersion = workspace?.versions.find(
    (version) => version.id === selectedVersionId,
  );
  const selectedPlaybook = workspace?.playbooks.find(
    (playbook) => playbook.id === selectedVersion?.playbookId,
  );
  const reviewByVersion = useMemo(
    () =>
      new Map(
        workspace?.reviews.map((review) => [review.playbookVersionId, review]),
      ),
    [workspace?.reviews],
  );
  const requirementById = useMemo(
    () =>
      new Map(workspace?.requirementVersions.map((item) => [item.id, item])),
    [workspace?.requirementVersions],
  );
  const selectedRequirements = (workspace?.requirements ?? []).filter(
    (item) => item.playbookVersionId === selectedVersionId,
  );
  const versionDiff = useMemo(() => {
    if (!workspace || !selectedVersion?.supersedesVersionId) return null;
    const previous = workspace.versions.find(
      (version) => version.id === selectedVersion.supersedesVersionId,
    );
    if (!previous) return null;
    const currentRequirements = workspace.requirements.filter(
      (item) => item.playbookVersionId === selectedVersion.id,
    );
    const previousRequirements = workspace.requirements.filter(
      (item) => item.playbookVersionId === previous.id,
    );
    const currentByRequirement = new Map(
      currentRequirements.map((item) => [item.requirementVersionId, item]),
    );
    const previousByRequirement = new Map(
      previousRequirements.map((item) => [item.requirementVersionId, item]),
    );
    const configuration = (item: PlaybookRequirement) => ({
      position: item.position,
      importance: item.importance,
      blocking: item.blocking,
      acceptedEvidenceTypes: item.acceptedEvidenceTypes,
      freshnessDays: item.freshnessDays,
      requiredScopeType: item.requiredScopeType,
      acceptedSourceTypes: item.acceptedSourceTypes,
      requiredReviewStatus: item.requiredReviewStatus,
      caveat: item.caveat,
      conditions: workspace.rules
        .filter((rule) => rule.playbookRequirementId === item.id)
        .toSorted((left, right) => left.position - right.position)
        .map((rule) => ({
          field: rule.field,
          operator: rule.operator,
          expectedValues: rule.expectedValues,
        })),
    });
    const scopeFields: Array<keyof Version> = [
      "marketId",
      "programId",
      "jurisdiction",
      "peril",
      "propertyClass",
      "policyForm",
      "effectiveFrom",
      "effectiveTo",
    ];
    return {
      fromVersion: previous.versionNumber,
      added: [...currentByRequirement.keys()].filter(
        (id) => !previousByRequirement.has(id),
      ),
      removed: [...previousByRequirement.keys()].filter(
        (id) => !currentByRequirement.has(id),
      ),
      changed: [...currentByRequirement.keys()].filter((id) => {
        const current = currentByRequirement.get(id);
        const prior = previousByRequirement.get(id);
        return (
          current &&
          prior &&
          JSON.stringify(configuration(current)) !==
            JSON.stringify(configuration(prior))
        );
      }),
      scopeChanged: scopeFields.filter(
        (field) => selectedVersion[field] !== previous[field],
      ),
    };
  }, [selectedVersion, workspace]);
  const approvedCount =
    workspace?.versions.filter(
      (version) => reviewByVersion.get(version.id)?.decision === "approved",
    ).length ?? 0;
  const draftCount = (workspace?.versions.length ?? 0) - approvedCount;
  const defaultRuleDraft = (
    requirementId: string,
    index: number,
  ): DraftRequirementConfig => ({
    importance:
      index === selectedRequirementIds.length - 1 ? "recommended" : "required",
    blocking: index === 0,
    freshnessDays: "180",
    requiredScopeType:
      requirementById.get(requirementId)?.scopeType ?? "property",
    evidenceTypes: "inspection_report",
    sourceTypes: "inspector, property_manager",
    conditionField: "program_id",
    conditionOperator: "equals",
    conditionValues: "",
  });
  const ruleDraft = (requirementId: string, index: number) =>
    ruleDrafts[requirementId] ?? defaultRuleDraft(requirementId, index);
  const updateRuleDraft = (
    requirementId: string,
    index: number,
    update: Partial<DraftRequirementConfig>,
  ) => {
    setRuleDrafts((current) => ({
      ...current,
      [requirementId]: {
        ...(current[requirementId] ?? defaultRuleDraft(requirementId, index)),
        ...update,
      },
    }));
  };

  const evaluate = async () => {
    if (!caseId || !marketId) return;
    setPending("evaluate");
    setError(null);
    try {
      if (sandbox) {
        setReadiness(fixtureReadiness);
        setNotice(
          "Deterministic fixture evaluation refreshed. No carrier system or live guidance was queried.",
        );
      } else {
        setReadiness(
          await responseJson<Readiness>(
            fetch(`/api/production/playbooks/cases/${caseId}/evaluate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                marketId,
                programId: programId || undefined,
                policyForm: policyForm || undefined,
              }),
            }),
          ),
        );
      }
    } catch (caught) {
      setReadiness(null);
      setError(
        caught instanceof Error
          ? caught.message
          : "Readiness evaluation failed closed.",
      );
    } finally {
      setPending(null);
    }
  };

  const pinVersion = async () => {
    if (!caseId || !marketId) return;
    setPending("pin");
    setError(null);
    try {
      if (sandbox) {
        setReadiness((current) =>
          current ? { ...current, pinned: true } : current,
        );
        setNotice("Synthetic exact-version link recorded for the walkthrough.");
      } else {
        await responseJson(
          fetch(`/api/production/playbooks/cases/${caseId}/link`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              marketId,
              programId: programId || undefined,
              policyForm: policyForm || undefined,
            }),
          }),
        );
        await evaluate();
        await loadWorkspace();
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Version link failed closed.",
      );
    } finally {
      setPending(null);
    }
  };

  const createDraft = async () => {
    if (
      !workspace ||
      !marketId ||
      !governedSourceVersionId ||
      !selectedRequirementIds.length
    )
      return;
    setPending("create");
    setError(null);
    const requirements = selectedRequirementIds.map(
      (requirementVersionId, index) => {
        const requirement = requirementById.get(requirementVersionId)!;
        const configuration = ruleDraft(requirementVersionId, index);
        return {
          requirementVersionId,
          importance: configuration.importance,
          blocking:
            configuration.importance === "required" && configuration.blocking,
          acceptedEvidenceTypes: configuration.evidenceTypes
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          freshnessDays: Number(configuration.freshnessDays),
          requiredScopeType:
            configuration.requiredScopeType || requirement.scopeType,
          acceptedSourceTypes: configuration.sourceTypes
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          requiredReviewStatus: "human_confirmed",
          conditions: configuration.conditionValues.trim()
            ? [
                {
                  field: configuration.conditionField,
                  operator: configuration.conditionOperator,
                  expectedValues: configuration.conditionValues
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean),
                },
              ]
            : [],
        };
      },
    );
    try {
      if (sandbox) {
        const versionNumber = newPlaybook
          ? 1
          : Math.max(
              0,
              ...workspace.versions
                .filter((item) => item.playbookId === selectedPlaybook?.id)
                .map((item) => item.versionNumber),
            ) + 1;
        const versionId = `playbook-version-synthetic-${crypto.randomUUID()}`;
        const playbookId = newPlaybook
          ? `playbook-synthetic-${crypto.randomUUID()}`
          : (selectedPlaybook?.id ?? `playbook-synthetic-${versionNumber}`);
        const nextVersion: Version = {
          id: versionId,
          playbookId,
          versionNumber,
          marketId,
          programId: programId || null,
          jurisdiction,
          peril,
          propertyClass,
          policyForm: policyForm || null,
          effectiveFrom,
          effectiveTo: effectiveTo || null,
          governedSourceVersionId,
          sourceName,
          sourceUrl,
          sourceVersion,
          sourceCitation,
          verifyCurrent,
          changeSummary,
          contentHash: `${versionNumber}`.repeat(64).slice(0, 64),
          authorSubject: "sandbox-playbook-author",
          supersedesVersionId: newPlaybook
            ? null
            : (selectedVersion?.id ?? null),
        };
        setWorkspace((current) =>
          current
            ? {
                ...current,
                playbooks: current.playbooks.some(
                  (item) => item.id === playbookId,
                )
                  ? current.playbooks
                  : [
                      ...current.playbooks,
                      { id: playbookId, name, description: "Synthetic draft." },
                    ],
                versions: [nextVersion, ...current.versions],
                requirements: [
                  ...requirements.map((item, index) => ({
                    id: `playbook-requirement-synthetic-${versionNumber}-${index}`,
                    playbookVersionId: versionId,
                    requirementVersionId: item.requirementVersionId,
                    position: index + 1,
                    importance: item.importance as "required" | "recommended",
                    blocking: item.blocking,
                    acceptedEvidenceTypes: item.acceptedEvidenceTypes,
                    freshnessDays: item.freshnessDays,
                    requiredScopeType: item.requiredScopeType,
                    acceptedSourceTypes: item.acceptedSourceTypes,
                    requiredReviewStatus: item.requiredReviewStatus,
                    caveat: null,
                  })),
                  ...current.requirements,
                ],
              }
            : current,
        );
        setSelectedVersionId(versionId);
        setNotice(
          "Synthetic draft created. It is not applicable until independent review.",
        );
      } else {
        const created = await responseJson<{ versionId: string }>(
          fetch("/api/production/playbooks/versions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              playbookId: newPlaybook ? undefined : selectedPlaybook?.id,
              name,
              description:
                "Broker-authored destination evidence configuration.",
              marketId,
              programId: programId || undefined,
              jurisdiction,
              peril,
              propertyClass,
              policyForm: policyForm || undefined,
              effectiveFrom,
              effectiveTo: effectiveTo || undefined,
              governedSourceVersionId,
              sourceName,
              sourceUrl,
              sourceVersion,
              sourceCitation,
              verifyCurrent,
              changeSummary,
              supersedesVersionId: newPlaybook
                ? undefined
                : selectedVersion?.id,
              requirements,
            }),
          }),
        );
        setSelectedVersionId(created.versionId);
        setNotice(
          "Immutable draft version created. A different human reviewer must decide it.",
        );
        await loadWorkspace();
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Draft creation failed closed.",
      );
    } finally {
      setPending(null);
    }
  };

  const reviewSelected = async (decision: "approved" | "changes_requested") => {
    if (!selectedVersion) return;
    setPending(`review-${decision}`);
    setError(null);
    try {
      if (sandbox) {
        const next: Review = {
          id: `review-${selectedVersion.id}`,
          playbookVersionId: selectedVersion.id,
          decision,
          reviewerSubject: "sandbox-independent-reviewer",
          note:
            decision === "approved"
              ? "Source, scope, conditions, and blockers reviewed in the synthetic walkthrough."
              : "Synthetic review requested a narrower effective period.",
          reviewedAt: "2026-08-01T12:00:00.000Z",
        };
        setWorkspace((current) =>
          current
            ? {
                ...current,
                reviews: [
                  next,
                  ...current.reviews.filter(
                    (review) => review.playbookVersionId !== selectedVersion.id,
                  ),
                ],
              }
            : current,
        );
        setNotice(
          decision === "approved"
            ? "Synthetic version independently approved for deterministic evaluation."
            : "Synthetic changes-requested decision recorded; create a successor to revise it.",
        );
      } else {
        await responseJson(
          fetch(
            `/api/production/playbooks/versions/${selectedVersion.id}/review`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                decision,
                note:
                  decision === "approved"
                    ? "Source, scope, conditions, and blockers independently reviewed."
                    : "Reviewer requested a successor version with corrected configuration.",
              }),
            },
          ),
        );
        await loadWorkspace();
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Review failed closed.",
      );
    } finally {
      setPending(null);
    }
  };

  if (loading)
    return (
      <section className="playbook-loading" aria-live="polite">
        <LoaderCircle className="spin" size={24} />
        <strong>Loading tenant-scoped playbook versions</strong>
        <span>
          No destination guidance is assumed while this request is pending.
        </span>
      </section>
    );

  return (
    <div className="playbook-workspace">
      <header className="playbook-hero">
        <div>
          <span className="eyebrow">Destination evidence controls</span>
          <h1>Market playbooks</h1>
          <p>
            Configure exact requirement versions by destination and effective
            period. Readiness describes evidence workflow state only.
          </p>
        </div>
        <div className="playbook-assurance">
          <ShieldCheck size={20} />
          <div>
            <strong>
              {sandbox
                ? "Synthetic configuration"
                : "Tenant-isolated production mode"}
            </strong>
            <span>
              Deterministic rules · human-reviewed versions · no outcome score
            </span>
          </div>
        </div>
      </header>

      {error ? (
        <div className="playbook-alert error" role="alert">
          <AlertCircle size={18} />
          <div>
            <strong>Playbook action failed closed</strong>
            <span>{error}</span>
          </div>
          <button
            className="button ghost compact"
            onClick={() => void loadWorkspace()}
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      ) : null}
      {notice ? (
        <div className="playbook-alert success" role="status">
          <Check size={18} />
          <span>{notice}</span>
          <button
            className="icon-button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss message"
          >
            <XCircle size={16} />
          </button>
        </div>
      ) : null}

      <section className="playbook-metrics" aria-label="Playbook summary">
        <div>
          <BookOpenCheck size={18} />
          <span>Stable playbooks</span>
          <strong>{workspace?.playbooks.length ?? 0}</strong>
        </div>
        <div>
          <ShieldCheck size={18} />
          <span>Approved versions</span>
          <strong>{approvedCount}</strong>
        </div>
        <div>
          <CircleDashed size={18} />
          <span>Draft or returned</span>
          <strong>{draftCount}</strong>
        </div>
        <div>
          <LockKeyhole size={18} />
          <span>Pinned case destinations</span>
          <strong>{workspace?.links.length ?? 0}</strong>
        </div>
      </section>

      <nav className="playbook-tabs" aria-label="Playbook workspace sections">
        {[
          ["readiness", "Case readiness", SlidersHorizontal],
          ["builder", "Version builder", Plus],
          ["history", "Version history", History],
        ].map(([key, label, Icon]) => (
          <button
            key={key as string}
            className={view === key ? "active" : ""}
            onClick={() => setView(key as typeof view)}
          >
            <Icon size={16} />
            {label as string}
          </button>
        ))}
      </nav>

      {view === "readiness" ? (
        <section className="playbook-readiness-layout">
          <div className="playbook-panel readiness-control">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Destination selection</span>
                <h2>Evaluate one case</h2>
              </div>
              <LockKeyhole size={18} />
            </div>
            <label>
              Renewal case
              <select
                value={caseId}
                onChange={(event) => setCaseId(event.target.value)}
              >
                <option value="">Select a case</option>
                {workspace?.cases.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Destination market
              <select
                value={marketId}
                onChange={(event) => {
                  setMarketId(event.target.value);
                  setProgramId("");
                }}
              >
                <option value="">Select a market</option>
                {workspace?.markets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Program or policy route
              <select
                value={programId}
                onChange={(event) => setProgramId(event.target.value)}
              >
                <option value="">No program / market default</option>
                {workspace?.programs
                  .filter((item) => item.marketId === marketId)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Policy form
              <input
                value={policyForm}
                onChange={(event) => setPolicyForm(event.target.value)}
              />
            </label>
            <div className="playbook-action-row">
              <button
                className="button primary"
                disabled={!caseId || !marketId || pending !== null}
                onClick={() => void evaluate()}
              >
                {pending === "evaluate" ? (
                  <LoaderCircle className="spin" size={15} />
                ) : (
                  <SlidersHorizontal size={15} />
                )}
                Evaluate exact rules
              </button>
              <button
                className="button secondary"
                disabled={!readiness || readiness.pinned || pending !== null}
                onClick={() => void pinVersion()}
              >
                <LockKeyhole size={15} />
                Pin exact version
              </button>
            </div>
            <p className="control-note">
              No matching version or overlapping approved versions fail closed
              for administrator resolution.
            </p>
          </div>

          {readiness ? (
            <div className="playbook-panel readiness-output">
              <div className={`readiness-decision ${readiness.status}`}>
                <div>
                  <span>{readiness.label}</span>
                  <strong>{readiness.status.replaceAll("_", " ")}</strong>
                </div>
                <div className="readiness-lock">
                  <LockKeyhole size={15} />
                  {readiness.pinned
                    ? `Pinned v${readiness.playbookVersion.versionNumber}`
                    : "Version not pinned"}
                </div>
              </div>
              <div className="calculation-rule">
                <Ban size={18} />
                <div>
                  <strong>No averaged score</strong>
                  <span>{readiness.calculation.rule}</span>
                </div>
              </div>
              <div className="requirement-state-list">
                {readiness.requirements.map((item) => {
                  const presentation = statePresentation[item.state];
                  const Icon = presentation.icon;
                  return (
                    <article
                      key={item.requirementId}
                      className={`requirement-state ${item.state}`}
                    >
                      <div className="requirement-state-icon">
                        <Icon size={17} />
                      </div>
                      <div>
                        <div className="requirement-title">
                          <strong>{item.title}</strong>
                          <span>
                            {item.importance}
                            {item.blocking ? " · blocker" : ""}
                          </span>
                        </div>
                        <p>{item.explanation}</p>
                        <small>
                          {item.evidenceVersionIds.length
                            ? `${item.evidenceVersionIds.length} linked evidence version${item.evidenceVersionIds.length === 1 ? "" : "s"}`
                            : "No qualifying linked evidence"}
                        </small>
                      </div>
                      <span className="requirement-state-label">
                        {presentation.label}
                      </span>
                    </article>
                  );
                })}
              </div>
              <details className="readiness-caveats" open>
                <summary>
                  Unresolved caveats <span>{readiness.caveats.length}</span>
                </summary>
                <ul>
                  {readiness.caveats.map((caveat) => (
                    <li key={caveat}>{caveat}</li>
                  ))}
                </ul>
              </details>
            </div>
          ) : (
            <div className="playbook-panel playbook-empty">
              <SlidersHorizontal size={30} />
              <h2>No readiness evaluation</h2>
              <p>
                Select a case and destination. Fortify will not infer an
                applicable version or treat unavailable evidence as satisfied.
              </p>
            </div>
          )}
        </section>
      ) : null}

      {view === "builder" ? (
        <section className="playbook-builder-layout">
          <div className="playbook-panel builder-form">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Administrator only</span>
                <h2>Create immutable draft</h2>
              </div>
              <LockKeyhole size={18} />
            </div>
            {!canAdmin ? (
              <div className="playbook-inline-warning">
                <Ban size={16} />
                Your role can read versions but cannot author or review them.
              </div>
            ) : null}
            <div className="builder-grid">
              <label className="verify-current wide">
                <input
                  type="checkbox"
                  checked={newPlaybook}
                  onChange={(event) => {
                    setNewPlaybook(event.target.checked);
                    setName(
                      event.target.checked
                        ? ""
                        : (selectedPlaybook?.name ?? ""),
                    );
                  }}
                />
                <span>
                  <strong>Create a new stable playbook</strong>
                  <small>
                    Leave off to create an immutable successor of the selected
                    history version.
                  </small>
                </span>
              </label>
              <label className="wide">
                Playbook name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label>
                Market
                <select
                  value={marketId}
                  onChange={(event) => {
                    setMarketId(event.target.value);
                    setProgramId("");
                  }}
                >
                  <option value="">Select</option>
                  {workspace?.markets.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Program
                <select
                  value={programId}
                  onChange={(event) => setProgramId(event.target.value)}
                >
                  <option value="">No program / market default</option>
                  {workspace?.programs
                    .filter((item) => item.marketId === marketId)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Jurisdiction
                <input
                  value={jurisdiction}
                  onChange={(event) => setJurisdiction(event.target.value)}
                />
              </label>
              <label>
                Peril
                <input
                  value={peril}
                  onChange={(event) => setPeril(event.target.value)}
                />
              </label>
              <label>
                Property class
                <input
                  value={propertyClass}
                  onChange={(event) => setPropertyClass(event.target.value)}
                />
              </label>
              <label>
                Policy form
                <input
                  value={policyForm}
                  onChange={(event) => setPolicyForm(event.target.value)}
                />
              </label>
              <label>
                Effective from
                <input
                  type="date"
                  value={effectiveFrom}
                  onChange={(event) => setEffectiveFrom(event.target.value)}
                />
              </label>
              <label>
                Effective to
                <input
                  type="date"
                  value={effectiveTo}
                  onChange={(event) => setEffectiveTo(event.target.value)}
                />
              </label>
            </div>
            <div className="builder-section-heading">
              <div>
                <strong>Published source pin</strong>
                <span>
                  Source metadata is copied from an immutable governed version.
                </span>
              </div>
              <ShieldCheck size={17} />
            </div>
            <div className="builder-grid">
              <label className="wide">
                Governed source version
                <select
                  value={governedSourceVersionId}
                  onChange={(event) => {
                    const id = event.target.value;
                    const source = workspace?.publishedSourceVersions.find(
                      (item) => item.id === id,
                    );
                    setGovernedSourceVersionId(id);
                    setSourceName(source?.title ?? "");
                    setSourceUrl(source?.officialUrl ?? "");
                    setSourceVersion(source?.versionLabel ?? "");
                    setSourceCitation(
                      source
                        ? `${source.issuingAuthority} — ${source.title} (${source.versionLabel})`
                        : "",
                    );
                    setVerifyCurrent(
                      source?.verifyCurrentStatus === "verified_current",
                    );
                  }}
                >
                  <option value="">Select a published verified-current source</option>
                  {workspace?.publishedSourceVersions.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.issuingAuthority} · {source.title} · {source.versionLabel}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Source name
                <input
                  value={sourceName}
                  readOnly
                />
              </label>
              <label>
                Source version
                <input
                  value={sourceVersion}
                  readOnly
                />
              </label>
              <label className="wide">
                Source URL
                <input
                  type="url"
                  value={sourceUrl}
                  readOnly
                />
              </label>
              <label className="wide">
                Exact citation
                <textarea
                  rows={2}
                  value={sourceCitation}
                  readOnly
                />
              </label>
              <label className="verify-current wide">
                <input
                  type="checkbox"
                  checked={verifyCurrent}
                  readOnly={!sandbox}
                  onChange={
                    sandbox
                      ? (event) => setVerifyCurrent(event.target.checked)
                      : undefined
                  }
                />
                <span>
                  <strong>Verified current</strong>
                  <small>A reviewer still decides the immutable version.</small>
                </span>
              </label>
              <label className="wide">
                Change summary
                <textarea
                  rows={2}
                  value={changeSummary}
                  onChange={(event) => setChangeSummary(event.target.value)}
                />
              </label>
            </div>
          </div>
          <aside className="playbook-panel requirement-picker">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Bounded configuration</span>
                <h2>Requirement set</h2>
              </div>
              <span className="count-badge">
                {selectedRequirementIds.length}
              </span>
            </div>
            {workspace?.requirementVersions.length ? (
              <div className="requirement-picker-list">
                {workspace.requirementVersions.map((item) => {
                  const checked = selectedRequirementIds.includes(item.id);
                  return (
                    <label key={item.id} className={checked ? "selected" : ""}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedRequirementIds((current) =>
                            checked
                              ? current.filter((id) => id !== item.id)
                              : [...current, item.id],
                          )
                        }
                      />
                      <span>
                        <strong>{item.title}</strong>
                        <small>
                          {item.version} · {item.scopeType} scope
                        </small>
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="mini-empty">
                Create requirement versions before authoring a playbook.
              </div>
            )}
            <div className="selected-rule-configs">
              {selectedRequirementIds.map((requirementId, index) => {
                const requirement = requirementById.get(requirementId);
                const configuration = ruleDraft(requirementId, index);
                return (
                  <details
                    key={requirementId}
                    open={expandedRuleIds.includes(requirementId)}
                    onToggle={(event) => {
                      const expanded = event.currentTarget.open;
                      setExpandedRuleIds((current) =>
                        expanded
                          ? current.includes(requirementId)
                            ? current
                            : [...current, requirementId]
                          : current.filter((id) => id !== requirementId),
                      );
                    }}
                  >
                    <summary>
                      <span>{(index + 1).toString().padStart(2, "0")}</span>
                      <strong>
                        {requirement?.title ?? "Unavailable requirement"}
                      </strong>
                      <ChevronRight size={14} />
                    </summary>
                    <div className="rule-config-grid">
                      <label>
                        Importance
                        <select
                          value={configuration.importance}
                          onChange={(event) =>
                            updateRuleDraft(requirementId, index, {
                              importance: event.target
                                .value as DraftRequirementConfig["importance"],
                              blocking:
                                event.target.value === "recommended"
                                  ? false
                                  : configuration.blocking,
                            })
                          }
                        >
                          <option value="required">Required</option>
                          <option value="recommended">Recommended</option>
                        </select>
                      </label>
                      <label className="rule-blocking">
                        <input
                          type="checkbox"
                          checked={configuration.blocking}
                          disabled={configuration.importance !== "required"}
                          onChange={(event) =>
                            updateRuleDraft(requirementId, index, {
                              blocking: event.target.checked,
                            })
                          }
                        />
                        Blocking item
                      </label>
                      <label>
                        Freshness days
                        <input
                          type="number"
                          min="0"
                          value={configuration.freshnessDays}
                          onChange={(event) =>
                            updateRuleDraft(requirementId, index, {
                              freshnessDays: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        Required scope
                        <input
                          value={configuration.requiredScopeType}
                          onChange={(event) =>
                            updateRuleDraft(requirementId, index, {
                              requiredScopeType: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label className="wide">
                        Accepted evidence types
                        <input
                          value={configuration.evidenceTypes}
                          onChange={(event) =>
                            updateRuleDraft(requirementId, index, {
                              evidenceTypes: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label className="wide">
                        Accepted source types
                        <input
                          value={configuration.sourceTypes}
                          onChange={(event) =>
                            updateRuleDraft(requirementId, index, {
                              sourceTypes: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        Condition field
                        <select
                          value={configuration.conditionField}
                          onChange={(event) =>
                            updateRuleDraft(requirementId, index, {
                              conditionField: event.target
                                .value as DraftRequirementConfig["conditionField"],
                            })
                          }
                        >
                          <option value="program_id">Program</option>
                          <option value="market_id">Market</option>
                          <option value="jurisdiction">Jurisdiction</option>
                          <option value="peril">Peril</option>
                          <option value="property_class">Property class</option>
                          <option value="policy_form">Policy form</option>
                        </select>
                      </label>
                      <label>
                        Operator
                        <select
                          value={configuration.conditionOperator}
                          onChange={(event) =>
                            updateRuleDraft(requirementId, index, {
                              conditionOperator: event.target
                                .value as DraftRequirementConfig["conditionOperator"],
                            })
                          }
                        >
                          <option value="equals">Equals</option>
                          <option value="not_equals">Not equals</option>
                          <option value="one_of">One of</option>
                          <option value="not_one_of">Not one of</option>
                        </select>
                      </label>
                      <label className="wide">
                        Condition values{" "}
                        <small>
                          Comma-separated; leave blank for always applicable.
                        </small>
                        <input
                          value={configuration.conditionValues}
                          onChange={(event) =>
                            updateRuleDraft(requirementId, index, {
                              conditionValues: event.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                  </details>
                );
              })}
            </div>
            <div className="configuration-preview">
              <strong>Bounded rule contract</strong>
              <ul>
                <li>Human confirmation is required.</li>
                <li>
                  Evidence type, source, freshness, and exact scope are
                  evaluated together.
                </li>
                <li>Conditions use named fields and bounded operators only.</li>
                <li>No arbitrary code or generated executable condition.</li>
              </ul>
            </div>
            <button
              className="button primary wide-button"
              disabled={
                !canAdmin ||
                !name.trim() ||
                !marketId ||
                !governedSourceVersionId ||
                !selectedRequirementIds.length ||
                pending !== null
              }
              onClick={() => void createDraft()}
            >
              {pending === "create" ? (
                <LoaderCircle className="spin" size={15} />
              ) : (
                <Plus size={15} />
              )}
              Create draft version
            </button>
          </aside>
        </section>
      ) : null}

      {view === "history" ? (
        <section className="playbook-history-layout">
          <div className="playbook-panel version-rail">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Append-only record</span>
                <h2>Versions</h2>
              </div>
              <History size={18} />
            </div>
            {workspace?.versions.length ? (
              workspace.versions.map((version) => (
                <button
                  key={version.id}
                  className={selectedVersionId === version.id ? "active" : ""}
                  onClick={() => {
                    setSelectedVersionId(version.id);
                    hydrateBuilderFromVersion(version, workspace);
                  }}
                >
                  <span
                    className={`version-marker ${statusLabel(version, workspace.reviews).toLowerCase().replaceAll(" ", "-")}`}
                  />
                  <div>
                    <strong>Version {version.versionNumber}</strong>
                    <span>{statusLabel(version, workspace.reviews)}</span>
                    <small>
                      {version.effectiveFrom} → {version.effectiveTo ?? "open"}
                    </small>
                  </div>
                  <ChevronRight size={15} />
                </button>
              ))
            ) : (
              <div className="mini-empty">No versions have been authored.</div>
            )}
          </div>
          {selectedVersion ? (
            <div className="playbook-panel version-detail">
              <div className="version-detail-header">
                <div>
                  <span className="eyebrow">
                    {selectedPlaybook?.name ?? "Playbook"}
                  </span>
                  <h2>Version {selectedVersion.versionNumber}</h2>
                  <p>{selectedVersion.changeSummary}</p>
                </div>
                <span
                  className={`version-status ${statusLabel(
                    selectedVersion,
                    workspace?.reviews ?? [],
                  )
                    .toLowerCase()
                    .replaceAll(" ", "-")}`}
                >
                  {statusLabel(selectedVersion, workspace?.reviews ?? [])}
                </span>
              </div>
              <div className="version-provenance">
                <div>
                  <CalendarRange size={16} />
                  <span>Effective period</span>
                  <strong>
                    {selectedVersion.effectiveFrom} —{" "}
                    {selectedVersion.effectiveTo ?? "open"}
                  </strong>
                </div>
                <div>
                  <ShieldCheck size={16} />
                  <span>Source/version</span>
                  <strong>
                    {selectedVersion.sourceName} ·{" "}
                    {selectedVersion.sourceVersion}
                  </strong>
                </div>
                <div>
                  <LockKeyhole size={16} />
                  <span>Content hash</span>
                  <strong className="mono">
                    {shortHash(selectedVersion.contentHash)}
                  </strong>
                </div>
                <div>
                  <GitCompareArrows size={16} />
                  <span>Supersedes</span>
                  <strong>
                    {selectedVersion.supersedesVersionId
                      ? "Prior immutable version"
                      : "Initial version"}
                  </strong>
                </div>
              </div>
              <div className="version-source-citation">
                <div>
                  <strong>Source citation</strong>
                  <span>{selectedVersion.sourceCitation}</span>
                </div>
                <a
                  href={selectedVersion.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open configured source <ArrowRight size={13} />
                </a>
                <span
                  className={
                    selectedVersion.verifyCurrent ? "verified" : "unverified"
                  }
                >
                  {selectedVersion.verifyCurrent
                    ? "Verified current by author"
                    : "Current status unverified"}
                </span>
              </div>
              <div className="version-scope">
                <span>{selectedVersion.jurisdiction}</span>
                <ArrowRight size={13} />
                <span>{selectedVersion.peril}</span>
                <ArrowRight size={13} />
                <span>{selectedVersion.propertyClass}</span>
                <ArrowRight size={13} />
                <span>
                  {workspace?.markets.find(
                    (item) => item.id === selectedVersion.marketId,
                  )?.name ?? "Unknown market"}
                </span>
                {selectedVersion.programId ? (
                  <>
                    <ArrowRight size={13} />
                    <span>
                      {workspace?.programs.find(
                        (item) => item.id === selectedVersion.programId,
                      )?.name ?? "Unknown program"}
                    </span>
                  </>
                ) : null}
                {selectedVersion.policyForm ? (
                  <>
                    <ArrowRight size={13} />
                    <span>{selectedVersion.policyForm}</span>
                  </>
                ) : null}
              </div>
              {versionDiff ? (
                <div className="version-diff">
                  <div>
                    <GitCompareArrows size={17} />
                    <span>
                      <strong>Change diff</strong>
                      <small>
                        Version {versionDiff.fromVersion} → {selectedVersion.versionNumber}
                      </small>
                    </span>
                  </div>
                  <dl>
                    <div><dt>Added</dt><dd>{versionDiff.added.length}</dd></div>
                    <div><dt>Removed</dt><dd>{versionDiff.removed.length}</dd></div>
                    <div><dt>Changed</dt><dd>{versionDiff.changed.length}</dd></div>
                    <div><dt>Scope fields</dt><dd>{versionDiff.scopeChanged.length}</dd></div>
                  </dl>
                </div>
              ) : null}
              <div className="version-requirements">
                <div className="builder-section-heading">
                  <div>
                    <strong>Destination requirements</strong>
                    <span>
                      Order, blocker, scope, freshness, and review state are
                      version-bound.
                    </span>
                  </div>
                  <span>{selectedRequirements.length}</span>
                </div>
                {selectedRequirements.map((item) => {
                  const requirement = requirementById.get(
                    item.requirementVersionId,
                  );
                  return (
                    <div key={item.id} className="version-requirement-row">
                      <span>{item.position.toString().padStart(2, "0")}</span>
                      <div>
                        <strong>
                          {requirement?.title ?? "Unavailable requirement"}
                        </strong>
                        <small>
                          {item.importance}
                          {item.blocking ? " · blocking" : ""} ·{" "}
                          {item.requiredScopeType} ·{" "}
                          {item.freshnessDays ?? "no"}-day freshness ·{" "}
                          {item.requiredReviewStatus}
                        </small>
                      </div>
                      <code>{requirement?.version ?? "?"}</code>
                    </div>
                  );
                })}
              </div>
              <div className="review-record">
                {reviewByVersion.get(selectedVersion.id) ? (
                  <>
                    <CheckCircle2 size={18} />
                    <div>
                      <strong>
                        {reviewByVersion
                          .get(selectedVersion.id)
                          ?.decision.replaceAll("_", " ")}
                      </strong>
                      <span>
                        {reviewByVersion.get(selectedVersion.id)?.note}
                      </span>
                      <small>
                        Reviewer{" "}
                        {
                          reviewByVersion.get(selectedVersion.id)
                            ?.reviewerSubject
                        }{" "}
                        · author {selectedVersion.authorSubject}
                      </small>
                    </div>
                  </>
                ) : (
                  <>
                    <CircleDashed size={18} />
                    <div>
                      <strong>Independent review pending</strong>
                      <span>
                        This draft cannot be selected by deterministic
                        applicability resolution.
                      </span>
                    </div>
                  </>
                )}
              </div>
              {!reviewByVersion.has(selectedVersion.id) && canAdmin ? (
                <div className="playbook-action-row review-actions">
                  <button
                    className="button primary"
                    disabled={
                      !selectedVersion.verifyCurrent || pending !== null
                    }
                    onClick={() => void reviewSelected("approved")}
                  >
                    <Check size={15} />
                    Approve version
                  </button>
                  <button
                    className="button secondary"
                    disabled={pending !== null}
                    onClick={() => void reviewSelected("changes_requested")}
                  >
                    <AlertCircle size={15} />
                    Request successor
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="playbook-panel playbook-empty">
              <History size={28} />
              <h2>No version selected</h2>
              <p>
                Select an immutable version to inspect source, scope, diff
                lineage, and independent review.
              </p>
            </div>
          )}
        </section>
      ) : null}

      <footer className="playbook-footer-note">
        <AlertCircle size={16} />
        <span>
          Configured guidance must be rights-cleared and verified current.
          Fortify reports evidence readiness only; it does not determine
          compliance, eligibility, pricing, acceptance, renewal, or
          insurability.
        </span>
        <Link href="/reports">
          Audit record <ChevronRight size={14} />
        </Link>
      </footer>
    </div>
  );
}
