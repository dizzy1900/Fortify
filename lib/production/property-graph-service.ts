import { and, eq, inArray } from "drizzle-orm";
import * as schema from "@/db/production/schema";
import { assertAuthorized } from "@/lib/production/authorization";
import {
  appendAudit,
  digest,
  IdempotencyConflictError,
  tenantRecord,
  TenantResourceNotFoundError,
  type ProductionDatabaseLike,
  type TenantContext,
} from "@/lib/production/repository";

export type ConfidentialityState =
  | "public"
  | "tenant_confidential"
  | "carrier_confidential"
  | "restricted";

export type DataRightClass =
  | "raw_customer_document"
  | "personally_identifiable"
  | "property_specific_data"
  | "carrier_confidential_material"
  | "customer_specific_playbook"
  | "fortify_generic_ontology"
  | "software_telemetry"
  | "deidentified_derived_event"
  | "cross_customer_benchmark"
  | "model_provider_restricted";

type GovernedInput = {
  sourceSystem: string;
  sourceRecordId?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  confidentialityState: ConfidentialityState;
  dataRightClass: DataRightClass;
  rightsVerified: boolean;
};

export type PropertyGraphRegistration = {
  portfolio: GovernedInput & {
    id: string;
    clientId: string;
    name: string;
    jurisdiction: string;
    primaryPeril: string;
    description?: string;
  };
  propertyLinks: Array<
    GovernedInput & {
      id: string;
      propertyId: string;
      relationshipStatus?: "active" | "pending_review" | "ended";
    }
  >;
  parcels: Array<
    GovernedInput & {
      id: string;
      propertyId: string;
      label: string;
      parcelNumber?: string;
      boundaryGeojson?: Record<string, unknown>;
      spatialReference?: string;
      geometryStatus: "unavailable" | "unreviewed" | "confirmed" | "rejected";
    }
  >;
  unitSummaries: Array<
    GovernedInput & {
      id: string;
      propertyId: string;
      buildingId?: string;
      label: string;
      unitCount: number;
      occupancyType: string;
    }
  >;
  scopes: Array<
    GovernedInput & {
      id: string;
      propertyId: string;
      parcelId?: string;
      buildingId?: string;
      unitSummaryId?: string;
      scopeType:
        | "community"
        | "parcel"
        | "building"
        | "building_group"
        | "unit_summary"
        | "landscape_zone"
        | "access_route"
        | "shared_infrastructure";
      label: string;
      details?: Record<string, unknown>;
    }
  >;
  aliases: Array<
    GovernedInput & {
      id: string;
      propertyId: string;
      alias: string;
      aliasType: string;
      reviewStatus: "unreviewed" | "confirmed" | "rejected" | "superseded";
    }
  >;
  relationships: Array<
    GovernedInput & {
      id: string;
      fromPropertyId: string;
      toPropertyId: string;
      relationshipType: string;
      scopeLabel?: string;
      reviewStatus: "unreviewed" | "confirmed" | "rejected" | "superseded";
    }
  >;
  versions: Array<
    GovernedInput & {
      id: string;
      propertyId: string;
      versionNumber: number;
      snapshot: Record<string, unknown>;
      changeSummary: string;
      supersedesId?: string;
      recordedAt?: string;
    }
  >;
};

export type PropertyGraphWorkspace = Awaited<
  ReturnType<PropertyGraphService["getWorkspace"]>
>;

export class PropertyGraphValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PropertyGraphValidationError";
  }
}

const confidentialityStates: ConfidentialityState[] = [
  "public",
  "tenant_confidential",
  "carrier_confidential",
  "restricted",
];
const dataRightClasses: DataRightClass[] = [
  "raw_customer_document",
  "personally_identifiable",
  "property_specific_data",
  "carrier_confidential_material",
  "customer_specific_playbook",
  "fortify_generic_ontology",
  "software_telemetry",
  "deidentified_derived_event",
  "cross_customer_benchmark",
  "model_provider_restricted",
];
const graphCollectionKeys = [
  "propertyLinks",
  "parcels",
  "unitSummaries",
  "scopes",
  "aliases",
  "relationships",
  "versions",
] as const;
const maximumCollectionSize = 5_000;

