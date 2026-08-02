"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  FileCheck2,
  FileClock,
  FileKey2,
  GitCompareArrows,
  LoaderCircle,
  LockKeyhole,
  Plus,
  RefreshCw,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type RuntimeMode = "sandbox" | "production";
type Source = {
  id: string;
  canonicalKey: string;
  sourceClass: string;
  issuingAuthority: string;
  title: string;
  jurisdiction: string;
  officialUrl: string;
  authorityTier: string;
  reviewOwnerSubject: string;
};
type SourceVersion = {
  id: string;
  sourceId: string;
  versionNumber: number;
  versionLabel: string;
  publicationDate: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  retrievalDate: string;
  sourceHash: string;
  snapshotState: string;
  rightsStatus: string;
  redistributionAllowed: boolean;
  useRestrictions: string;
  structuredSummary: Record<string, string>;
  verifyCurrentStatus: string;
  nextReviewDate: string;
  extractionMethod: string;
  humanConfirmed: boolean;
  authorSubject: string;
  changeSummary: string;
  supersedesVersionId: string | null;
};
type Review = {
  id: string;
  sourceVersionId: string;
  decision: "approved" | "changes_requested";
  reviewerSubject: string;
  note: string;
  sourceCompared: boolean;
  rightsConfirmed: boolean;
  reviewedAt: string;
};
type Publication = {
  id: string;
  sourceVersionId: string;
  decision: "published" | "rejected";
  publisherSubject: string;
  note: string;
  publishedAt: string;
};
type Dependency = {
  id: string;
  sourceVersionId: string;
  consumerType: "playbook_version" | "renewal_case" | "target_profile_version" | "external_model_version" | "market_commitment_version" | "analytics_report";
  consumerId: string;
  relationship: "relied_on" | "reference_only" | "input_lineage";
  rationale: string;
  pinnedAt: string;
};
type ImpactSnapshot = {
  affected: {
    playbooks: Array<{ id: string; versionId: string; name: string }>;
    cases: Array<{ id: string; title: string; renewalDate: string }>;
    profiles: { state: string; items: Array<{ id: string; versionId: string; name: string }> };
    reports: { state: string; items: Array<{ id: string; title: string; reportType: string }> };
  };
  limitations: string[];
};
type Alert = {
  id: string;
  sourceId: string;
  fromVersionId: string;
  toVersionId: string;
  impactSnapshot: ImpactSnapshot;
  ownerSubject: string;
  createdAtEvent: string;
};
type Workspace = {
  sources: Source[];
  versions: SourceVersion[];
  reviews: Review[];
  publications: Publication[];
  dependencies: Dependency[];
  alerts: Alert[];
  unavailableImpactTargets: { reports: string };
  doctrine: {
    extractedRulesAutomaticallyOperative: false;
    publicationRequiresHumanConfirmation: true;
    publicationRequiresIndependentReview: true;
  };
};

const fixtureSources: Source[] = [
  {
    id: "source-cdi-safer",
    canonicalKey: "ca-cdi-safer-from-wildfires",
    sourceClass: "regulator_guidance",
    issuingAuthority: "California Department of Insurance",
    title: "Safer from Wildfires",
    jurisdiction: "California",
    officialUrl:
      "https://www.insurance.ca.gov/01-consumers/200-wrr/Safer-from-Wildfires.cfm",
    authorityTier: "primary",
    reviewOwnerSubject: "programme-owner@fixture.test",
  },
  {
    id: "source-cdi-rate",
    canonicalKey: "ca-cdi-prior-approval-factors",
    sourceClass: "statute_regulation",
    issuingAuthority: "California Department of Insurance",
    title: "Prior Approval Rate Filing Information",
    jurisdiction: "California",
    officialUrl:
      "https://www.insurance.ca.gov/0250-insurers/0800-rate-filings/0200-prior-approval-factors/index.cfm",
    authorityTier: "primary",
    reviewOwnerSubject: "legal-ops@fixture.test",
  },
  {
    id: "source-bof-zone",
    canonicalKey: "ca-bof-defensible-space-zones",
    sourceClass: "cal_fire_programme",
    issuingAuthority: "California Board of Forestry and Fire Protection",
    title: "Defensible Space Zones 0, 1, and 2",
    jurisdiction: "California",
    officialUrl:
      "https://bof.fire.ca.gov/projects-and-programs/defensible-space-zones-0-1-and-2",
    authorityTier: "primary",
    reviewOwnerSubject: "programme-owner@fixture.test",
  },
];

