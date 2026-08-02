import { and, eq } from "drizzle-orm";
import * as schema from "@/db/production/schema";
import {
  PropertyGraphService,
  type PropertyGraphRegistration,
} from "@/lib/production/property-graph-service";
import {
  TenantRepository,
  tenantRecord,
  type ProductionDatabaseLike,
  type TenantContext,
} from "@/lib/production/repository";

export const CALIFORNIA_FIXTURE_ORGANIZATION_ID =
  "org-fortify-california-fixture";
export const CALIFORNIA_FIXTURE_PORTFOLIO_ID =
  "portfolio-california-fixture";
export const CALIFORNIA_FIXTURE_SEED_KEY =
  "california-property-graph-2026-08-01-v1";

const actorSubject = "fortify:california-development-fixture";
const at = "2026-08-01T12:00:00.000Z";
const propertyOneId = "property-ca-fixture-sierra-vista";
const propertyTwoId = "property-ca-fixture-canyon-court";
const buildingOneId = "building-ca-fixture-sierra-a";
const buildingTwoId = "building-ca-fixture-canyon-a";

const context: TenantContext = {
  organizationId: CALIFORNIA_FIXTURE_ORGANIZATION_ID,
  actorSubject,
  principalType: "membership",
  role: "organization_owner",
  grantedScopes: [],
};

const governed = {
  sourceSystem: "fortify-california-development-fixture",
  effectiveFrom: "2026-08-01",
  confidentialityState: "tenant_confidential" as const,
  dataRightClass: "property_specific_data" as const,
  rightsVerified: true,
};