const graphResources = [
  "property_portfolio",
  "portfolio_property",
  "parcel",
  "unit_summary",
  "property_scope",
  "property_alias",
  "property_relationship",
  "property_version",
] as const;

function requireText(value: string, label: string) {
  if (!value?.trim())
    throw new PropertyGraphValidationError(`${label} is required.`);
  return value.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parsePropertyGraphRegistration(
  value: unknown,
): PropertyGraphRegistration {
  if (!isRecord(value) || !isRecord(value.portfolio))
    throw new PropertyGraphValidationError(
      "A property graph portfolio object is required.",
    );
  for (const key of graphCollectionKeys) {
    const collection = value[key];
    if (!Array.isArray(collection) || collection.some((item) => !isRecord(item)))
      throw new PropertyGraphValidationError(
        `${key} must be an array of objects.`,
      );
    if (collection.length > maximumCollectionSize)
      throw new PropertyGraphValidationError(
        `${key} exceeds the ${maximumCollectionSize}-record request limit.`,
      );
  }
  return value as unknown as PropertyGraphRegistration;
}

function governed(input: GovernedInput) {
  if (!confidentialityStates.includes(input.confidentialityState))
    throw new PropertyGraphValidationError(
      "A supported confidentiality state is required.",
    );
  if (!dataRightClasses.includes(input.dataRightClass))
    throw new PropertyGraphValidationError(
      "A supported data-right classification is required.",
    );
  if (typeof input.rightsVerified !== "boolean")
    throw new PropertyGraphValidationError(
      "Rights-recorded state must be explicitly true or false.",
    );
  return {
    sourceSystem: requireText(input.sourceSystem, "Source system"),
    sourceRecordId: input.sourceRecordId,
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo,
    confidentialityState: input.confidentialityState,
    dataRightClass: input.dataRightClass,
    rightsVerified: input.rightsVerified,
  };
}

function authorizeGraph(
  context: TenantContext,
  action: "read" | "create",
) {
  for (const resource of graphResources)
    assertAuthorized(context, {
      action,
      resource,
      resourceOrganizationId: context.organizationId,
    });
}

async function requireTenantIds(
  database: ProductionDatabaseLike,
  organizationId: string,
  ids: string[],
  table: typeof schema.properties | typeof schema.buildings,
  label: string,
) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return;
  const rows = await database
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.organizationId, organizationId), inArray(table.id, unique)));
  if (rows.length !== unique.length)
    throw new TenantResourceNotFoundError(label);
}

export class PropertyGraphService {
  constructor(readonly database: ProductionDatabaseLike) {}