const fixtureVersions: SourceVersion[] = [
  {
    id: "source-version-cdi-1",
    sourceId: "source-cdi-safer",
    versionNumber: 1,
    versionLabel: "retrieved-2026-07-15",
    publicationDate: null,
    effectiveFrom: null,
    effectiveTo: null,
    retrievalDate: "2026-07-15",
    sourceHash: "8a11d7fc2161af22f9d311dc94de980a158cbbf0c6dbbb420ee0094f5856c8de",
    snapshotState: "metadata_only_restricted",
    rightsStatus: "restricted",
    redistributionAllowed: false,
    useRestrictions:
      "Fixture retains official URL and reviewed metadata only; verify the primary page before use.",
    structuredSummary: {
      scope: "California public wildfire-mitigation information",
      use: "Reference context only; destination rules require separate review",
    },
    verifyCurrentStatus: "verified_current",
    nextReviewDate: "2026-08-15",
    extractionMethod: "human_authored",
    humanConfirmed: true,
    authorSubject: "source-author@fixture.test",
    changeSummary: "Initial governed metadata boundary.",
    supersedesVersionId: null,
  },
  {
    id: "source-version-cdi-2",
    sourceId: "source-cdi-safer",
    versionNumber: 2,
    versionLabel: "retrieved-2026-08-01",
    publicationDate: null,
    effectiveFrom: null,
    effectiveTo: null,
    retrievalDate: "2026-08-01",
    sourceHash: "c4a39f50a9b40b865e40dd4b4ce7bc65bfa9503fa73ea3957086efb75fb2cbdf",
    snapshotState: "metadata_only_restricted",
    rightsStatus: "restricted",
    redistributionAllowed: false,
    useRestrictions:
      "Fixture retains official URL and reviewed metadata only; no proprietary content is reproduced.",
    structuredSummary: {
      scope: "Successor retrieval for impact demonstration",
      use: "Human-reviewed reference metadata, not an operative rule",
    },
    verifyCurrentStatus: "verified_current",
    nextReviewDate: "2026-09-01",
    extractionMethod: "deterministic_extraction",
    humanConfirmed: true,
    authorSubject: "source-author@fixture.test",
    changeSummary: "Refresh retrieval and structured summary.",
    supersedesVersionId: "source-version-cdi-1",
  },
  {
    id: "source-version-rate-1",
    sourceId: "source-cdi-rate",
    versionNumber: 1,
    versionLabel: "page-retrieved-2026-08-01",
    publicationDate: null,
    effectiveFrom: null,
    effectiveTo: null,
    retrievalDate: "2026-08-01",
    sourceHash: "69b8e8cb47f06b3f372ea4515775055e37d95f849f3eb4068df027b62e9f91d8",
    snapshotState: "metadata_only_restricted",
    rightsStatus: "restricted",
    redistributionAllowed: false,
    useRestrictions:
      "Index metadata only. Any filing or rule requires its own governed version.",
    structuredSummary: {
      scope: "Official index for rate-plan and wildfire-model materials",
      boundary: "An index entry is not an insurer commitment or operative rule",
    },
    verifyCurrentStatus: "verified_current",
    nextReviewDate: "2026-08-15",
    extractionMethod: "human_authored",
    humanConfirmed: true,
    authorSubject: "rate-source-author@fixture.test",
    changeSummary: "Initial index registration.",
    supersedesVersionId: null,
  },
  {
    id: "source-version-zone-1",
    sourceId: "source-bof-zone",
    versionNumber: 1,
    versionLabel: "draft-materials-retrieved-2026-08-01",
    publicationDate: null,
    effectiveFrom: null,
    effectiveTo: null,
    retrievalDate: "2026-08-01",
    sourceHash: "3a5b54db452686283aac567fc2a932f5a3a1502f6a0d050e22214d041493b8ee",
    snapshotState: "metadata_only_restricted",
    rightsStatus: "pending",
    redistributionAllowed: false,
    useRestrictions:
      "Candidate metadata only. Draft and meeting materials remain non-operative.",
    structuredSummary: {
      state: "Candidate includes draft and meeting material",
      blocker: "Rights and current-status review incomplete",
    },
    verifyCurrentStatus: "verification_due",
    nextReviewDate: "2026-08-08",
    extractionMethod: "model_assisted",
    humanConfirmed: false,
    authorSubject: "intake-operator@fixture.test",
    changeSummary: "Candidate discovered; no rule activated.",
    supersedesVersionId: null,
  },
];

