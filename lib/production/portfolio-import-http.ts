import { getProductionDatabase } from "@/db/production/client";
import { getProductionObjectStorage } from "@/lib/production/object-storage-runtime";
import { PortfolioImportService } from "@/lib/production/portfolio-import-service";

export function getProductionPortfolioImportService() {
  return new PortfolioImportService(
    getProductionDatabase(),
    getProductionObjectStorage(),
  );
}
