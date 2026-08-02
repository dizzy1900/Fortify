import { getProductionDatabase } from "@/db/production/client";
import { FundingProjectService } from "@/lib/production/funding-project-service";

export function getProductionFundingProjectService() {
  return new FundingProjectService(getProductionDatabase());
}
