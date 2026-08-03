import { getProductionDatabase } from "@/db/production/client";
import { AccessControlService } from "@/lib/production/access-control-service";
import type { ProductionDatabaseLike } from "@/lib/production/repository";

export function getProductionAccessControlService(
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
) {
  return new AccessControlService(database);
}
