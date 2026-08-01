import {
  closeProductionDatabase,
  migrateProductionDatabase,
} from "@/db/production/client";

try {
  await migrateProductionDatabase();
  console.log("Production PostgreSQL migrations applied successfully.");
} finally {
  await closeProductionDatabase();
}
