import { getProductionDatabase } from "@/db/production/client";
import type { IdentityAccessWorkspaceResponse } from "@/lib/contracts/identity-access";
import { AccessControlService } from "@/lib/production/access-control-service";
import {
  IdentityAccessWorkspaceQueryService,
  type IdentityAccessWorkspace,
} from "@/lib/production/contexts/identity-access/workspace-query";
import { StorageObjectQueryService } from "@/lib/production/contexts/evidence-custody/storage-object-query-port";
import type { ProductionDatabaseLike } from "@/lib/production/repository";

export function getProductionAccessControlService(
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
) {
  return new AccessControlService(database);
}

export function getProductionIdentityAccessWorkspaceQuery(
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
) {
  return new IdentityAccessWorkspaceQueryService(
    database,
    new StorageObjectQueryService(database),
  );
}

export function presentIdentityAccessWorkspace(
  workspace: IdentityAccessWorkspace,
): IdentityAccessWorkspaceResponse {
  return {
    organization: workspace.organization,
    currentPrincipal: {
      ...workspace.currentPrincipal,
      assignedCaseIds: workspace.currentPrincipal.assignedCaseIds
        ? [...workspace.currentPrincipal.assignedCaseIds]
        : null,
      assignedPortfolioIds: workspace.currentPrincipal.assignedPortfolioIds
        ? [...workspace.currentPrincipal.assignedPortfolioIds]
        : null,
    },
    memberships: workspace.memberships.map((membership) => ({ ...membership })),
    portfolios: workspace.portfolios.map((portfolio) => ({ ...portfolio })),
    cases: workspace.cases.map((caseRecord) => ({ ...caseRecord })),
    portfolioAssignments: workspace.portfolioAssignments.map((assignment) => ({
      ...assignment,
      permissions: [...assignment.permissions],
      dataDomains: [...assignment.dataDomains],
    })),
    caseAssignments: workspace.caseAssignments.map((assignment) => ({
      ...assignment,
      permissions: [...assignment.permissions],
      dataDomains: [...assignment.dataDomains],
    })),
    supportGrants: workspace.supportGrants.map((grant) => ({
      ...grant,
      scopes: [...grant.scopes],
    })),
    accessLogs: workspace.accessLogs.map((log) => ({
      ...log,
      dataClasses: [...log.dataClasses],
    })),
    securityPosture: { ...workspace.securityPosture },
  };
}
