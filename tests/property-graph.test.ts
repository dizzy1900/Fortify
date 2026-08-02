import { PGlite } from "@electric-sql/pglite";
import { and, eq } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import * as schema from "@/db/production/schema";
import {
  CALIFORNIA_FIXTURE_ORGANIZATION_ID,
  CALIFORNIA_FIXTURE_PORTFOLIO_ID,
  californiaFixtureContext,
  seedCaliforniaPropertyGraphFixture,
} from "@/lib/fixtures/california-property-graph";
import {
  parsePropertyGraphRegistration,
  PropertyGraphService,
} from "@/lib/production/property-graph-service";
import {
  digest,
  tenantRecord,
  type ProductionDatabaseLike,
} from "@/lib/production/repository";
import { migrateDemoSeedToProduction } from "@/lib/production/seed-migration";
import { buildSeedState } from "@/lib/seed";
import { createTenantFixture } from "./factories/production";

let client: PGlite;
let database: PgliteDatabase<typeof schema>;

describe("California property graph data plane", () => {
  beforeEach(async () => {
    client = new PGlite();
    database = drizzle(client, { schema });
    await migrate(database, {
      migrationsFolder: path.resolve(process.cwd(), "drizzle-production"),
    });
  });

  afterEach(async () => {
    await client.close();
  });

  test("rejects malformed graph request shapes before persistence", () => {
    expect(() => parsePropertyGraphRegistration({})).toThrow(
      "A property graph portfolio object is required.",
    );
    expect(() =>
      parsePropertyGraphRegistration({ portfolio: {}, propertyLinks: [] }),
    ).toThrow("parcels must be an array of objects.");
  });

  test("seeds an isolated California development-fixture organization and replays exactly", async () => {
    const first = await seedCaliforniaPropertyGraphFixture(
      database as unknown as ProductionDatabaseLike,
    );
    expect(first.replayed).toBe(false);
    expect(first.workspace.organization).toMatchObject({
      id: CALIFORNIA_FIXTURE_ORGANIZATION_ID,
      environment: "sandbox",
      synthetic: true,
    });
    expect(first.workspace.portfolios).toEqual([
      expect.objectContaining({
        id: CALIFORNIA_FIXTURE_PORTFOLIO_ID,
        jurisdiction: "US-CA",
        primaryPeril: "wildfire",
        propertyIds: expect.arrayContaining([
          "property-ca-fixture-sierra-vista",
          "property-ca-fixture-canyon-court",
        ]),
      }),
    ]);
    expect(first.workspace.properties).toHaveLength(2);
    expect(first.workspace.properties.flatMap((item) => item.parcels)).toHaveLength(2);
    expect(
      first.workspace.properties
        .flatMap((item) => item.parcels)
        .every(
          (parcel) =>
            parcel.geometryStatus === "unavailable" &&
            parcel.boundaryGeojson === null,
        ),
    ).toBe(true);
    expect(first.workspace.properties.flatMap((item) => item.scopes)).toHaveLength(6);
    expect(first.workspace.governance).toEqual({
      defaultCrossCustomerUse: "prohibited",
      governedRecords: 18,
      rightsVerifiedRecords: 18,
    });

    const replay = await seedCaliforniaPropertyGraphFixture(
      database as unknown as ProductionDatabaseLike,
    );
    expect(replay.replayed).toBe(true);
    expect(replay.workspace).toEqual(first.workspace);
  });

  test("keeps the California fixture separate from the preserved Colorado sandbox", async () => {
    await seedCaliforniaPropertyGraphFixture(
      database as unknown as ProductionDatabaseLike,
    );
    await migrateDemoSeedToProduction(
      database as unknown as ProductionDatabaseLike,
      buildSeedState(),
    );
    const service = new PropertyGraphService(
      database as unknown as ProductionDatabaseLike,
    );
    const workspace = await service.getWorkspace(californiaFixtureContext());
    expect(workspace.properties).toHaveLength(2);
    expect(
      workspace.properties.every(
        (property) => property.location?.region === "CA",
      ),
    ).toBe(true);
    expect(
      workspace.properties.some((property) => property.name.includes("Red Rock")),
    ).toBe(false);
  });

  test("rejects cross-tenant and same-tenant ownership mismatches", async () => {
    await seedCaliforniaPropertyGraphFixture(
      database as unknown as ProductionDatabaseLike,
    );
    const beta = await createTenantFixture(
      database as unknown as ProductionDatabaseLike,
      "graph-beta",
    );
    const owned = tenantRecord(
      californiaFixtureContext(),
      "2026-08-01T13:00:00.000Z",
    );
    await expect(
      database.insert(schema.parcels).values({
        id: "parcel-cross-tenant",
        ...owned,
        propertyId: beta.propertyId,
        label: "Cross-tenant parcel",
        geometryStatus: "unavailable",
        sourceSystem: "attack-fixture",
        confidentialityState: "restricted",
        dataRightClass: "property_specific_data",
        rightsVerified: false,
      }),
    ).rejects.toThrow();
    await expect(
      database.insert(schema.portfolioProperties).values({
        id: "portfolio-link-cross-tenant",
        ...owned,
        portfolioId: CALIFORNIA_FIXTURE_PORTFOLIO_ID,
        propertyId: beta.propertyId,
        sourceSystem: "attack-fixture",
        confidentialityState: "restricted",
        dataRightClass: "property_specific_data",
        rightsVerified: false,
        relationshipStatus: "pending_review",
      }),
    ).rejects.toThrow();

    await expect(
      database.insert(schema.unitSummaries).values({
        id: "unit-summary-wrong-building",
        ...owned,
        propertyId: "property-ca-fixture-sierra-vista",
        buildingId: "building-ca-fixture-canyon-a",
        label: "Mismatched same-tenant building",
        unitCount: 1,
        occupancyType: "fixture_attack",
        sourceSystem: "attack-fixture",
        confidentialityState: "restricted",
        dataRightClass: "property_specific_data",
        rightsVerified: false,
      }),
    ).rejects.toThrow();

    await database.insert(schema.clients).values({
      id: "client-ca-fixture-other",
      ...owned,
      bookId: "book-california-fixture",
      name: "Other fictional California client",
    });
    await database.insert(schema.communities).values({
      id: "community-ca-fixture-other",
      ...owned,
      clientId: "client-ca-fixture-other",
      name: "Other fictional California community",
      propertyClass: "condominium",
      summary: "Same tenant, different client boundary fixture.",
    });
    await database.insert(schema.properties).values({
      id: "property-ca-fixture-other-client",
      ...owned,
      communityId: "community-ca-fixture-other",
      name: "Other fictional California property",
      propertyClass: "condominium",
      unitCount: 1,
      buildingCount: 1,
    });
    await expect(
      database.insert(schema.portfolioProperties).values({
        id: "portfolio-link-wrong-client",
        ...owned,
        portfolioId: CALIFORNIA_FIXTURE_PORTFOLIO_ID,
        propertyId: "property-ca-fixture-other-client",
        sourceSystem: "attack-fixture",
        confidentialityState: "restricted",
        dataRightClass: "property_specific_data",
        rightsVerified: false,
        relationshipStatus: "pending_review",
      }),
    ).rejects.toThrow();

    const betaWorkspace = await new PropertyGraphService(
      database as unknown as ProductionDatabaseLike,
    ).getWorkspace(beta.context);
    expect(betaWorkspace.portfolios).toHaveLength(0);
    expect(betaWorkspace.properties).toHaveLength(1);
  });

  test("enforces immediate version lineage and immutable property snapshots", async () => {
    await seedCaliforniaPropertyGraphFixture(
      database as unknown as ProductionDatabaseLike,
    );
    const context = californiaFixtureContext();
    const owned = tenantRecord(context, "2026-08-01T14:00:00.000Z");
    const propertyId = "property-ca-fixture-sierra-vista";
    const predecessorId = "property-version-ca-fixture-sierra-v1";
    const snapshot = {
      propertyName: "Fictional Sierra Vista Condominiums",
      unitCount: 48,
      buildingCount: 3,
      spatialBoundaryStatus: "unavailable",
      sourceCorrection: "fixture_review",
    };

    await expect(
      database.insert(schema.propertyVersions).values({
        id: "invalid-property-version-v2",
        ...owned,
        propertyId,
        versionNumber: 2,
        snapshot,
        snapshotHash: digest(snapshot),
        changeSummary: "Missing predecessor must fail.",
        sourceSystem: "fortify-california-development-fixture",
        confidentialityState: "tenant_confidential",
        dataRightClass: "property_specific_data",
        rightsVerified: true,
        recordedAt: "2026-08-01T14:00:00.000Z",
      }),
    ).rejects.toThrow();

    await database.insert(schema.propertyVersions).values({
      id: "property-version-ca-fixture-sierra-v2",
      ...owned,
      propertyId,
      versionNumber: 2,
      snapshot,
      snapshotHash: digest(snapshot),
      changeSummary: "Synthetic fixture correction with explicit predecessor.",
      supersedesId: predecessorId,
      sourceSystem: "fortify-california-development-fixture",
      confidentialityState: "tenant_confidential",
      dataRightClass: "property_specific_data",
      rightsVerified: true,
      recordedAt: "2026-08-01T14:00:00.000Z",
    });
    await expect(
      database
        .update(schema.propertyVersions)
        .set({ changeSummary: "Tampered" })
        .where(
          and(
            eq(
              schema.propertyVersions.organizationId,
              CALIFORNIA_FIXTURE_ORGANIZATION_ID,
            ),
            eq(
              schema.propertyVersions.id,
              "property-version-ca-fixture-sierra-v2",
            ),
          ),
        ),
    ).rejects.toThrow();
  });
});
