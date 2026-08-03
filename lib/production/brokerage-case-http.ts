import { getProductionDatabase } from "@/db/production/client";
import { BrokerageCaseService } from "@/lib/production/brokerage-case-service";
import { getProductionObjectStorage } from "@/lib/production/object-storage-runtime";
import type { ProductionDatabaseLike } from "@/lib/production/repository";

export function getProductionBrokerageCaseService(
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
) {
  return new BrokerageCaseService(database, getProductionObjectStorage());
}
