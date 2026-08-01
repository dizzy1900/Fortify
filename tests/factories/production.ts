import * as schema from "@/db/production/schema";
import {
  TenantRepository,
  tenantRecord,
  type ProductionDatabaseLike,
  type TenantContext,
} from "@/lib/production/repository";

export async function createTenantFixture(
  database: ProductionDatabaseLike,
  key: string,
) {
  const organizationId = `org-${key}`;
  const actorSubject = `identity-${key}`;
  const context: TenantContext = { organizationId, actorSubject };
  const repository = new TenantRepository(database);
  await repository.bootstrapOrganization({
    id: organizationId,
    slug: `brokerage-${key}`,
    name: `Brokerage ${key}`,
    kind: "brokerage",
    environment: "production",
    synthetic: false,
    actorSubject,
  });
  const owned = tenantRecord(context, "2026-08-01T12:00:00.000Z");
  const bookId = `book-${key}`;
  const clientId = `client-${key}`;
  const communityId = `community-${key}`;
  const propertyId = `property-${key}`;
  const marketId = `market-${key}`;
  const policyId = `policy-${key}`;
  await database.insert(schema.books).values({
    id: bookId,
    ...owned,
    name: `Book ${key}`,
  });
  await database.insert(schema.clients).values({
    id: clientId,
    ...owned,
    bookId,
    name: `Client ${key}`,
  });
  await repository.createCommunity(context, {
    id: communityId,
    clientId,
    name: `Community ${key}`,
    propertyClass: "condominium",
    summary: `Summary ${key}`,
  });
  await database.insert(schema.properties).values({
    id: propertyId,
    ...owned,
    communityId,
    name: `Property ${key}`,
    propertyClass: "condominium",
    unitCount: 24,
    buildingCount: 2,
  });
  await database.insert(schema.markets).values({
    id: marketId,
    ...owned,
    name: `Market ${key}`,
    marketType: "carrier",
    synthetic: false,
  });
  await database.insert(schema.policies).values({
    id: policyId,
    ...owned,
    propertyId,
    marketId,
    policyNumber: `POL-${key}`,
    expirationDate: "2027-01-01",
    currency: "USD",
    sourceAuthority: "broker",
  });
  return {
    repository,
    context,
    organizationId,
    bookId,
    clientId,
    communityId,
    propertyId,
    marketId,
    policyId,
  };
}
