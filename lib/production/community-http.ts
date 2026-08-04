import { getProductionDatabase } from "@/db/production/client";
import * as schema from "@/db/production/schema";
import {
  TenantRepository,
  type ProductionDatabaseLike,
} from "@/lib/production/repository";

type Community = typeof schema.communities.$inferSelect;

export function getProductionTenantRepository(
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
) {
  return new TenantRepository(database);
}

export function presentCommunity(community: Community) {
  return {
    id: community.id,
    name: community.name,
    propertyClass: community.propertyClass,
    summary: community.summary,
    revision: community.revision,
  };
}

export function presentCommunitySummary(community: Community) {
  return {
    id: community.id,
    summary: community.summary,
    revision: community.revision,
  };
}
