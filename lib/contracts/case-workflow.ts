type NullableString = string | null;

export type BrokerageNoticeFactResponse = {
  id: string;
  key: string;
  value: string;
  versionNumber: number;
  confirmedBy: string;
  confirmedAt: string;
  sourcePassageId: NullableString;
};

export type BrokerageRequestedEvidenceItemResponse = {
  evidenceType: string;
  label: string;
  required: boolean;
  scopeType: string;
  scopeReference?: string;
  guidance: string;
};

export type BrokerageEvidenceRequestResponse = {
  id: string;
  recipientType: string;
  recipientLabel: string;
  status: string;
  issuedAt: NullableString;
  expiresAt: NullableString;
  externalAccessState: string;
  version: {
    id: string;
    versionNumber: number;
    purpose: string;
    instructions: string;
    dueAt: string;
    requestedItems: BrokerageRequestedEvidenceItemResponse[];
    confirmedBy: string;
    confirmedAt: string;
  } | null;
};

export type BrokerageSubmissionResponse = {
  id: string;
  purpose: string;
  status: string;
  version: {
    id: string;
    versionNumber: number;
    confirmedBy: NullableString;
    confirmedAt: NullableString;
    manifestHash: NullableString;
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

export type BrokerageCaseResponse = {
  id: string;
  title: string;
  status: string;
  caseType: string;
  peril: string;
  jurisdiction: string;
  propertyClass: string;
  renewalDate: string;
  appealDeadline: NullableString;
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
    effectiveDate: NullableString;
    expirationDate: string;
    marketName: NullableString;
    sourceAuthority: string;
  };
  notice: {
    id: string;
    filename: string;
    sha256: NullableString;
    receivedAt: string;
    facts: BrokerageNoticeFactResponse[];
    missingRequiredFacts: string[];
  } | null;
  evidenceRequests: BrokerageEvidenceRequestResponse[];
  evidence: Array<{
    itemId: string;
    versionId: string;
    evidenceType: string;
    filename: string;
    sha256: string;
    sourceType: string;
    scopeType: string;
    scopeReference: NullableString;
    reviewStatus: string;
  }>;
  submissions: BrokerageSubmissionResponse[];
  gates: {
    noticeFactsConfirmed: boolean;
    evidenceRequestRecorded: boolean;
    openContradictionCount: number;
    packetGenerated: boolean;
  };
};

export type BrokerageWorkspaceResponse = {
  organization: {
    id: string;
    name: string;
    environment: string;
    synthetic: boolean;
  };
  cases: BrokerageCaseResponse[];
};
