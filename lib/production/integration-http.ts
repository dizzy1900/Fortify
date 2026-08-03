import { getProductionDatabase } from "@/db/production/client";
import {
  UnavailableCredentialResolver,
  UnavailableIntegrationProvider,
  providerBoundaryCatalog,
} from "@/lib/production/integration-providers";
import { IntegrationService } from "@/lib/production/integration-service";
import { getProductionObjectStorage } from "@/lib/production/object-storage-runtime";
import type { ProductionDatabaseLike } from "@/lib/production/repository";

export const getProductionIntegrationService = (
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
) =>
  new IntegrationService(
    database,
    getProductionObjectStorage(),
    providerBoundaryCatalog.map(
      (entry) => new UnavailableIntegrationProvider(entry.type),
    ),
    new UnavailableCredentialResolver(),
  );
