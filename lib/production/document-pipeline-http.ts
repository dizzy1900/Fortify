import { getProductionDatabase } from "@/db/production/client";
import { DocumentPipelineService } from "@/lib/production/document-pipeline-service";
import { LocalSelectableTextProvider } from "@/lib/production/document-providers";
import { getProductionObjectStorage } from "@/lib/production/object-storage-runtime";
import type { ProductionDatabaseLike } from "@/lib/production/repository";

type DocumentWorkspace = Awaited<
  ReturnType<DocumentPipelineService["getWorkspace"]>
>;

export function getProductionDocumentPipelineService(
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
) {
  const provider =
    process.env.FORTIFY_DOCUMENT_PROVIDER ?? "local-selectable-text";
  if (provider !== "local-selectable-text")
    throw new Error(
      `Document provider ${provider} is not configured in this deployment. Register a rights-approved provider adapter before enabling it.`,
    );
  return new DocumentPipelineService(
    database,
    getProductionObjectStorage(),
    new LocalSelectableTextProvider(),
  );
}

export function presentDocumentWorkspace(workspace: DocumentWorkspace) {
  return {
    pipelineVersion: workspace.pipelineVersion,
    provider: workspace.provider,
    cases: workspace.cases,
    cleanObjects: workspace.cleanObjects.map((object) => ({
      id: object.id,
      filename: object.filename,
      mimeType: object.mimeType,
      sizeBytes: object.sizeBytes,
      sha256: object.sha256,
      providerSupported: object.providerSupported,
      createdAt: object.createdAt,
    })),
    documents: workspace.documents.map((document) => ({
      id: document.id,
      caseId: document.caseId,
      storageObjectId: document.storageObjectId,
      supersedesSourceDocumentId: document.supersedesSourceDocumentId,
      versionNumber: document.versionNumber,
      documentType: document.documentType,
      filename: document.filename,
      mimeType: document.mimeType,
      sha256: document.sha256,
      processingStatus: document.processingStatus,
      classifierKey: document.classifierKey,
      classifierVersion: document.classifierVersion,
      classificationConfidence: document.classificationConfidence,
      createdAt: document.createdAt,
    })),
    jobs: workspace.jobs.map((job) => ({
      id: job.id,
      sourceDocumentId: job.sourceDocumentId,
      status: job.status,
      attemptCount: job.attemptCount,
      maxAttempts: job.maxAttempts,
      availableAt: job.availableAt,
      lastErrorCode: job.lastErrorCode,
      lastErrorMessage: job.lastErrorMessage,
      createdAt: job.createdAt,
    })),
    attempts: workspace.attempts.map((attempt) => ({
      id: attempt.id,
      jobId: attempt.jobId,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      providerKey: attempt.providerKey,
      providerVersion: attempt.providerVersion,
      errorCode: attempt.errorCode,
      startedAt: attempt.startedAt,
    })),
    runs: workspace.runs.map((run) => ({
      id: run.id,
      sourceDocumentId: run.sourceDocumentId,
      providerKey: run.providerKey,
      providerVersion: run.providerVersion,
      extractorKey: run.extractorKey,
      extractorVersion: run.extractorVersion,
      modelDerived: run.modelDerived,
      pageCount: run.pageCount,
      warnings: run.warnings,
    })),
    passages: workspace.passages.map((passage) => ({
      id: passage.id,
      sourceDocumentId: passage.sourceDocumentId,
      extractionRunId: passage.extractionRunId,
      pageNumber: passage.pageNumber,
      segment: passage.segment,
      region: passage.region,
      passageKind: passage.passageKind,
      textContent: passage.textContent,
      extractorVersion: passage.extractorVersion,
    })),
    candidates: workspace.candidates.map((candidate) => ({
      id: candidate.id,
      sourceDocumentId: candidate.sourceDocumentId,
      extractionRunId: candidate.extractionRunId,
      sourcePassageId: candidate.sourcePassageId,
      fieldKey: candidate.fieldKey,
      fieldLabel: candidate.fieldLabel,
      candidateOrdinal: candidate.candidateOrdinal,
      value: candidate.value,
      valueType: candidate.valueType,
      confidence: candidate.confidence,
      modelDerived: candidate.modelDerived,
    })),
    reviews: workspace.reviews.map((review) => ({
      id: review.id,
      extractedFieldId: review.extractedFieldId,
      action: review.action,
      reviewedValue: review.reviewedValue,
      reviewerSubject: review.reviewerSubject,
      note: review.note,
      reviewedAt: review.reviewedAt,
    })),
    facts: workspace.facts.map((fact) => ({
      id: fact.id,
      sourceDocumentId: fact.sourceDocumentId,
      extractedFieldId: fact.extractedFieldId,
      sourcePassageId: fact.sourcePassageId,
      factKey: fact.factKey,
      value: fact.value,
      versionNumber: fact.versionNumber,
      supersedesFactId: fact.supersedesFactId,
      confirmedBy: fact.confirmedBy,
      confirmedAt: fact.confirmedAt,
      correctionReason: fact.correctionReason,
    })),
  };
}

export function presentDocumentIntake(result: {
  sourceDocumentId: string;
  jobId: string;
  duplicate: boolean;
}) {
  return {
    sourceDocumentId: result.sourceDocumentId,
    jobId: result.jobId,
    duplicate: result.duplicate,
  };
}

export function presentDocumentReview(result: {
  reviewId: string;
  factId?: string;
  action: "confirmed" | "corrected" | "rejected";
  reviewedValue?: string;
  versionNumber?: number;
}) {
  return {
    reviewId: result.reviewId,
    factId: result.factId,
    action: result.action,
    reviewedValue: result.reviewedValue,
    versionNumber: result.versionNumber,
  };
}

export function presentDocumentRetry(result: {
  id: string;
  status: string;
  maxAttempts: number;
  availableAt: string;
}) {
  return {
    jobId: result.id,
    status: result.status,
    maxAttempts: result.maxAttempts,
    availableAt: result.availableAt,
  };
}
