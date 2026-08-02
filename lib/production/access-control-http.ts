import { getProductionDatabase } from "@/db/production/client";
import { AccessControlService } from "@/lib/production/access-control-service";

export function getProductionAccessControlService() {
  return new AccessControlService(getProductionDatabase());
}
