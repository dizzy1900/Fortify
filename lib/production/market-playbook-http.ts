import { getProductionDatabase } from "@/db/production/client";
import type { MarketPlaybookWorkspaceResponse } from "@/lib/contracts/market-playbooks";
import {
  MarketPlaybookWorkspaceQueryService,
  type MarketPlaybookWorkspace,
} from "@/lib/production/contexts/market-playbooks/workspace-query";
import { MarketPlaybookService } from "@/lib/production/market-playbook-service";
import type { ProductionDatabaseLike } from "@/lib/production/repository";

export function getProductionMarketPlaybookService(
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
) {
  return new MarketPlaybookService(database);
}

export function getProductionMarketPlaybookWorkspaceQuery(
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
) {
  return new MarketPlaybookWorkspaceQueryService(database);
}

function presentImportance(value: string): "required" | "recommended" {
  if (value === "required" || value === "recommended") return value;
  throw new Error("The saved playbook requirement importance is unsupported.");
}

function presentReviewDecision(
  value: string,
): "approved" | "changes_requested" {
  if (value === "approved" || value === "changes_requested") return value;
  throw new Error("The saved playbook review decision is unsupported.");
}

export function presentMarketPlaybookWorkspace(
  workspace: MarketPlaybookWorkspace,
): MarketPlaybookWorkspaceResponse {
  return {
    markets: workspace.markets.map((market) => ({
      id: market.id,
      name: market.name,
      marketType: market.marketType,
    })),
    programs: workspace.programs.map((program) => ({
      id: program.id,
      marketId: program.marketId,
      name: program.name,
      peril: program.peril,
      jurisdiction: program.jurisdiction,
      propertyClass: program.propertyClass,
    })),
    requirementVersions: workspace.requirementVersions.map((version) => ({
      id: version.id,
      version: version.version,
      summary: version.summary,
      sourceUrl: version.sourceUrl,
      requirementId: version.requirementId,
      code: version.code,
      title: version.title,
      scopeType: version.scopeType,
    })),
    publishedSourceVersions: workspace.publishedSourceVersions.map(
      (version) => ({
        id: version.id,
        sourceId: version.sourceId,
        title: version.title,
        issuingAuthority: version.issuingAuthority,
        officialUrl: version.officialUrl,
        versionLabel: version.versionLabel,
        verifyCurrentStatus: version.verifyCurrentStatus,
        publishedAt: version.publishedAt,
      }),
    ),
    playbooks: workspace.playbooks.map((playbook) => ({
      id: playbook.id,
      name: playbook.name,
      description: playbook.description,
    })),
    versions: workspace.versions.map((version) => ({
      id: version.id,
      playbookId: version.playbookId,
      versionNumber: version.versionNumber,
      marketId: version.marketId,
      programId: version.programId,
      jurisdiction: version.jurisdiction,
      peril: version.peril,
      propertyClass: version.propertyClass,
      policyForm: version.policyForm,
      effectiveFrom: version.effectiveFrom,
      effectiveTo: version.effectiveTo,
      governedSourceVersionId: version.governedSourceVersionId,
      sourceName: version.sourceName,
      sourceUrl: version.sourceUrl,
      sourceVersion: version.sourceVersion,
      sourceCitation: version.sourceCitation,
      verifyCurrent: version.verifyCurrent,
      changeSummary: version.changeSummary,
      contentHash: version.contentHash,
      authorSubject: version.authorSubject,
      supersedesVersionId: version.supersedesVersionId,
    })),
    requirements: workspace.requirements.map((requirement) => ({
      id: requirement.id,
      playbookVersionId: requirement.playbookVersionId,
      requirementVersionId: requirement.requirementVersionId,
      position: requirement.position,
      importance: presentImportance(requirement.importance),
      blocking: requirement.blocking,
      acceptedEvidenceTypes: [...requirement.acceptedEvidenceTypes],
      freshnessDays: requirement.freshnessDays,
      requiredScopeType: requirement.requiredScopeType,
      acceptedSourceTypes: [...requirement.acceptedSourceTypes],
      requiredReviewStatus: requirement.requiredReviewStatus,
      caveat: requirement.caveat,
    })),
    rules: workspace.rules.map((rule) => ({
      id: rule.id,
      playbookRequirementId: rule.playbookRequirementId,
      position: rule.position,
      field: rule.field,
      operator: rule.operator,
      expectedValues: [...rule.expectedValues],
    })),
    reviews: workspace.reviews.map((review) => ({
      id: review.id,
      playbookVersionId: review.playbookVersionId,
      decision: presentReviewDecision(review.decision),
      reviewerSubject: review.reviewerSubject,
      note: review.note,
      reviewedAt: review.reviewedAt,
    })),
    cases: workspace.cases.map((renewalCase) => ({
      id: renewalCase.id,
      title: renewalCase.title,
      renewalDate: renewalCase.renewalDate,
      peril: renewalCase.peril,
      jurisdiction: renewalCase.jurisdiction,
      propertyClass: renewalCase.propertyClass,
    })),
    links: workspace.links.map((link) => ({
      id: link.id,
      caseId: link.caseId,
      playbookVersionId: link.playbookVersionId,
      destinationMarketId: link.destinationMarketId,
      linkedAt: link.linkedAt,
      supersedesLinkId: link.supersedesLinkId,
    })),
  };
}
