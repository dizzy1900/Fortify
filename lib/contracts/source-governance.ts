export interface SourceGovernanceWorkspaceResponse {
  sources: Array<{
    id: string;
    canonicalKey: string;
    sourceClass: string;
    issuingAuthority: string;
    title: string;
    jurisdiction: string;
    officialUrl: string;
    authorityTier: string;
    reviewOwnerSubject: string;
  }>;
  versions: Array<{
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
  }>;
  reviews: Array<{
    id: string;
    sourceVersionId: string;
    decision: "approved" | "changes_requested";
    reviewerSubject: string;
    note: string;
    sourceCompared: boolean;
    rightsConfirmed: boolean;
    reviewedAt: string;
  }>;
  publications: Array<{
    id: string;
    sourceVersionId: string;
    decision: "published" | "rejected";
    publisherSubject: string;
    note: string;
    publishedAt: string;
  }>;
  dependencies: Array<{
    id: string;
    sourceVersionId: string;
    consumerType:
      | "playbook_version"
      | "renewal_case"
      | "target_profile_version"
      | "external_model_version"
      | "market_commitment_version"
      | "analytics_report";
    consumerId: string;
    relationship: "relied_on" | "reference_only" | "input_lineage";
    rationale: string;
    pinnedAt: string;
  }>;
  alerts: Array<{
    id: string;
    sourceId: string;
    fromVersionId: string;
    toVersionId: string;
    impactSnapshot: SourceGovernanceImpactSnapshot;
    ownerSubject: string;
    createdAtEvent: string;
  }>;
  unavailableImpactTargets: { reports: string };
  doctrine: {
    extractedRulesAutomaticallyOperative: false;
    publicationRequiresHumanConfirmation: true;
    publicationRequiresIndependentReview: true;
  };
}

export interface SourceGovernanceImpactSnapshot {
  affected: {
    playbooks: Array<{ id: string; versionId: string; name: string }>;
    cases: Array<{ id: string; title: string; renewalDate: string }>;
    profiles: {
      state: "available" | "unavailable_not_implemented";
      items: Array<{ id: string; versionId: string; name: string }>;
    };
    reports: {
      state: "available" | "unavailable_not_implemented";
      items: Array<{ id: string; title: string; reportType: string }>;
    };
  };
  limitations: string[];
}
