import { getProductionDatabase } from "@/db/production/client";
import {
  UnavailableCredentialResolver,
  UnavailableIntegrationProvider,
  providerBoundaryCatalog,
} from "@/lib/production/integration-providers";
import { IntegrationService } from "@/lib/production/integration-service";
import { getProductionObjectStorage } from "@/lib/production/object-storage-runtime";

export const getProductionIntegrationService = () =>
  new IntegrationService(
    getProductionDatabase(),
    getProductionObjectStorage(),
    providerBoundaryCatalog.map(
      (entry) => new UnavailableIntegrationProvider(entry.type),
    ),
    new UnavailableCredentialResolver(),
  );
