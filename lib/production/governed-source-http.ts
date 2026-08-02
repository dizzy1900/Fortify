import { getProductionDatabase } from "@/db/production/client";
import { GovernedSourceService } from "@/lib/production/governed-source-service";

export function getProductionGovernedSourceService() {
  return new GovernedSourceService(getProductionDatabase());
}
