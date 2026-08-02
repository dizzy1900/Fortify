import { getProductionDatabase } from "@/db/production/client";
import { BrokerageCaseService } from "@/lib/production/brokerage-case-service";
import { getProductionObjectStorage } from "@/lib/production/object-storage-runtime";

export function getProductionBrokerageCaseService() {
  return new BrokerageCaseService(
    getProductionDatabase(),
    getProductionObjectStorage(),
  );
}