  async register(
    context: TenantContext,
    idempotencyKey: string,
    input: PropertyGraphRegistration,
  ) {
    input = parsePropertyGraphRegistration(input);
    authorizeGraph(context, "create");
    requireText(idempotencyKey, "Idempotency key");
    requireText(input.portfolio.name, "Portfolio name");
    requireText(input.portfolio.jurisdiction, "Jurisdiction");
    requireText(input.portfolio.primaryPeril, "Primary peril");
    for (const item of input.propertyLinks) {
      requireText(item.id, "Portfolio property identifier");
      requireText(item.propertyId, "Portfolio property");
    }
    for (const item of input.parcels) {
      requireText(item.id, "Parcel identifier");
      requireText(item.propertyId, "Parcel property");
      requireText(item.label, "Parcel label");
    }
    for (const item of input.unitSummaries) {
      requireText(item.id, "Unit summary identifier");
      requireText(item.propertyId, "Unit summary property");
      requireText(item.label, "Unit summary label");
      requireText(item.occupancyType, "Unit summary occupancy type");
      if (!Number.isInteger(item.unitCount) || item.unitCount < 0)
        throw new PropertyGraphValidationError(
          "Unit summary count must be a non-negative integer.",
        );
    }
    for (const item of input.scopes) {
      requireText(item.id, "Property scope identifier");
      requireText(item.propertyId, "Property scope property");
      requireText(item.label, "Property scope label");
    }
    for (const item of input.aliases) {
      requireText(item.id, "Property alias identifier");
      requireText(item.propertyId, "Property alias property");
      requireText(item.alias, "Property alias");
      requireText(item.aliasType, "Property alias type");
    }
    for (const item of input.relationships) {
      requireText(item.id, "Property relationship identifier");
      requireText(item.fromPropertyId, "Relationship source property");
      requireText(item.toPropertyId, "Relationship target property");
      requireText(item.relationshipType, "Property relationship type");
    }
    for (const item of input.versions) {
      requireText(item.id, "Property version identifier");
      requireText(item.propertyId, "Versioned property");
      requireText(item.changeSummary, "Property version change summary");
      if (!Number.isInteger(item.versionNumber) || item.versionNumber < 1)
        throw new PropertyGraphValidationError(
          "Property version number must be a positive integer.",
        );
    }
    const requestHash = digest(input);

    return this.database.transaction(async (transaction) => {
      const replay = await transaction
        .select()
        .from(schema.idempotencyKeys)
        .where(
          and(
            eq(schema.idempotencyKeys.organizationId, context.organizationId),
            eq(schema.idempotencyKeys.scope, "property_graph.register"),
            eq(schema.idempotencyKeys.key, idempotencyKey),
          ),
        )
        .limit(1);
      if (replay[0]) {
        if (replay[0].requestHash !== requestHash)
          throw new IdempotencyConflictError();
        return {
          ...(replay[0].responseJson as {
            portfolioId: string;
            counts: Record<string, number>;
          }),
          replayed: true,
        };
      }

      const client = await transaction
        .select({ id: schema.clients.id })
        .from(schema.clients)
        .where(
          and(
            eq(schema.clients.id, input.portfolio.clientId),
            eq(schema.clients.organizationId, context.organizationId),
          ),
        )
        .limit(1);
      if (!client[0]) throw new TenantResourceNotFoundError("Client");

      const propertyIds = [
        ...input.propertyLinks.map((item) => item.propertyId),
        ...input.parcels.map((item) => item.propertyId),
        ...input.unitSummaries.map((item) => item.propertyId),
        ...input.scopes.map((item) => item.propertyId),
        ...input.aliases.map((item) => item.propertyId),
        ...input.relationships.flatMap((item) => [
          item.fromPropertyId,
          item.toPropertyId,
        ]),
        ...input.versions.map((item) => item.propertyId),
      ];
      await requireTenantIds(
        transaction,
        context.organizationId,
        propertyIds,
        schema.properties,
        "Property graph property",
      );
      await requireTenantIds(
        transaction,
        context.organizationId,
        [
          ...input.unitSummaries.flatMap((item) =>
            item.buildingId ? [item.buildingId] : [],
          ),
          ...input.scopes.flatMap((item) =>
            item.buildingId ? [item.buildingId] : [],
          ),
        ],
        schema.buildings,
        "Property graph building",
      );

      const at = new Date().toISOString();
      const owned = tenantRecord(context, at);
      await transaction.insert(schema.propertyPortfolios).values({
        id: input.portfolio.id,
        ...owned,
        ...governed(input.portfolio),
        clientId: input.portfolio.clientId,
        name: input.portfolio.name,
        jurisdiction: input.portfolio.jurisdiction,
        primaryPeril: input.portfolio.primaryPeril,
        description: input.portfolio.description ?? "",
      });

      if (input.propertyLinks.length > 0)
        await transaction.insert(schema.portfolioProperties).values(
          input.propertyLinks.map((item) => ({
            id: item.id,
            ...owned,
            ...governed(item),
            portfolioId: input.portfolio.id,
            propertyId: item.propertyId,
            relationshipStatus: item.relationshipStatus ?? "active",
          })),
        );
      if (input.parcels.length > 0)
        await transaction.insert(schema.parcels).values(
          input.parcels.map((item) => ({
            id: item.id,
            ...owned,
            ...governed(item),
            propertyId: item.propertyId,
            label: item.label,
            parcelNumber: item.parcelNumber,
            boundaryGeojson: item.boundaryGeojson,
            spatialReference: item.spatialReference ?? "EPSG:4326",
            geometryStatus: item.geometryStatus,
          })),
        );
      if (input.unitSummaries.length > 0)
        await transaction.insert(schema.unitSummaries).values(
          input.unitSummaries.map((item) => ({
            id: item.id,
            ...owned,
            ...governed(item),
            propertyId: item.propertyId,
            buildingId: item.buildingId,
            label: item.label,
            unitCount: item.unitCount,
            occupancyType: item.occupancyType,
          })),
        );
      if (input.scopes.length > 0)
        await transaction.insert(schema.propertyScopes).values(
          input.scopes.map((item) => ({
            id: item.id,
            ...owned,
            ...governed(item),
            propertyId: item.propertyId,
            parcelId: item.parcelId,
            buildingId: item.buildingId,
            unitSummaryId: item.unitSummaryId,
            scopeType: item.scopeType,
            label: item.label,
            details: item.details ?? {},
          })),
        );
      if (input.aliases.length > 0)
        await transaction.insert(schema.propertyAliases).values(
          input.aliases.map((item) => ({
            id: item.id,
            ...owned,
            ...governed(item),
            propertyId: item.propertyId,
            alias: item.alias,
            aliasType: item.aliasType,
            reviewStatus: item.reviewStatus,
          })),
        );
      if (input.relationships.length > 0)
        await transaction.insert(schema.propertyRelationships).values(
          input.relationships.map((item) => ({
            id: item.id,
            ...owned,
            ...governed(item),
            fromPropertyId: item.fromPropertyId,
            toPropertyId: item.toPropertyId,
            relationshipType: item.relationshipType,
            scopeLabel: item.scopeLabel ?? "",
            reviewStatus: item.reviewStatus,
          })),
        );
      if (input.versions.length > 0)
        await transaction.insert(schema.propertyVersions).values(
          input.versions.map((item) => ({
            id: item.id,
            ...owned,
            ...governed(item),
            propertyId: item.propertyId,
            versionNumber: item.versionNumber,
            snapshot: item.snapshot,
            snapshotHash: digest(item.snapshot),
            changeSummary: item.changeSummary,
            supersedesId: item.supersedesId,
            recordedAt: item.recordedAt ?? at,
          })),
        );

      const response = {
        portfolioId: input.portfolio.id,
        counts: {
          properties: input.propertyLinks.length,
          parcels: input.parcels.length,
          unitSummaries: input.unitSummaries.length,
          scopes: input.scopes.length,
          aliases: input.aliases.length,
          relationships: input.relationships.length,
          versions: input.versions.length,
        },
      };
      await appendAudit(transaction, context, {
        action: "property_graph.registered",
        resourceType: "property_portfolio",
        resourceId: input.portfolio.id,
        detail: {
          jurisdiction: input.portfolio.jurisdiction,
          primaryPeril: input.portfolio.primaryPeril,
          ...response.counts,
        },
        occurredAt: at,
      });
      await transaction.insert(schema.idempotencyKeys).values({
        id: crypto.randomUUID(),
        ...owned,
        scope: "property_graph.register",
        key: idempotencyKey,
        requestHash,
        responseJson: response,
      });
      return { ...response, replayed: false };
    });
  }

