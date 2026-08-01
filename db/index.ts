import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

let connection: Database.Database | undefined;

export function getDatabasePath() {
  return path.resolve(process.cwd(), process.env.FORTIFY_DATABASE_PATH ?? "data/fortify.sqlite");
}

export function getDb() {
  if (!connection) {
    const filename = getDatabasePath();
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    connection = new Database(filename);
    connection.pragma("journal_mode = WAL");
    connection.pragma("foreign_keys = ON");
    migrate(drizzle(connection, { schema }), { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
    connection.exec(`
      CREATE TRIGGER IF NOT EXISTS audit_events_no_update
      BEFORE UPDATE ON audit_events BEGIN SELECT RAISE(ABORT, 'audit_events are immutable'); END;
      CREATE TRIGGER IF NOT EXISTS audit_events_no_delete
      BEFORE DELETE ON audit_events BEGIN SELECT RAISE(ABORT, 'audit_events are immutable'); END;
    `);
  }
  return drizzle(connection, { schema });
}

export function closeDb() {
  connection?.close();
  connection = undefined;
}
