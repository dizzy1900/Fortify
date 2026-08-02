import { getProductionDatabase } from "@/db/production/client";
import { MarketPlaybookService } from "@/lib/production/market-playbook-service";

export function getProductionMarketPlaybookService() {
  return new MarketPlaybookService(getProductionDatabase());
}
