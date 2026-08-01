import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { closeDb, getDatabasePath, getDb } from "@/db";

let tempRoot = "";

describe("sandbox database migrations", () => {
  beforeEach(async () => {
    closeDb();
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "fortify-migration-"));
    process.env.FORTIFY_DATABASE_PATH = path.join(tempRoot, "blank.sqlite");
  });

  afterEach(async () => {
    closeDb();
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  test("applies the complete SQLite sandbox migration to a blank database", () => {
    getDb();
    closeDb();

    const database = new Database(getDatabasePath(), { readonly: true });
    const tables = database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> '__drizzle_migrations' ORDER BY name",
      )
      .all()
      .map((row) => (row as { name: string }).name);
    const triggers = database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name",
      )
      .all()
      .map((row) => (row as { name: string }).name);
    database.close();

    expect(tables).toContain("app_state");
    expect(tables).toContain("audit_events");
    expect(tables).toContain("evidence_items");
    expect(tables).toContain("submissions");
    expect(tables).toHaveLength(30);
    expect(triggers).toEqual([
      "audit_events_no_delete",
      "audit_events_no_update",
    ]);
  });
});
