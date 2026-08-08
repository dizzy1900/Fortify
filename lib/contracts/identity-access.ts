type NullableString = string | null;

export type IdentityAccessMemberResponse = {
  id: string;
  role: string;
  status: string;
  displayName: string;
  email: NullableString;
  emailVerified: boolean;
  mfaCapable: boolean;
  acceptedAt: NullableString;
  revokedAt: NullableString;
};

export type IdentityAccessAssignmentResponse = {
  id: string;
  membershipId: NullableString;
  teamId?: NullableString;
  assignmentRole: string;
  accessPurpose: string;
  permissions: string[];
  dataDomains: string[];
  expiresAt: NullableString;
  revokedAt: NullableString;
  revocationReason: NullableString;
  portfolioId?: string;
  caseId?: string;
};

export type IdentityAccessLogResponse = {
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

export type IdentityAccessWorkspaceResponse = {
  organization: {
    id: string;
    name: string;
    environment: string;
    synthetic: boolean;
  } | null;
  currentPrincipal: {
    actorSubject: string;
    role: NullableString;
    assignedCaseIds: string[] | null;
    assignedPortfolioIds: string[] | null;
  };
  memberships: IdentityAccessMemberResponse[];
  portfolios: Array<{
    id: string;
    name: string;
    jurisdiction: string;
    primaryPeril: string;
  }>;
  cases: Array<{
    id: string;
    title: string;
    status: string;
    renewalDate: string;
  }>;
  portfolioAssignments: IdentityAccessAssignmentResponse[];
  caseAssignments: IdentityAccessAssignmentResponse[];
  supportGrants: Array<{
    id: string;
    reason: string;
    scopes: string[];
    expiresAt: string;
    revokedAt: NullableString;
  }>;
  accessLogs: IdentityAccessLogResponse[];
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
