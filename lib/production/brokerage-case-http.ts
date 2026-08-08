import { getProductionDatabase } from "@/db/production/client";
import type { BrokerageWorkspaceResponse } from "@/lib/contracts/case-workflow";
import { BrokerageCaseService } from "@/lib/production/brokerage-case-service";
import {
  BrokerageWorkspaceQueryService,
  type BrokerageWorkspace,
} from "@/lib/production/contexts/case-workflow/workspace-query";
import { getProductionObjectStorage } from "@/lib/production/object-storage-runtime";
import type { ProductionDatabaseLike } from "@/lib/production/repository";

export function getProductionBrokerageCaseService(
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
) {
  return new BrokerageCaseService(database, getProductionObjectStorage());
}

export function getProductionBrokerageWorkspaceQuery(
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
) {
  return new BrokerageWorkspaceQueryService(database);
}

export function presentBrokerageWorkspace(
  workspace: BrokerageWorkspace,
): BrokerageWorkspaceResponse {
  return {
    organization: { ...workspace.organization },
    cases: workspace.cases.map((caseRecord) => ({
      id: caseRecord.id,
      title: caseRecord.title,
      status: caseRecord.status,
      caseType: caseRecord.caseType,
      peril: caseRecord.peril,
      jurisdiction: caseRecord.jurisdiction,
      propertyClass: caseRecord.propertyClass,
      renewalDate: caseRecord.renewalDate,
      appealDeadline: caseRecord.appealDeadline,
      client: { ...caseRecord.client },
      community: { ...caseRecord.community },
      property: { ...caseRecord.property },
      policy: { ...caseRecord.policy },
      notice: caseRecord.notice
        ? {
            ...caseRecord.notice,
            facts: caseRecord.notice.facts.map((fact) => ({ ...fact })),
            missingRequiredFacts: [...caseRecord.notice.missingRequiredFacts],
          }
        : null,
      evidenceRequests: caseRecord.evidenceRequests.map((request) => ({
        ...request,
        version: request.version
          ? {
              ...request.version,
              requestedItems: request.version.requestedItems.map((item) => ({
                ...item,
              })),
            }
          : null,
      })),
      evidence: caseRecord.evidence.map((item) => ({ ...item })),
      submissions: caseRecord.submissions.map((submission) => ({
        ...submission,
        version: submission.version ? { ...submission.version } : null,
        artifacts: submission.artifacts.map((artifact) => ({ ...artifact })),
      })),
      gates: { ...caseRecord.gates },
    })),
  };
}
