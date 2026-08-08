export const DOCUMENT_PIPELINE_VERSION = "fortify-document-pipeline-v1";

export interface DocumentWorkspaceResponse {
  pipelineVersion: string;
  provider: {
    key: string;
    version: string;
    modelDerived: boolean;
  };
  cases: Array<{
    id: string;
    title: string;
    status: string;
  }>;
  cleanObjects: Array<{
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    providerSupported: boolean;
    createdAt: string;
  }>;
  documents: Array<{
    id: string;
    caseId: string | null;
    storageObjectId: string | null;
    supersedesSourceDocumentId: string | null;
    versionNumber: number;
    documentType: string;
    filename: string;
    mimeType: string;
    sha256: string | null;
    processingStatus: string;
    classifierKey: string | null;
    classifierVersion: string | null;
    classificationConfidence: string | null;
    createdAt: string;
  }>;
  jobs: Array<{
    id: string;
    sourceDocumentId: string;
    status: string;
    attemptCount: number;
    maxAttempts: number;
    availableAt: string;
    lastErrorCode: string | null;
    lastErrorMessage: string | null;
    createdAt: string;
  }>;
  attempts: Array<{
    id: string;
    jobId: string;
    attemptNumber: number;
    status: string;
    providerKey: string | null;
    providerVersion: string | null;
    errorCode: string | null;
    startedAt: string;
  }>;
  runs: Array<{
    id: string;
    sourceDocumentId: string;
    providerKey: string;
    providerVersion: string;
    extractorKey: string;
    extractorVersion: string;
    modelDerived: boolean;
    pageCount: number;
    warnings: string[];
  }>;
  passages: Array<{
    id: string;
    sourceDocumentId: string;
    extractionRunId: string | null;
    pageNumber: number | null;
    segment: string | null;
    region: {
      x: number;
      y: number;
      width: number;
      height: number;
      rotation?: number;
    } | null;
    passageKind: string;
    textContent: string;
    extractorVersion: string;
  }>;
  candidates: Array<{
    id: string;
    sourceDocumentId: string;
    extractionRunId: string;
    sourcePassageId: string | null;
    fieldKey: string;
    fieldLabel: string;
    candidateOrdinal: number;
    value: string;
    valueType: string;
    confidence: string;
    modelDerived: boolean;
  }>;
  reviews: Array<{
    id: string;
    extractedFieldId: string;
    action: string;
    reviewedValue: string | null;
    reviewerSubject: string;
    note: string | null;
    reviewedAt: string;
  }>;
  facts: Array<{
    id: string;
    sourceDocumentId: string;
    extractedFieldId: string;
    sourcePassageId: string | null;
    factKey: string;
    value: string;
    versionNumber: number;
    supersedesFactId: string | null;
    confirmedBy: string;
    confirmedAt: string;
    correctionReason: string | null;
  }>;
}