const graph: PropertyGraphRegistration = {
  portfolio: {
    id: CALIFORNIA_FIXTURE_PORTFOLIO_ID,
    clientId: "client-california-fixture",
    name: "Fictional California catastrophe-property book",
    jurisdiction: "US-CA",
    primaryPeril: "wildfire",
    description:
      "Synthetic development fixture for tenant, property-graph, provenance, and insufficient-spatial-data behavior.",
    sourceRecordId: "CA-FIXTURE-PORTFOLIO-001",
    ...governed,
  },
  propertyLinks: [propertyOneId, propertyTwoId].map((propertyId, index) => ({
    id: `portfolio-property-ca-fixture-${index + 1}`,
    propertyId,
    sourceRecordId: `CA-FIXTURE-LINK-${index + 1}`,
    relationshipStatus: "active" as const,
    ...governed,
  })),
  parcels: [
    {
      id: "parcel-ca-fixture-sierra",
      propertyId: propertyOneId,
      label: "Primary association parcel",
      parcelNumber: "FIXTURE-APN-001",
      geometryStatus: "unavailable",
      sourceRecordId: "CA-FIXTURE-PARCEL-001",
      ...governed,
    },
    {
      id: "parcel-ca-fixture-canyon",
      propertyId: propertyTwoId,
      label: "Primary association parcel",
      parcelNumber: "FIXTURE-APN-002",
      geometryStatus: "unavailable",
      sourceRecordId: "CA-FIXTURE-PARCEL-002",
      ...governed,
    },
  ],
  unitSummaries: [
    {
      id: "unit-summary-ca-fixture-sierra",
      propertyId: propertyOneId,
      buildingId: buildingOneId,
      label: "Residential unit summary",
      unitCount: 48,
      occupancyType: "condominium_residential",
      sourceRecordId: "CA-FIXTURE-UNITS-001",
      ...governed,
    },
    {
      id: "unit-summary-ca-fixture-canyon",
      propertyId: propertyTwoId,
      buildingId: buildingTwoId,
      label: "Residential unit summary",
      unitCount: 32,
      occupancyType: "townhome_residential",
      sourceRecordId: "CA-FIXTURE-UNITS-002",
      ...governed,
    },
  ],
  scopes: [
    {
      id: "scope-ca-fixture-community",
      propertyId: propertyOneId,
      scopeType: "community",
      label: "Entire fictional association",
      details: { authority: "association_record" },
      ...governed,
    },
    {
      id: "scope-ca-fixture-parcel",
      propertyId: propertyOneId,
      parcelId: "parcel-ca-fixture-sierra",
      scopeType: "parcel",
      label: "Primary parcel",
      ...governed,
    },
    {
      id: "scope-ca-fixture-building-group",
      propertyId: propertyOneId,
      scopeType: "building_group",
      label: "Buildings A and B",
      details: { buildingLabels: ["Building A", "Building B"] },
      ...governed,
    },
    {
      id: "scope-ca-fixture-landscape",
      propertyId: propertyOneId,
      scopeType: "landscape_zone",
      label: "Shared landscape zone",
      details: { geometryStatus: "unavailable" },
      ...governed,
    },
    {
      id: "scope-ca-fixture-route",
      propertyId: propertyTwoId,
      scopeType: "access_route",
      label: "Shared access route",
      details: { geometryStatus: "unavailable" },
      ...governed,
    },
    {
      id: "scope-ca-fixture-infrastructure",
      propertyId: propertyTwoId,
      scopeType: "shared_infrastructure",
      label: "Shared water infrastructure",
      details: { sourceStatus: "fixture_only" },
      ...governed,
    },
  ],
  aliases: [
    {
      id: "alias-ca-fixture-sierra",
      propertyId: propertyOneId,
      alias: "Fictional Sierra Vista HOA",
      aliasType: "association_name",
      reviewStatus: "confirmed",
      ...governed,
    },
    {
      id: "alias-ca-fixture-canyon",
      propertyId: propertyTwoId,
      alias: "Fictional Canyon Court Association",
      aliasType: "association_name",
      reviewStatus: "confirmed",
      ...governed,
    },
  ],
  relationships: [
    {
      id: "relationship-ca-fixture-shared-route",
      fromPropertyId: propertyOneId,
      toPropertyId: propertyTwoId,
      relationshipType: "shared_access_route",
      scopeLabel: "Fictional Ridge Access Road",
      reviewStatus: "confirmed",
      ...governed,
    },
  ],
  versions: [
    {
      id: "property-version-ca-fixture-sierra-v1",
      propertyId: propertyOneId,
      versionNumber: 1,
      snapshot: {
        propertyName: "Fictional Sierra Vista Condominiums",
        propertyClass: "condominium",
        jurisdiction: "US-CA",
        unitCount: 48,
        buildingCount: 3,
        spatialBoundaryStatus: "unavailable",
        externalRiskScore: "not_provided",
      },
      changeSummary: "Initial synthetic California property baseline.",
      recordedAt: at,
      ...governed,
    },
    {
      id: "property-version-ca-fixture-canyon-v1",
      propertyId: propertyTwoId,
      versionNumber: 1,
      snapshot: {
        propertyName: "Fictional Canyon Court Townhomes",
        propertyClass: "townhome_community",
        jurisdiction: "US-CA",
        unitCount: 32,
        buildingCount: 4,
        spatialBoundaryStatus: "unavailable",
        externalRiskScore: "not_provided",
      },
      changeSummary: "Initial synthetic California property baseline.",
      recordedAt: at,
      ...governed,
    },
  ],
};

