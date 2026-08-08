import { getProductionDatabase } from "@/db/production/client";
import type { IntegrationWorkspaceResponse } from "@/lib/contracts/integrations";
import {
  IntegrationWorkspaceQueryService,
  type IntegrationWorkspace,
} from "@/lib/production/contexts/integrations/workspace-query";
import {
  UnavailableCredentialResolver,
  UnavailableIntegrationProvider,
  providerBoundaryCatalog,
} from "@/lib/production/integration-providers";
import { IntegrationService } from "@/lib/production/integration-service";
import { getProductionObjectStorage } from "@/lib/production/object-storage-runtime";
import type { ProductionDatabaseLike } from "@/lib/production/repository";

export const getProductionIntegrationService = (
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
) =>
  new IntegrationService(
    database,
    getProductionObjectStorage(),
    providerBoundaryCatalog.map(
      (entry) => new UnavailableIntegrationProvider(entry.type),
    ),
    new UnavailableCredentialResolver(),
  );

export const getProductionIntegrationWorkspaceQuery = (
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
) => new IntegrationWorkspaceQueryService(database);

export function presentIntegrationWorkspace(
  workspace: IntegrationWorkspace,
): IntegrationWorkspaceResponse {
  return {
    connections: workspace.connections.map((connection) => ({
      id: connection.id,
      name: connection.name,
      providerType: connection.providerType,
      providerKey: connection.providerKey,
      providerVersion: connection.providerVersion,
      connectionMode: connection.connectionMode,
      status: connection.status,
      capabilities: [...connection.capabilities],
      dataClasses: [...connection.dataClasses],
      pageSize: connection.pageSize,
      rateLimitPerMinute: connection.rateLimitPerMinute,
      lastHealthAt: connection.lastHealthAt,
    })),
    events: workspace.events.map((event) => ({
      id: event.id,
      connectionId: event.connectionId,
      eventType: event.eventType,
      previousStatus: event.previousStatus,
      nextStatus: event.nextStatus,
      reason: event.reason,
      occurredAt: event.occurredAt,
    })),
    schemas: workspace.schemas.map((version) => ({
      id: version.id,
      connectionId: version.connectionId,
      versionNumber: version.versionNumber,
      schemaKey: version.schemaKey,
      direction: version.direction,
      resourceKinds: [...version.resourceKinds],
      sourceSchemaHash: version.sourceSchemaHash,
      status: version.status,
    })),
    jobs: workspace.jobs.map((job) => ({
      id: job.id,
      connectionId: job.connectionId,
      resourceKind: job.resourceKind,
      direction: job.direction,
      status: job.status,
      attemptCount: job.attemptCount,
      maxAttempts: job.maxAttempts,
      cursorBefore: job.cursorBefore,
      lastErrorCode: job.lastErrorCode,
      requestedAt: job.requestedAt,
      supersedesJobId: job.supersedesJobId,
    })),
    attempts: workspace.attempts.map((attempt) => ({
      id: attempt.id,
      jobId: attempt.jobId,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      providerKey: attempt.providerKey,
      providerVersion: attempt.providerVersion,
      recordsRead: attempt.recordsRead,
      recordsWritten: attempt.recordsWritten,
      recordsRejected: attempt.recordsRejected,
      cursorAfter: attempt.cursorAfter,
      errorCode: attempt.errorCode,
      rateLimitRemaining: attempt.rateLimitRemaining,
      startedAt: attempt.startedAt,
      finishedAt: attempt.finishedAt,
    })),
    receipts: workspace.receipts.map((receipt) => ({
      id: receipt.id,
      jobId: receipt.jobId,
      receiptType: receipt.receiptType,
      schemaVersion: receipt.schemaVersion,
      cursorBefore: receipt.cursorBefore,
      cursorAfter: receipt.cursorAfter,
      recordsRead: receipt.recordsRead,
      recordsWritten: receipt.recordsWritten,
      recordsRejected: receipt.recordsRejected,
      payloadHash: receipt.payloadHash,
      sourceAuthority: receipt.sourceAuthority,
      sourceReference: receipt.sourceReference,
      completedAt: receipt.completedAt,
    })),
    endpoints: workspace.endpoints.map((endpoint) => ({
      id: endpoint.id,
      connectionId: endpoint.connectionId,
      endpointKey: endpoint.endpointKey,
      eventTypes: [...endpoint.eventTypes],
      signatureAlgorithm: endpoint.signatureAlgorithm,
      toleranceSeconds: endpoint.toleranceSeconds,
      status: endpoint.status,
      lastRotatedAt: endpoint.lastRotatedAt,
    })),
    deliveries: workspace.deliveries.map((delivery) => ({
      id: delivery.id,
      endpointId: delivery.endpointId,
      syncJobId: delivery.syncJobId,
      externalEventId: delivery.externalEventId,
      eventType: delivery.eventType,
      signatureValid: delivery.signatureValid,
      bodySha256: delivery.bodySha256,
      receivedAt: delivery.receivedAt,
    })),
    healthChecks: workspace.healthChecks.map((health) => ({
      id: health.id,
      connectionId: health.connectionId,
      status: health.status,
      providerKey: health.providerKey,
      providerVersion: health.providerVersion,
      latencyMs: health.latencyMs,
      rateLimitRemaining: health.rateLimitRemaining,
      detail: health.detail,
      checkedAt: health.checkedAt,
    })),
    providerCatalog: workspace.providerCatalog,
    boundaries: workspace.boundaries,
  };
}
