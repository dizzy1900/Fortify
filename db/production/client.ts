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
    pool = new Pool({
      connectionString: databaseUrl,
      application_name: "fortify-web",
      max: Number(process.env.FORTIFY_DATABASE_POOL_MAX ?? 10),
      connectionTimeoutMillis: Number(
        process.env.FORTIFY_DATABASE_CONNECT_TIMEOUT_MS ?? 5_000,
      ),
      idleTimeoutMillis: Number(
        process.env.FORTIFY_DATABASE_IDLE_TIMEOUT_MS ?? 30_000,
      ),
      query_timeout: Number(
        process.env.FORTIFY_DATABASE_QUERY_TIMEOUT_MS ?? 15_000,
      ),
      statement_timeout: Number(
        process.env.FORTIFY_DATABASE_STATEMENT_TIMEOUT_MS ?? 15_000,
      ),
      allowExitOnIdle: true,
    });
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
