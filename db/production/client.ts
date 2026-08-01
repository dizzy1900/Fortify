import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import path from "node:path";
import { requireProductionRuntime } from "@/lib/runtime";
import * as schema from "./schema";

let pool: Pool | undefined;
let database: NodePgDatabase<typeof schema> | undefined;

export function getProductionDatabase() {
  if (!database) {
    const { databaseUrl } = requireProductionRuntime();
    pool = new Pool({ connectionString: databaseUrl });
    database = drizzle(pool, { schema });
  }
  return database;
}

export async function migrateProductionDatabase() {
  const db = getProductionDatabase();
  await migrate(db, {
    migrationsFolder: path.resolve(process.cwd(), "drizzle-production"),
  });
}

export async function checkProductionDatabase() {
  const db = getProductionDatabase();
  await db.execute(sql`select 1 as healthy`);
}

export async function closeProductionDatabase() {
  await pool?.end();
  pool = undefined;
  database = undefined;
}

export type ProductionDatabase = NodePgDatabase<typeof schema>;
