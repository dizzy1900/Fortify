import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import Database from "better-sqlite3";
import { applyAction, getState, resetState } from "@/lib/repository";
import { closeDb, getDatabasePath } from "@/db";

let tempRoot = "";
describe("repository permissions and audit immutability", () => {
  beforeAll(async () => { tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "fortify-test-")); process.env.FORTIFY_DATABASE_PATH = path.join(tempRoot, "test.sqlite"); process.env.FORTIFY_STORAGE_PATH = path.join(tempRoot, "storage"); await resetState(); });
  afterAll(async () => { closeDb(); await fs.rm(tempRoot, { recursive: true, force: true }); });
  test("enforces read-only underwriter permissions", async () => { await applyAction({ type: "set-role", role: "underwriter" }); await expect(applyAction({ type: "confirm-notice", noticeId: "notice-jefferson", fields: {} })).rejects.toThrow("cannot perform"); await applyAction({ type: "request-clarification", submissionId: "sub-2", detail: "Clarify parcel scope." }); expect((await getState()).submissions.find((item) => item.id === "sub-2")?.status).toBe("clarification"); });
  test("database rejects audit mutation and deletion", () => { closeDb(); const db = new Database(getDatabasePath()); db.prepare("INSERT INTO audit_events (id, actor_id, action, detail_json, event_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)").run("guard-test", "tester", "Created", "{}", "abc", "2026-08-01T00:00:00Z"); expect(() => db.prepare("UPDATE audit_events SET action = 'Changed' WHERE id = 'guard-test'").run()).toThrow("immutable"); expect(() => db.prepare("DELETE FROM audit_events WHERE id = 'guard-test'").run()).toThrow("immutable"); db.close(); });
});