export async function seedCaliforniaPropertyGraphFixture(
  database: ProductionDatabaseLike,
) {
  const receipt = await database
    .select()
    .from(schema.idempotencyKeys)
    .where(
      and(
        eq(
          schema.idempotencyKeys.organizationId,
          CALIFORNIA_FIXTURE_ORGANIZATION_ID,
        ),
        eq(schema.idempotencyKeys.scope, "property_graph.register"),
        eq(schema.idempotencyKeys.key, CALIFORNIA_FIXTURE_SEED_KEY),
      ),
    )
    .limit(1);
  const service = new PropertyGraphService(database);
  if (receipt[0])
    return { replayed: true, workspace: await service.getWorkspace(context) };

  const repository = new TenantRepository(database);
  await repository.bootstrapOrganization({
    id: CALIFORNIA_FIXTURE_ORGANIZATION_ID,
    slug: "fortify-california-development-fixture",
    name: "Fortify California development fixture",
    kind: "brokerage_fixture",
    environment: "sandbox",
    synthetic: true,
    actorSubject,
    authority: {
      organizationId: CALIFORNIA_FIXTURE_ORGANIZATION_ID,
      actorSubject,
      principalType: "service_account",
      grantedScopes: ["organization:bootstrap"],
    },
  });
  const owned = tenantRecord(context, at);
  await database.insert(schema.books).values({
    id: "book-california-fixture",
    ...owned,
    name: "Fictional California catastrophe-property book",
    externalSystem: "fortify-california-development-fixture",
    externalId: "CA-FIXTURE-BOOK-001",
  });
  await database.insert(schema.clients).values({
    id: "client-california-fixture",
    ...owned,
    bookId: "book-california-fixture",
    name: "Fictional Pacific Resilience Brokerage",
    externalSystem: "fortify-california-development-fixture",
    externalId: "CA-FIXTURE-CLIENT-001",
  });
  await repository.createCommunity(context, {
    id: "community-ca-fixture-sierra",
    clientId: "client-california-fixture",
    name: "Fictional Sierra Vista Condominiums",
    propertyClass: "condominium",
    summary: "Synthetic California multi-building association fixture.",
    externalSystem: "fortify-california-development-fixture",
    externalId: "CA-FIXTURE-COMMUNITY-001",
  });
  await repository.createCommunity(context, {
    id: "community-ca-fixture-canyon",
    clientId: "client-california-fixture",
    name: "Fictional Canyon Court Townhomes",
    propertyClass: "townhome_community",
    summary: "Synthetic California townhome association fixture.",
    externalSystem: "fortify-california-development-fixture",
    externalId: "CA-FIXTURE-COMMUNITY-002",
  });
  await database.insert(schema.properties).values([
    {
      id: propertyOneId,
      ...owned,
      communityId: "community-ca-fixture-sierra",
      name: "Fictional Sierra Vista Condominiums",
      propertyClass: "condominium",
      unitCount: 48,
      buildingCount: 3,
    },
    {
      id: propertyTwoId,
      ...owned,
      communityId: "community-ca-fixture-canyon",
      name: "Fictional Canyon Court Townhomes",
      propertyClass: "townhome_community",
      unitCount: 32,
      buildingCount: 4,
    },
  ]);
  await database.insert(schema.locations).values([
    {
      id: "location-ca-fixture-sierra",
      ...owned,
      propertyId: propertyOneId,
      addressLine1: "100 Fictional Ridge Drive",
      city: "Nevada City",
      region: "CA",
      postalCode: "95959",
      county: "Nevada",
      normalizedAddress: "100fictionalridgedrnevacityca95959",
      normalizationStatus: "fixture_confirmed",
    },
    {
      id: "location-ca-fixture-canyon",
      ...owned,
      propertyId: propertyTwoId,
      addressLine1: "200 Fictional Canyon Court",
      city: "Auburn",
      region: "CA",
      postalCode: "95603",
      county: "Placer",
      normalizedAddress: "200fictionalcanyoncourtauburnca95603",
      normalizationStatus: "fixture_confirmed",
    },
  ]);
  await database.insert(schema.buildings).values([
    {
      id: buildingOneId,
      ...owned,
      propertyId: propertyOneId,
      label: "Building A",
      constructionYear: 1998,
    },
    {
      id: buildingTwoId,
      ...owned,
      propertyId: propertyTwoId,
      label: "Building A",
      constructionYear: 2004,
    },
  ]);

  const result = await service.register(
    context,
    CALIFORNIA_FIXTURE_SEED_KEY,
    graph,
  );
  return {
    replayed: result.replayed,
    workspace: await service.getWorkspace(context),
  };
}

export function californiaFixtureContext(): TenantContext {
  return { ...context };
}
