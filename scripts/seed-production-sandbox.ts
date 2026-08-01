import {
  closeProductionDatabase,
  getProductionDatabase,
  migrateProductionDatabase,
} from "@/db/production/client";
import { migrateDemoSeedToProduction } from "@/lib/production/seed-migration";
import { buildSeedState } from "@/lib/seed";

try {
  await migrateProductionDatabase();
  const receipt = await migrateDemoSeedToProduction(
    getProductionDatabase(),
    buildSeedState(),
  );
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  await closeProductionDatabase();
}