const fixtureWorkspace: Workspace = {
  sources: fixtureSources,
  versions: fixtureVersions,
  reviews: [
    {
      id: "review-cdi-1",
      sourceVersionId: "source-version-cdi-1",
      decision: "approved",
      reviewerSubject: "source-reviewer@fixture.test",
      note: "Authority, metadata, and restricted-use boundary independently checked.",
      sourceCompared: true,
      rightsConfirmed: true,
      reviewedAt: "2026-07-15T18:00:00.000Z",
    },
    {
      id: "review-cdi-2",
      sourceVersionId: "source-version-cdi-2",
      decision: "approved",
      reviewerSubject: "source-reviewer@fixture.test",
      note: "Successor compared with the primary page; no automatic rule change.",
      sourceCompared: true,
      rightsConfirmed: true,
      reviewedAt: "2026-08-01T17:00:00.000Z",
    },
    {
      id: "review-rate-1",
      sourceVersionId: "source-version-rate-1",
      decision: "approved",
      reviewerSubject: "rate-reviewer@fixture.test",
      note: "Official index and metadata-only boundary independently checked.",
      sourceCompared: true,
      rightsConfirmed: true,
      reviewedAt: "2026-08-01T17:10:00.000Z",
    },
  ],
  publications: [
    {
      id: "publication-cdi-1",
      sourceVersionId: "source-version-cdi-1",
      decision: "published",
      publisherSubject: "source-publisher@fixture.test",
      note: "Published for bounded reference use.",
      publishedAt: "2026-07-15T18:15:00.000Z",
    },
    {
      id: "publication-cdi-2",
      sourceVersionId: "source-version-cdi-2",
      decision: "published",
      publisherSubject: "source-publisher@fixture.test",
      note: "Published successor; relied-on records require human impact review.",
      publishedAt: "2026-08-01T17:15:00.000Z",
    },
    {
      id: "publication-rate-1",
      sourceVersionId: "source-version-rate-1",
      decision: "published",
      publisherSubject: "source-publisher@fixture.test",
      note: "Published as a reference index only.",
      publishedAt: "2026-08-01T17:20:00.000Z",
    },
  ],
  dependencies: [
    {
      id: "dependency-playbook",
      sourceVersionId: "source-version-cdi-1",
      consumerType: "playbook_version",
      consumerId: "playbook-version-fixture-2",
      relationship: "relied_on",
      rationale: "Pinned by the fictional California destination playbook.",
      pinnedAt: "2026-07-20T16:00:00.000Z",
    },
    {
      id: "dependency-case",
      sourceVersionId: "source-version-cdi-1",
      consumerType: "renewal_case",
      consumerId: "case-fixture-red-rock",
      relationship: "relied_on",
      rationale: "Pinned through the case playbook link.",
      pinnedAt: "2026-07-21T16:00:00.000Z",
    },
  ],
  alerts: [
    {
      id: "alert-cdi-successor",
      sourceId: "source-cdi-safer",
      fromVersionId: "source-version-cdi-1",
      toVersionId: "source-version-cdi-2",
      ownerSubject: "programme-owner@fixture.test",
      createdAtEvent: "2026-08-01T17:15:00.000Z",
      impactSnapshot: {
        affected: {
          playbooks: [
            {
              id: "playbook-fixture-summit",
              versionId: "playbook-version-fixture-2",
              name: "Fictional California recognition evidence",
            },
          ],
          cases: [
            {
              id: "case-fixture-red-rock",
              title: "Red Rock Villas renewal evidence case",
              renewalDate: "2027-01-15",
            },
          ],
          profiles: { state: "available", items: [{ id: "profile-ca-community-wildfire", versionId: "profile-ca-community-wildfire-v1", name: "California community wildfire evidence-readiness" }] },
          reports: { state: "available", items: [{ id: "report-programme-fixture", title: "Programme outcome report", reportType: "programme_outcome" }] },
        },
        limitations: [
          "The exact relied-on profile version is flagged without being changed.",
          "The exact generated report is flagged without being silently regenerated.",
          "The alert does not mutate a playbook or case.",
        ],
      },
    },
  ],
  unavailableImpactTargets: {
    reports: "Generated analytics reports preserve exact source-version lineage and require explicit regeneration after source change.",
  },
  doctrine: {
    extractedRulesAutomaticallyOperative: false,
    publicationRequiresHumanConfirmation: true,
    publicationRequiresIndependentReview: true,
  },
};

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function publicationFor(workspace: Workspace, versionId: string) {
  return workspace.publications.find(
    (publication) => publication.sourceVersionId === versionId,
  );
}

function reviewFor(workspace: Workspace, versionId: string) {
  return workspace.reviews.find(
    (review) => review.sourceVersionId === versionId,
  );
}

function lifecycleLabel(workspace: Workspace, version: SourceVersion) {
  const publication = publicationFor(workspace, version.id);
  const review = reviewFor(workspace, version.id);
  if (publication?.decision === "published") return "Published";
  if (publication?.decision === "rejected") return "Publication rejected";
  if (review?.decision === "approved") return "Approved · awaiting publisher";
  if (review?.decision === "changes_requested") return "Changes requested";
  return "Candidate · non-operative";
}

