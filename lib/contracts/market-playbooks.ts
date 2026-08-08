export type MarketPlaybookMarketResponse = {
  id: string;
  name: string;
  marketType: string;
};

export type MarketPlaybookProgramResponse = {
  id: string;
  marketId: string;
  name: string;
  peril: string;
  jurisdiction: string;
  propertyClass: string;
};

export type MarketPlaybookRequirementVersionResponse = {
  id: string;
  version: string;
  summary: string;
  sourceUrl: string;
  requirementId: string;
  code: string;
  title: string;
  scopeType: string;
};

export type MarketPlaybookPublishedSourceVersionResponse = {
  id: string;
  sourceId: string;
  title: string;
  issuingAuthority: string;
  officialUrl: string;
  versionLabel: string;
  verifyCurrentStatus: string;
  publishedAt: string;
};

export type MarketPlaybookResponse = {
  id: string;
  name: string;
  description: string;
};

export type MarketPlaybookVersionResponse = {
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

export type MarketPlaybookRequirementResponse = {
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

export type MarketPlaybookReviewResponse = {
  id: string;
  playbookVersionId: string;
  decision: "approved" | "changes_requested";
  reviewerSubject: string;
  note: string;
  reviewedAt: string;
};

export type MarketPlaybookWorkspaceResponse = {
  markets: MarketPlaybookMarketResponse[];
  programs: MarketPlaybookProgramResponse[];
  requirementVersions: MarketPlaybookRequirementVersionResponse[];
  publishedSourceVersions: MarketPlaybookPublishedSourceVersionResponse[];
  playbooks: MarketPlaybookResponse[];
  versions: MarketPlaybookVersionResponse[];
  requirements: MarketPlaybookRequirementResponse[];
  rules: Array<{
    id: string;
    playbookRequirementId: string;
    position: number;
    field: string;
    operator: string;
    expectedValues: string[];
  }>;
  reviews: MarketPlaybookReviewResponse[];
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
