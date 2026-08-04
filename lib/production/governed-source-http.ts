import { getProductionDatabase } from "@/db/production/client";
import { GovernedSourceService } from "@/lib/production/governed-source-service";
import type { SourceImpactReport } from "@/lib/production/governed-source-service";
import type { ProductionDatabaseLike } from "@/lib/production/repository";

type GovernedSourceWorkspace = Awaited<
  ReturnType<GovernedSourceService["getWorkspace"]>
>;
type GovernedSourcePublication = Awaited<
  ReturnType<GovernedSourceService["publishVersion"]>
>;

export function getProductionGovernedSourceService(
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
) {
  return new GovernedSourceService(database);
}

function presentImpactSnapshot(impact: SourceImpactReport) {
  return {
    affected: {
      playbooks: impact.affected.playbooks.map((playbook) => ({
        id: playbook.id,
        versionId: playbook.versionId,
        name: playbook.name,
      })),
      cases: impact.affected.cases.map((renewalCase) => ({
        id: renewalCase.id,
        title: renewalCase.title,
        renewalDate: renewalCase.renewalDate,
      })),
      profiles: {
        state: impact.affected.profiles.state,
        items: impact.affected.profiles.items.map((profile) => ({
          id: profile.id,
          versionId: profile.versionId,
          name: profile.name,
        })),
      },
      reports: {
        state: impact.affected.reports.state,
        items: impact.affected.reports.items.map((report) => ({
          id: report.id,
          title: report.title,
          reportType: report.reportType,
        })),
      },
    },
    limitations: [...impact.limitations],
  };
}

export function presentGovernedSourceWorkspace(
  workspace: GovernedSourceWorkspace,
) {
  return {
    sources: workspace.sources.map((source) => ({
      id: source.id,
      canonicalKey: source.canonicalKey,
      sourceClass: source.sourceClass,
      issuingAuthority: source.issuingAuthority,
      title: source.title,
      jurisdiction: source.jurisdiction,
      officialUrl: source.officialUrl,
      authorityTier: source.authorityTier,
      reviewOwnerSubject: source.reviewOwnerSubject,
    })),
    versions: workspace.versions.map((version) => ({
      id: version.id,
      sourceId: version.sourceId,
      versionNumber: version.versionNumber,
      versionLabel: version.versionLabel,
      publicationDate: version.publicationDate,
      effectiveFrom: version.effectiveFrom,
      effectiveTo: version.effectiveTo,
      retrievalDate: version.retrievalDate,
      sourceHash: version.sourceHash,
      snapshotState: version.snapshotState,
      rightsStatus: version.rightsStatus,
      redistributionAllowed: version.redistributionAllowed,
      useRestrictions: version.useRestrictions,
      structuredSummary: version.structuredSummary,
      verifyCurrentStatus: version.verifyCurrentStatus,
      nextReviewDate: version.nextReviewDate,
      extractionMethod: version.extractionMethod,
      humanConfirmed: version.humanConfirmed,
      authorSubject: version.authorSubject,
      changeSummary: version.changeSummary,
      supersedesVersionId: version.supersedesVersionId,
    })),
    reviews: workspace.reviews.map((review) => ({
      id: review.id,
      sourceVersionId: review.sourceVersionId,
      decision: review.decision,
      reviewerSubject: review.reviewerSubject,
      note: review.note,
      sourceCompared: review.sourceCompared,
      rightsConfirmed: review.rightsConfirmed,
      reviewedAt: review.reviewedAt,
    })),
    publications: workspace.publications.map((publication) => ({
      id: publication.id,
      sourceVersionId: publication.sourceVersionId,
      decision: publication.decision,
      publisherSubject: publication.publisherSubject,
      note: publication.note,
      publishedAt: publication.publishedAt,
    })),
    dependencies: workspace.dependencies.map((dependency) => ({
      id: dependency.id,
      sourceVersionId: dependency.sourceVersionId,
      consumerType: dependency.consumerType,
      consumerId: dependency.consumerId,
      relationship: dependency.relationship,
      rationale: dependency.rationale,
      pinnedAt: dependency.pinnedAt,
    })),
    alerts: workspace.alerts.map((alert) => ({
      id: alert.id,
      sourceId: alert.sourceId,
      fromVersionId: alert.fromVersionId,
      toVersionId: alert.toVersionId,
      impactSnapshot: presentImpactSnapshot(
        alert.impactSnapshot as unknown as SourceImpactReport,
      ),
      ownerSubject: alert.ownerSubject,
      createdAtEvent: alert.createdAtEvent,
    })),
    unavailableImpactTargets: workspace.unavailableImpactTargets,
    doctrine: workspace.doctrine,
  };
}

export function presentGovernedSourcePublication(
  publication: GovernedSourcePublication,
) {
  return {
    publicationId: publication.publicationId,
    decision: publication.decision,
    publishedAt: publication.publishedAt,
    alertId: publication.alertId,
    impact: publication.impact
      ? {
          sourceId: publication.impact.sourceId,
          fromVersionId: publication.impact.fromVersionId,
          toVersionId: publication.impact.toVersionId,
          generatedAt: publication.impact.generatedAt,
          ...presentImpactSnapshot(publication.impact),
        }
      : null,
  };
}
