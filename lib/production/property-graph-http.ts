import { getProductionDatabase } from "@/db/production/client";
import type { PropertyGraphWorkspaceResponse } from "@/lib/contracts/property-graph";
import {
  PropertyGraphService,
  type PropertyGraphWorkspace,
} from "@/lib/production/property-graph-service";
import type { ProductionDatabaseLike } from "@/lib/production/repository";

export function getProductionPropertyGraphService(
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
) {
  return new PropertyGraphService(database);
}

function presentGovernedRecord(record: {
  id: string;
  sourceSystem: string;
  effectiveFrom: string | null;
  confidentialityState: string;
  dataRightClass: string;
  rightsVerified: boolean;
}) {
  return {
    id: record.id,
    sourceSystem: record.sourceSystem,
    effectiveFrom: record.effectiveFrom,
    confidentialityState: record.confidentialityState,
    dataRightClass: record.dataRightClass,
    rightsVerified: record.rightsVerified,
  };
}

export function presentPropertyGraphWorkspace(
  workspace: PropertyGraphWorkspace,
): PropertyGraphWorkspaceResponse {
  return {
    organization: workspace.organization
      ? {
          id: workspace.organization.id,
          name: workspace.organization.name,
          environment: workspace.organization.environment,
          synthetic: workspace.organization.synthetic,
        }
      : null,
    portfolios: workspace.portfolios.map((portfolio) => ({
      ...presentGovernedRecord(portfolio),
      name: portfolio.name,
      jurisdiction: portfolio.jurisdiction,
      primaryPeril: portfolio.primaryPeril,
      description: portfolio.description,
      propertyIds: portfolio.propertyIds,
    })),
    properties: workspace.properties.map((property) => ({
      id: property.id,
      name: property.name,
      propertyClass: property.propertyClass,
      unitCount: property.unitCount,
      buildingCount: property.buildingCount,
      community: property.community
        ? {
            name: property.community.name,
            summary: property.community.summary,
          }
        : null,
      location: property.location
        ? {
            addressLine1: property.location.addressLine1,
            city: property.location.city,
            region: property.location.region,
            postalCode: property.location.postalCode,
            county: property.location.county,
          }
        : null,
      buildings: property.buildings.map((building) => ({
        id: building.id,
        label: building.label,
        constructionYear: building.constructionYear,
      })),
      parcels: property.parcels.map((parcel) => ({
        ...presentGovernedRecord(parcel),
        label: parcel.label,
        parcelNumber: parcel.parcelNumber,
        geometryStatus: parcel.geometryStatus,
        spatialReference: parcel.spatialReference,
        boundaryGeojson: parcel.boundaryGeojson,
      })),
      unitSummaries: property.unitSummaries.map((summary) => ({
        ...presentGovernedRecord(summary),
        label: summary.label,
        unitCount: summary.unitCount,
        occupancyType: summary.occupancyType,
      })),
      scopes: property.scopes.map((scope) => ({
        ...presentGovernedRecord(scope),
        scopeType: scope.scopeType,
        label: scope.label,
        details: scope.details,
      })),
      aliases: property.aliases.map((alias) => ({
        ...presentGovernedRecord(alias),
        alias: alias.alias,
        aliasType: alias.aliasType,
        reviewStatus: alias.reviewStatus,
      })),
      versions: property.versions.map((version) => ({
        ...presentGovernedRecord(version),
        versionNumber: version.versionNumber,
        snapshotHash: version.snapshotHash,
        changeSummary: version.changeSummary,
        recordedAt: version.recordedAt,
      })),
    })),
    relationships: workspace.relationships.map((relationship) => ({
      ...presentGovernedRecord(relationship),
      fromPropertyId: relationship.fromPropertyId,
      toPropertyId: relationship.toPropertyId,
      relationshipType: relationship.relationshipType,
      scopeLabel: relationship.scopeLabel,
      reviewStatus: relationship.reviewStatus,
    })),
    governance: {
      defaultCrossCustomerUse: workspace.governance.defaultCrossCustomerUse,
      rightsVerifiedRecords: workspace.governance.rightsVerifiedRecords,
      governedRecords: workspace.governance.governedRecords,
    },
  };
}
