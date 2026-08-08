type NullableString = string | null;

export type IntegrationWorkspaceResponse = {
  connections: Array<{
    id: string;
    name: string;
    providerType: string;
    providerKey: string;
    providerVersion: string;
    connectionMode: string;
    status: string;
    capabilities: string[];
    dataClasses: string[];
    pageSize: number;
    rateLimitPerMinute: number;
    lastHealthAt: NullableString;
  }>;
  events: Array<{
    id: string;
    connectionId: string;
    eventType: string;
    previousStatus: NullableString;
    nextStatus: string;
    reason: string;
    occurredAt: string;
  }>;
  schemas: Array<{
    id: string;
    connectionId: string;
    versionNumber: number;
    schemaKey: string;
    direction: string;
    resourceKinds: string[];
    sourceSchemaHash: string;
    status: string;
  }>;
  jobs: Array<{
    id: string;
    connectionId: string;
    resourceKind: string;
    direction: string;
    status: string;
    attemptCount: number;
    maxAttempts: number;
    cursorBefore: NullableString;
    lastErrorCode: NullableString;
    requestedAt: string;
    supersedesJobId: NullableString;
  }>;
  attempts: Array<{
    id: string;
    jobId: string;
    attemptNumber: number;
    status: string;
    providerKey: string;
    providerVersion: string;
    recordsRead: number;
    recordsWritten: number;
    recordsRejected: number;
    cursorAfter: NullableString;
    errorCode: NullableString;
    rateLimitRemaining: number | null;
    startedAt: string;
    finishedAt: NullableString;
  }>;
  receipts: Array<{
    id: string;
    jobId: string;
    receiptType: string;
    schemaVersion: string;
    cursorBefore: NullableString;
    cursorAfter: NullableString;
    recordsRead: number;
    recordsWritten: number;
    recordsRejected: number;
    payloadHash: string;
    sourceAuthority: string;
    sourceReference: string;
    completedAt: string;
  }>;
  endpoints: Array<{
    id: string;
    connectionId: string;
    endpointKey: string;
    eventTypes: string[];
    signatureAlgorithm: string;
    toleranceSeconds: number;
    status: string;
    lastRotatedAt: string;
  }>;
  deliveries: Array<{
    id: string;
    endpointId: string;
    syncJobId: string;
    externalEventId: string;
    eventType: string;
    signatureValid: boolean;
    bodySha256: string;
    receivedAt: string;
  }>;
  healthChecks: Array<{
    id: string;
    connectionId: string;
    status: string;
    providerKey: string;
    providerVersion: string;
    latencyMs: number;
    rateLimitRemaining: number | null;
    detail: string;
    checkedAt: string;
  }>;
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