  async getWorkspace(context: TenantContext) {
    authorizeGraph(context, "read");
    const organizationFilter = eq(
      schema.organizations.id,
      context.organizationId,
    );
    const [
      organizations,
      portfolios,
      links,
      properties,
      communities,
      locations,
      buildings,
      parcels,
      unitSummaries,
      scopes,
      aliases,
      relationships,
      versions,
    ] = await Promise.all([
      this.database.select().from(schema.organizations).where(organizationFilter),
      this.database.select().from(schema.propertyPortfolios).where(eq(schema.propertyPortfolios.organizationId, context.organizationId)),
      this.database.select().from(schema.portfolioProperties).where(eq(schema.portfolioProperties.organizationId, context.organizationId)),
      this.database.select().from(schema.properties).where(eq(schema.properties.organizationId, context.organizationId)),
      this.database.select().from(schema.communities).where(eq(schema.communities.organizationId, context.organizationId)),
      this.database.select().from(schema.locations).where(eq(schema.locations.organizationId, context.organizationId)),
      this.database.select().from(schema.buildings).where(eq(schema.buildings.organizationId, context.organizationId)),
      this.database.select().from(schema.parcels).where(eq(schema.parcels.organizationId, context.organizationId)),
      this.database.select().from(schema.unitSummaries).where(eq(schema.unitSummaries.organizationId, context.organizationId)),
      this.database.select().from(schema.propertyScopes).where(eq(schema.propertyScopes.organizationId, context.organizationId)),
      this.database.select().from(schema.propertyAliases).where(eq(schema.propertyAliases.organizationId, context.organizationId)),
      this.database.select().from(schema.propertyRelationships).where(eq(schema.propertyRelationships.organizationId, context.organizationId)),
      this.database.select().from(schema.propertyVersions).where(eq(schema.propertyVersions.organizationId, context.organizationId)),
    ]);

    const activeLinks = links.filter((link) => link.lifecycleStatus === "active");
    const activeProperties = properties.filter(
      (property) => property.lifecycleStatus === "active",
    );
    return {
      organization: organizations[0]
        ? {
            id: organizations[0].id,
            name: organizations[0].name,
            environment: organizations[0].environment,
            synthetic: organizations[0].synthetic,
          }
        : null,
      portfolios: portfolios
        .filter((portfolio) => portfolio.lifecycleStatus === "active")
        .map((portfolio) => ({
          ...portfolio,
          propertyIds: activeLinks
            .filter((link) => link.portfolioId === portfolio.id)
            .map((link) => link.propertyId),
        })),
      properties: activeProperties.map((property) => ({
        ...property,
        community:
          communities.find((item) => item.id === property.communityId) ?? null,
        location:
          locations.find((item) => item.propertyId === property.id) ?? null,
        buildings: buildings.filter((item) => item.propertyId === property.id),
        parcels: parcels.filter((item) => item.propertyId === property.id),
        unitSummaries: unitSummaries.filter(
          (item) => item.propertyId === property.id,
        ),
        scopes: scopes.filter((item) => item.propertyId === property.id),
        aliases: aliases.filter((item) => item.propertyId === property.id),
        versions: versions
          .filter((item) => item.propertyId === property.id)
          .toSorted((left, right) => right.versionNumber - left.versionNumber),
      })),
      relationships,
      governance: {
        defaultCrossCustomerUse: "prohibited",
        rightsVerifiedRecords: [
          ...portfolios,
          ...links,
          ...parcels,
          ...unitSummaries,
          ...scopes,
          ...aliases,
          ...relationships,
          ...versions,
        ].filter((item) => item.rightsVerified).length,
        governedRecords:
          portfolios.length +
          links.length +
          parcels.length +
          unitSummaries.length +
          scopes.length +
          aliases.length +
          relationships.length +
          versions.length,
      },
    };
  }
}
