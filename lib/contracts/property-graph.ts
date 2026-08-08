export type PropertyGraphGovernedRecord = {
  id: string;
  sourceSystem: string;
  effectiveFrom: string | null;
  confidentialityState: string;
  dataRightClass: string;
  rightsVerified: boolean;
};

export type PropertyGraphPropertyRecord = {
  id: string;
  name: string;
  propertyClass: string;
  unitCount: number | null;
  buildingCount: number | null;
  community: { name: string; summary: string } | null;
  location: {
    addressLine1: string;
    city: string | null;
    region: string;
    postalCode: string | null;
    county: string | null;
  } | null;
  buildings: Array<{
    id: string;
    label: string;
    constructionYear: number | null;
  }>;
  parcels: Array<
    PropertyGraphGovernedRecord & {
      label: string;
      parcelNumber: string | null;
      geometryStatus: string;
      spatialReference: string;
      boundaryGeojson: Record<string, unknown> | null;
    }
  >;
  unitSummaries: Array<
    PropertyGraphGovernedRecord & {
      label: string;
      unitCount: number;
      occupancyType: string;
    }
  >;
  scopes: Array<
    PropertyGraphGovernedRecord & {
      scopeType: string;
      label: string;
      details: Record<string, unknown>;
    }
  >;
  aliases: Array<
    PropertyGraphGovernedRecord & {
      alias: string;
      aliasType: string;
      reviewStatus: string;
    }
  >;
  versions: Array<
    PropertyGraphGovernedRecord & {
      versionNumber: number;
      snapshotHash: string;
      changeSummary: string;
      recordedAt: string;
    }
  >;
};

/**
 * Authoritative public response contract for the property-graph workspace.
 * Server presenters and the production client both compile against this type.
 */
export type PropertyGraphWorkspaceResponse = {
  organization: {
    id: string;
    name: string;
    environment: string;
    synthetic: boolean;
  } | null;
  portfolios: Array<
    PropertyGraphGovernedRecord & {
      name: string;
      jurisdiction: string;
      primaryPeril: string;
      description: string;
      propertyIds: string[];
    }
  >;
  properties: PropertyGraphPropertyRecord[];
  relationships: Array<
    PropertyGraphGovernedRecord & {
      fromPropertyId: string;
      toPropertyId: string;
      relationshipType: string;
      scopeLabel: string;
      reviewStatus: string;
    }
  >;
  governance: {
    defaultCrossCustomerUse: string;
    rightsVerifiedRecords: number;
    governedRecords: number;
  };
};