export function GovernedSourceWorkspace({ mode }: { mode: RuntimeMode }) {
  const sandbox = mode === "sandbox";
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"register" | "versions" | "impact">(
    "versions",
  );
  const [selectedSourceId, setSelectedSourceId] = useState(
    fixtureSources[0].id,
  );
  const [selectedVersionId, setSelectedVersionId] = useState(
    "source-version-cdi-2",
  );
  const [busy, setBusy] = useState(false);
  const [canonicalKey, setCanonicalKey] = useState("ca-source-candidate");
  const [issuingAuthority, setIssuingAuthority] = useState(
    "California programme authority",
  );
  const [title, setTitle] = useState("New governed source candidate");
  const [officialUrl, setOfficialUrl] = useState("https://example.test/source");
  const [sourceClass, setSourceClass] = useState("regulator_guidance");
  const [authorityTier, setAuthorityTier] = useState("primary");
  const [versionLabel, setVersionLabel] = useState("retrieved-2026-08-01");
  const [sourceHash, setSourceHash] = useState(
    "d7e64e76c736ab9f44a8e1369490050f4d15085422df6b53d1ccf37bb73f0671",
  );
  const [summary, setSummary] = useState(
    "Candidate metadata awaiting independent source and rights review.",
  );
  const [successorOf, setSuccessorOf] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (sandbox) {
        await new Promise((resolve) => window.setTimeout(resolve, 120));
        setWorkspace(structuredClone(fixtureWorkspace));
      } else {
        const response = await fetch("/api/production/sources/workspace", {
          cache: "no-store",
        });
        const payload = (await response.json()) as Workspace & { error?: string };
        if (!response.ok)
          throw new Error(payload.error ?? "Unable to load the source register.");
        setWorkspace(payload);
        if (payload.sources[0]) setSelectedSourceId(payload.sources[0].id);
        if (payload.versions[0]) setSelectedVersionId(payload.versions[0].id);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load the source register.",
      );
    } finally {
      setLoading(false);
    }
  }, [sandbox]);

  useEffect(() => {
    let cancelled = false;
    if (sandbox) {
      const timeout = window.setTimeout(() => {
        if (cancelled) return;
        setWorkspace(structuredClone(fixtureWorkspace));
        setLoading(false);
      }, 120);
      return () => {
        cancelled = true;
        window.clearTimeout(timeout);
      };
    }
    void fetch("/api/production/sources/workspace", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as Workspace & {
          error?: string;
        };
        if (!response.ok)
          throw new Error(payload.error ?? "Unable to load the source register.");
        return payload;
      })
      .then((payload) => {
        if (cancelled) return;
        setWorkspace(payload);
        if (payload.sources[0]) setSelectedSourceId(payload.sources[0].id);
        if (payload.versions[0]) setSelectedVersionId(payload.versions[0].id);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load the source register.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sandbox]);

  const selectedSource = workspace?.sources.find(
    (source) => source.id === selectedSourceId,
  );
  const sourceVersions = useMemo(
    () =>
      (workspace?.versions ?? [])
        .filter((version) => version.sourceId === selectedSourceId)
        .toSorted((left, right) => right.versionNumber - left.versionNumber),
    [selectedSourceId, workspace?.versions],
  );
  const selectedVersion =
    workspace?.versions.find((version) => version.id === selectedVersionId) ??
    sourceVersions[0];
  const selectedReview =
    workspace && selectedVersion
      ? reviewFor(workspace, selectedVersion.id)
      : undefined;
  const selectedPublication =
    workspace && selectedVersion
      ? publicationFor(workspace, selectedVersion.id)
      : undefined;
  const publishedCount =
    workspace?.publications.filter((item) => item.decision === "published")
      .length ?? 0;
  const blockedCount =
    workspace?.versions.filter(
      (version) =>
        !publicationFor(workspace, version.id) &&
        (version.verifyCurrentStatus !== "verified_current" ||
          !version.humanConfirmed ||
          version.rightsStatus === "pending"),
    ).length ?? 0;

  function chooseSource(sourceId: string) {
    setSelectedSourceId(sourceId);
    const next = workspace?.versions
      .filter((version) => version.sourceId === sourceId)
      .toSorted((left, right) => right.versionNumber - left.versionNumber)[0];
    if (next) setSelectedVersionId(next.id);
  }

  function stageSuccessor() {
    if (!selectedSource || !sourceVersions[0]) return;
    setSuccessorOf(sourceVersions[0].id);
    setCanonicalKey(selectedSource.canonicalKey);
    setIssuingAuthority(selectedSource.issuingAuthority);
    setTitle(selectedSource.title);
    setOfficialUrl(selectedSource.officialUrl);
    setSourceClass(selectedSource.sourceClass);
    setAuthorityTier(selectedSource.authorityTier);
    setVersionLabel(`successor-${sourceVersions[0].versionNumber + 1}`);
    setSummary("Successor candidate awaiting exact-source comparison.");
    setTab("register");
    setNotice("Successor form staged. Nothing is operative until review and publication.");
  }

  async function registerCandidate() {
    if (!workspace) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (sandbox) {
        const sourceId = successorOf
          ? selectedSourceId
          : `source-sandbox-${crypto.randomUUID()}`;
        const sourceVersionId = `source-version-sandbox-${crypto.randomUUID()}`;
        const now = new Date().toISOString();
        const source = successorOf
          ? selectedSource
          : {
              id: sourceId,
              canonicalKey,
              sourceClass,
              issuingAuthority,
              title,
              jurisdiction: "California",
              officialUrl,
              authorityTier,
              reviewOwnerSubject: "programme-owner@fixture.test",
            };
        if (!source) throw new Error("Select a source before adding a successor.");
        const nextVersion: SourceVersion = {
          id: sourceVersionId,
          sourceId,
          versionNumber: successorOf ? sourceVersions[0].versionNumber + 1 : 1,
          versionLabel,
          publicationDate: null,
          effectiveFrom: null,
          effectiveTo: null,
          retrievalDate: now.slice(0, 10),
          sourceHash,
          snapshotState: "metadata_only_restricted",
          rightsStatus: "restricted",
          redistributionAllowed: false,
          useRestrictions:
            "Metadata-only fixture. Verify source rights before any redistribution.",
          structuredSummary: { scope: summary, operative: "No" },
          verifyCurrentStatus: "verified_current",
          nextReviewDate: "2026-09-01",
          extractionMethod: "deterministic_extraction",
          humanConfirmed: true,
          authorSubject: "source-author@fixture.test",
          changeSummary: successorOf
            ? "Sandbox successor candidate."
            : "Sandbox initial candidate.",
          supersedesVersionId: successorOf,
        };
        setWorkspace({
          ...workspace,
          sources: successorOf ? workspace.sources : [...workspace.sources, source],
          versions: [nextVersion, ...workspace.versions],
        });
        setSelectedSourceId(sourceId);
        setSelectedVersionId(sourceVersionId);
      } else {
        let sourceId = selectedSourceId;
        if (!successorOf) {
          const sourceResponse = await fetch("/api/production/sources", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              canonicalKey,
              sourceClass,
              issuingAuthority,
              title,
              jurisdiction: "California",
              officialUrl,
              authorityTier,
              reviewOwnerSubject: "source-governance-owner",
            }),
          });
          const sourcePayload = (await sourceResponse.json()) as {
            sourceId?: string;
            error?: string;
          };
          if (!sourceResponse.ok || !sourcePayload.sourceId)
            throw new Error(sourcePayload.error ?? "Unable to register source.");
          sourceId = sourcePayload.sourceId;
        }
        const versionResponse = await fetch(
          `/api/production/sources/${sourceId}/versions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              versionLabel,
              retrievalDate: new Date().toISOString().slice(0, 10),
              sourceHash,
              snapshotState: "metadata_only_restricted",
              rightsStatus: "restricted",
              redistributionAllowed: false,
              useRestrictions:
                "Metadata-only record; verify the official source and use rights before reliance.",
              structuredSummary: { scope: summary, operative: "No" },
              verifyCurrentStatus: "verified_current",
              nextReviewDate: "2026-09-01",
              extractionMethod: "deterministic_extraction",
              humanConfirmed: true,
              changeSummary: successorOf
                ? "Successor candidate registered by a human author."
                : "Initial candidate registered by a human author.",
              supersedesVersionId: successorOf ?? undefined,
            }),
          },
        );
        const versionPayload = (await versionResponse.json()) as {
          error?: string;
        };
        if (!versionResponse.ok)
          throw new Error(
            versionPayload.error ?? "Unable to register source version.",
          );
        await loadWorkspace();
      }
      setSuccessorOf(null);
      setTab("versions");
      setNotice(
        "Candidate registered as non-operative. Independent review is still required.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Candidate failed.");
    } finally {
      setBusy(false);
    }
  }

  async function reviewSelected() {
    if (!workspace || !selectedVersion) return;
    setBusy(true);
    setError("");
    try {
      if (sandbox) {
        const review: Review = {
          id: `review-sandbox-${crypto.randomUUID()}`,
          sourceVersionId: selectedVersion.id,
          decision: "approved",
          reviewerSubject: "source-reviewer@fixture.test",
          note: "Exact source boundary and rights decision independently reviewed.",
          sourceCompared: true,
          rightsConfirmed: true,
          reviewedAt: new Date().toISOString(),
        };
        setWorkspace({ ...workspace, reviews: [review, ...workspace.reviews] });
      } else {
        const response = await fetch(
          `/api/production/sources/versions/${selectedVersion.id}/review`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              decision: "approved",
              note: "Exact source and rights decision independently reviewed.",
              sourceCompared: true,
              rightsConfirmed: true,
            }),
          },
        );
        const payload = (await response.json()) as { error?: string };
        if (!response.ok)
          throw new Error(payload.error ?? "Unable to approve source version.");
        await loadWorkspace();
      }
      setNotice("Independent review recorded. Publication remains a separate decision.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Review failed.");
    } finally {
      setBusy(false);
    }
  }

  async function publishSelected() {
    if (!workspace || !selectedVersion || !selectedReview) return;
    setBusy(true);
    setError("");
    try {
      if (sandbox) {
        const publication: Publication = {
          id: `publication-sandbox-${crypto.randomUUID()}`,
          sourceVersionId: selectedVersion.id,
          decision: "published",
          publisherSubject: "source-publisher@fixture.test",
          note: "Published for bounded reference use after independent review.",
          publishedAt: new Date().toISOString(),
        };
        let alerts = workspace.alerts;
        if (selectedVersion.supersedesVersionId) {
          const priorDependencies = workspace.dependencies.filter(
            (dependency) =>
              dependency.sourceVersionId === selectedVersion.supersedesVersionId,
          );
          if (priorDependencies.length) {
            alerts = [
              {
                id: `alert-sandbox-${crypto.randomUUID()}`,
                sourceId: selectedVersion.sourceId,
                fromVersionId: selectedVersion.supersedesVersionId,
                toVersionId: selectedVersion.id,
                ownerSubject:
                  selectedSource?.reviewOwnerSubject ?? "source-owner@fixture.test",
                createdAtEvent: publication.publishedAt,
                impactSnapshot: {
                  affected: {
                    playbooks: priorDependencies
                      .filter((item) => item.consumerType === "playbook_version")
                      .map((item) => ({
                        id: item.consumerId,
                        versionId: item.consumerId,
                        name: "Pinned market playbook",
                      })),
                    cases: priorDependencies
                      .filter((item) => item.consumerType === "renewal_case")
                      .map((item) => ({
                        id: item.consumerId,
                        title: "Pinned renewal case",
                        renewalDate: "Unavailable in fixture dependency",
                      })),
                    profiles: {
                      state: "unavailable_not_implemented",
                      items: [],
                    },
                    reports: { state: "available", items: [] },
                  },
                  limitations: [
                    "Publication creates an alert; it does not mutate relied-on records.",
                  ],
                },
              },
              ...alerts,
            ];
          }
        }
        setWorkspace({
          ...workspace,
          publications: [publication, ...workspace.publications],
          alerts,
        });
      } else {
        const response = await fetch(
          `/api/production/sources/versions/${selectedVersion.id}/publish`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              decision: "published",
              note: "Published for bounded reference use after independent review.",
            }),
          },
        );
        const payload = (await response.json()) as { error?: string };
        if (!response.ok)
          throw new Error(payload.error ?? "Unable to publish source version.");
        await loadWorkspace();
      }
      setNotice(
        "Published. Any predecessor reliance is preserved and surfaced for impact review.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Publication failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <section className="source-loading" aria-live="polite">
        <LoaderCircle className="spin" size={22} />
        <strong>Loading governed source lineage</strong>
        <span>Checking publication, rights, and reliance records.</span>
      </section>
    );

  return (
    <div className="source-workspace">
      <header className="source-hero">
        <div>
          <p className="eyebrow">Governed knowledge · California</p>
          <h1>Source register</h1>
          <p>
            Publish exact, human-reviewed source versions and trace every record
            that relies on them. Extraction can propose facts; it cannot activate a
            rule.
          </p>
        </div>
        <div className="source-assurance" aria-label="Publication controls">
          <LockKeyhole size={19} />
          <div>
            <strong>Fail-closed publication</strong>
            <span>Author ≠ reviewer · human confirmation · rights recorded</span>
          </div>
        </div>
      </header>

      {error ? (
        <div className="source-alert error" role="alert">
          <AlertTriangle size={18} />
          <div>
            <strong>Source workflow stopped</strong>
            <span>{error}</span>
          </div>
          <button className="button ghost compact" onClick={() => void loadWorkspace()}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      ) : null}
      {notice ? (
        <div className="source-alert success" role="status">
          <CheckCircle2 size={18} />
          <span>{notice}</span>
        </div>
      ) : null}

      <section className="source-metrics" aria-label="Source register summary">
        <div>
          <BookOpenCheck size={18} />
          <span>Stable sources</span>
          <strong>{workspace?.sources.length ?? 0}</strong>
        </div>
        <div>
          <FileCheck2 size={18} />
          <span>Published versions</span>
          <strong>{publishedCount}</strong>
        </div>
        <div>
          <FileClock size={18} />
          <span>Blocked candidates</span>
          <strong>{blockedCount}</strong>
        </div>
        <div>
          <GitCompareArrows size={18} />
          <span>Change alerts</span>
          <strong>{workspace?.alerts.length ?? 0}</strong>
        </div>
      </section>

      <nav className="source-tabs" aria-label="Source register sections">
        {(
          [
            ["versions", "Register & versions"],
            ["register", successorOf ? "Stage successor" : "New candidate"],
            ["impact", "Change impact"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            className={tab === value ? "active" : ""}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "versions" ? (
        workspace?.sources.length ? (
          <section className="source-grid">
            <aside className="source-panel source-list">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Authority register</p>
                  <h2>Sources</h2>
                </div>
                <button
                  className="icon-button"
                  aria-label="Register a source"
                  onClick={() => {
                    setSuccessorOf(null);
                    setTab("register");
                  }}
                >
                  <Plus size={17} />
                </button>
              </div>
              {workspace.sources.map((source) => {
                const count = workspace.versions.filter(
                  (version) => version.sourceId === source.id,
                ).length;
                return (
                  <button
                    key={source.id}
                    className={selectedSourceId === source.id ? "active" : ""}
                    onClick={() => chooseSource(source.id)}
                  >
                    <span>{source.issuingAuthority}</span>
                    <strong>{source.title}</strong>
                    <small>
                      {formatLabel(source.sourceClass)} · {count} version
                      {count === 1 ? "" : "s"}
                    </small>
                  </button>
                );
              })}
            </aside>

            <div className="source-panel source-detail">
              {selectedSource && selectedVersion ? (
                <>
                  <div className="panel-heading source-title-row">
                    <div>
                      <p className="eyebrow">{selectedSource.issuingAuthority}</p>
                      <h2>{selectedSource.title}</h2>
                    </div>
                    <a
                      className="button ghost compact"
                      href={selectedSource.officialUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Primary page <ExternalLink size={13} />
                    </a>
                  </div>
                  <div className="source-version-rail" aria-label="Source versions">
                    {sourceVersions.map((version) => (
                      <button
                        key={version.id}
                        className={
                          selectedVersion.id === version.id ? "active" : ""
                        }
                        onClick={() => setSelectedVersionId(version.id)}
                      >
                        <strong>v{version.versionNumber}</strong>
                        <span>{version.versionLabel}</span>
                        <small>{lifecycleLabel(workspace, version)}</small>
                      </button>
                    ))}
                  </div>

                  <div className="source-gate-line">
                    <span
                      className={
                        selectedPublication?.decision === "published"
                          ? "gate-pass"
                          : "gate-block"
                      }
                    >
                      {selectedPublication?.decision === "published" ? (
                        <CheckCircle2 size={15} />
                      ) : (
                        <CircleDashed size={15} />
                      )}
                      {lifecycleLabel(workspace, selectedVersion)}
                    </span>
                    <span>
                      {formatLabel(selectedVersion.verifyCurrentStatus)}
                    </span>
                    <span>{formatLabel(selectedVersion.rightsStatus)} rights</span>
                    <span>{formatLabel(selectedVersion.snapshotState)}</span>
                  </div>

                  <dl className="source-facts">
                    <div>
                      <dt>Retrieval</dt>
                      <dd>{selectedVersion.retrievalDate}</dd>
                    </div>
                    <div>
                      <dt>Next verify-current review</dt>
                      <dd>{selectedVersion.nextReviewDate}</dd>
                    </div>
                    <div>
                      <dt>Extraction</dt>
                      <dd>{formatLabel(selectedVersion.extractionMethod)}</dd>
                    </div>
                    <div>
                      <dt>Human confirmed</dt>
                      <dd>{selectedVersion.humanConfirmed ? "Yes" : "No · blocked"}</dd>
                    </div>
                    <div className="wide">
                      <dt>SHA-256 / registered hash</dt>
                      <dd className="mono">{selectedVersion.sourceHash}</dd>
                    </div>
                    <div className="wide">
                      <dt>Use boundary</dt>
                      <dd>{selectedVersion.useRestrictions}</dd>
                    </div>
                  </dl>

                  <div className="source-summary-block">
                    <p className="eyebrow">Human-reviewed structured summary</p>
                    {Object.entries(selectedVersion.structuredSummary).map(
                      ([key, value]) => (
                        <div key={key}>
                          <strong>{formatLabel(key)}</strong>
                          <span>{value}</span>
                        </div>
                      ),
                    )}
                  </div>

                  <div className="source-review-chain">
                    <div>
                      <span>Author</span>
                      <strong>{selectedVersion.authorSubject}</strong>
                    </div>
                    <ArrowRight size={16} />
                    <div>
                      <span>Independent review</span>
                      <strong>
                        {selectedReview?.reviewerSubject ?? "Awaiting reviewer"}
                      </strong>
                    </div>
                    <ArrowRight size={16} />
                    <div>
                      <span>Publisher</span>
                      <strong>
                        {selectedPublication?.publisherSubject ??
                          "Awaiting publication"}
                      </strong>
                    </div>
                  </div>

                  <div className="source-actions">
                    {!selectedReview ? (
                      <button
                        className="button secondary"
                        disabled={busy || !selectedVersion.humanConfirmed}
                        onClick={() => void reviewSelected()}
                      >
                        <Scale size={15} /> Record independent approval
                      </button>
                    ) : null}
                    {selectedReview?.decision === "approved" &&
                    !selectedPublication ? (
                      <button
                        className="button primary"
                        disabled={busy}
                        onClick={() => void publishSelected()}
                      >
                        <ShieldCheck size={15} /> Publish immutable version
                      </button>
                    ) : null}
                    {selectedPublication?.decision === "published" &&
                    sourceVersions[0].id === selectedVersion.id ? (
                      <button
                        className="button secondary"
                        disabled={busy}
                        onClick={stageSuccessor}
                      >
                        <GitCompareArrows size={15} /> Stage successor
                      </button>
                    ) : null}
                  </div>
                  {!selectedVersion.humanConfirmed ? (
                    <div className="source-inline-warning">
                      <AlertTriangle size={16} />
                      <span>
                        Model-assisted candidate is unreviewed. Human confirmation,
                        current-status verification, and a rights decision are missing;
                        publication is blocked.
                      </span>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="source-empty">
                  <FileKey2 size={24} />
                  <h2>No source version selected</h2>
                  <p>Select a source to inspect its immutable lifecycle.</p>
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="source-panel source-empty">
            <FileKey2 size={26} />
            <h2>No governed sources</h2>
            <p>
              Production stays empty and non-operative until an administrator
              registers a primary or officially authorised source.
            </p>
            <button className="button primary" onClick={() => setTab("register")}>
              <Plus size={15} /> Register first candidate
            </button>
          </section>
        )
      ) : null}

      {tab === "register" ? (
        <section className="source-register-layout">
          <div className="source-panel source-form">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">
                  {successorOf ? "Immutable successor" : "Stable authority identity"}
                </p>
                <h2>{successorOf ? "Stage a source change" : "Register a candidate"}</h2>
              </div>
            </div>
            {successorOf ? (
              <div className="source-inline-warning">
                <GitCompareArrows size={16} />
                <span>
                  Supersedes {successorOf}. The prior version and every pinned
                  dependency remain immutable.
                </span>
              </div>
            ) : null}
            <div className="source-form-grid">
              <label>
                Canonical key
                <input
                  value={canonicalKey}
                  disabled={Boolean(successorOf)}
                  onChange={(event) => setCanonicalKey(event.target.value)}
                />
              </label>
              <label>
                Source class
                <select
                  value={sourceClass}
                  disabled={Boolean(successorOf)}
                  onChange={(event) => setSourceClass(event.target.value)}
                >
                  <option value="statute_regulation">Statute / regulation</option>
                  <option value="regulator_guidance">Regulator guidance</option>
                  <option value="cal_fire_programme">CAL FIRE programme</option>
                  <option value="fair_plan_rule_form">FAIR Plan rule / form</option>
                  <option value="insurer_mga_material">Insurer / MGA material</option>
                  <option value="third_party_standard">Third-party standard</option>
                  <option value="funding_programme">Funding programme</option>
                  <option value="local_authority_requirement">Local authority</option>
                  <option value="external_model_documentation">Model documentation</option>
                </select>
              </label>
              <label>
                Issuing authority
                <input
                  value={issuingAuthority}
                  disabled={Boolean(successorOf)}
                  onChange={(event) => setIssuingAuthority(event.target.value)}
                />
              </label>
              <label>
                Authority tier
                <select
                  value={authorityTier}
                  disabled={Boolean(successorOf)}
                  onChange={(event) => setAuthorityTier(event.target.value)}
                >
                  <option value="primary">Primary</option>
                  <option value="officially_authorized">Officially authorised</option>
                  <option value="customer_supplied">Customer supplied</option>
                  <option value="recognized_third_party">Recognised third party</option>
                </select>
              </label>
              <label className="wide">
                Source title
                <input
                  value={title}
                  disabled={Boolean(successorOf)}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>
              <label className="wide">
                Official URL
                <input
                  type="url"
                  value={officialUrl}
                  disabled={Boolean(successorOf)}
                  onChange={(event) => setOfficialUrl(event.target.value)}
                />
              </label>
              <label>
                Version label
                <input
                  value={versionLabel}
                  onChange={(event) => setVersionLabel(event.target.value)}
                />
              </label>
              <label>
                Snapshot mode
                <select disabled value="metadata_only_restricted">
                  <option value="metadata_only_restricted">
                    Metadata only · restricted
                  </option>
                </select>
              </label>
              <label className="wide">
                Source / snapshot SHA-256
                <input
                  className="mono"
                  value={sourceHash}
                  onChange={(event) => setSourceHash(event.target.value)}
                />
              </label>
              <label className="wide">
                Short structured summary
                <textarea
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                />
              </label>
            </div>
            <div className="source-actions">
              <button
                className="button primary"
                disabled={busy}
                onClick={() => void registerCandidate()}
              >
                {busy ? <LoaderCircle className="spin" size={15} /> : <Plus size={15} />}
                Register non-operative candidate
              </button>
              {successorOf ? (
                <button
                  className="button ghost"
                  disabled={busy}
                  onClick={() => {
                    setSuccessorOf(null);
                    setTab("versions");
                  }}
                >
                  Cancel successor
                </button>
              ) : null}
            </div>
          </div>
          <aside className="source-panel source-gates">
            <p className="eyebrow">Publication gates</p>
            <h2>Candidate first. Authority later.</h2>
            {[
              "Primary or officially authorised origin recorded",
              "Exact bytes, approved snapshot, or restricted metadata boundary",
              "Source hash, dates, rights, and redistribution decision",
              "Human confirmation of every structured fact",
              "Independent reviewer compares against the source",
              "Separate human publisher records the operative decision",
            ].map((gate, index) => (
              <div key={gate}>
                <span>{index + 1}</span>
                <p>{gate}</p>
              </div>
            ))}
            <div className="source-doctrine">
              <LockKeyhole size={18} />
              <p>
                A model-assisted extraction can never satisfy these gates by
                itself. A published source still does not guarantee recognition,
                pricing, renewal, or insurer acceptance.
              </p>
            </div>
          </aside>
        </section>
      ) : null}

      {tab === "impact" ? (
        <section className="source-impact-layout">
          <div className="source-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Relied-on source change</p>
                <h2>Impact queue</h2>
              </div>
              <span className="source-count">{workspace?.alerts.length ?? 0}</span>
            </div>
            {workspace?.alerts.length ? (
              workspace.alerts.map((alert) => {
                const source = workspace.sources.find(
                  (item) => item.id === alert.sourceId,
                );
                const from = workspace.versions.find(
                  (item) => item.id === alert.fromVersionId,
                );
                const to = workspace.versions.find(
                  (item) => item.id === alert.toVersionId,
                );
                return (
                  <article className="source-impact-card" key={alert.id}>
                    <div>
                      <AlertTriangle size={18} />
                      <span>Owner · {alert.ownerSubject}</span>
                    </div>
                    <h3>{source?.title ?? "Governed source"}</h3>
                    <p>
                      v{from?.versionNumber ?? "?"} → v
                      {to?.versionNumber ?? "?"} was published. Review every
                      pinned record; no automatic mutation occurred.
                    </p>
                    <div className="source-impact-counts">
                      <span>
                        <strong>
                          {alert.impactSnapshot.affected.playbooks.length}
                        </strong>
                        Playbooks
                      </span>
                      <span>
                        <strong>{alert.impactSnapshot.affected.cases.length}</strong>
                        Cases
                      </span>
                      <span>
                        <strong>{alert.impactSnapshot.affected.profiles.items.length}</strong>Profiles
                      </span>
                      <span>
                        <strong>{alert.impactSnapshot.affected.reports.items.length}</strong>Reports
                      </span>
                    </div>
                    <ul>
                      {alert.impactSnapshot.affected.playbooks.map((playbook) => (
                        <li key={playbook.versionId}>
                          <BookOpenCheck size={14} /> {playbook.name} · pinned
                          version {playbook.versionId}
                        </li>
                      ))}
                      {alert.impactSnapshot.affected.cases.map((item) => (
                        <li key={item.id}>
                          <FileClock size={14} /> {item.title} · renewal {item.renewalDate}
                        </li>
                      ))}
                      {alert.impactSnapshot.affected.profiles.items.map((profile) => (
                        <li key={profile.versionId}>
                          <FileCheck2 size={14} /> {profile.name} · pinned version {profile.versionId}
                        </li>
                      ))}
                      {alert.impactSnapshot.affected.reports.items.map((report) => (
                        <li key={report.id}>
                          <FileCheck2 size={14} /> {report.title} · {formatLabel(report.reportType)}
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })
            ) : (
              <div className="source-empty">
                <CheckCircle2 size={24} />
                <h3>No relied-on source changes</h3>
                <p>
                  A successor alert appears only when the predecessor has an
                  explicit reliance record.
                </p>
              </div>
            )}
          </div>
          <aside className="source-panel source-impact-boundary">
            <p className="eyebrow">Coverage boundary</p>
            <h2>Honest impact states</h2>
            <div>
              <strong>Playbooks</strong>
              <span>Exact version-level dependencies</span>
            </div>
            <div>
              <strong>Cases</strong>
              <span>Exact case pins through destination playbooks</span>
            </div>
            <div>
              <strong>Profiles</strong>
              <span>Exact version-level dependencies and human impact review</span>
            </div>
            <div>
              <strong>Reports</strong>
              <span>{workspace?.unavailableImpactTargets.reports}</span>
            </div>
            <Link className="button secondary" href="/playbooks">
              Inspect market playbooks <ArrowRight size={14} />
            </Link>
            <Link className="button secondary" href="/resilience-planning">
              Inspect target profiles <ArrowRight size={14} />
            </Link>
          </aside>
        </section>
      ) : null}

      <footer className="source-footer">
        <ShieldCheck size={17} />
        <span>
          Evidence-readiness infrastructure only. Source publication is not legal
          advice, insurer recognition, a resilience designation, or a pricing or
          renewal prediction.
        </span>
      </footer>
    </div>
  );
}
