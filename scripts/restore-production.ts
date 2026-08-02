import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  restoreBackup,
  type EncryptedBackupEnvelope,
} from "@/lib/production/encrypted-backup";

const target = process.env.FORTIFY_RESTORE_TARGET_DATABASE_URL;
const inputPath = process.env.FORTIFY_RESTORE_INPUT_PATH;
const encodedKey = process.env.FORTIFY_BACKUP_ENCRYPTION_KEY_BASE64;
if (!target || !inputPath || !encodedKey)
  throw new Error(
    "An explicit isolated restore target, backup path, and backup key are required.",
  );
if (process.env.FORTIFY_CONFIRM_ISOLATED_RESTORE !== "true")
  throw new Error(
    "FORTIFY_CONFIRM_ISOLATED_RESTORE=true is required; never target production.",
  );
const envelope = JSON.parse(
  fs.readFileSync(path.resolve(inputPath), "utf8"),
) as EncryptedBackupEnvelope;
const dump = restoreBackup(envelope, Buffer.from(encodedKey, "base64"));
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "fortify-restore-"));
const dumpPath = path.join(tempRoot, "restore.dump");
try {
  fs.writeFileSync(dumpPath, dump, { mode: 0o600 });
  execFileSync(
    "pg_restore",
    ["--exit-on-error", "--no-owner", "--no-acl", dumpPath],
    { env: { ...process.env, PGDATABASE: target }, stdio: "inherit" },
  );
  execFileSync(
    "psql",
    [
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      "select count(*) as migration_count from drizzle.__drizzle_migrations;",
    ],
    { env: { ...process.env, PGDATABASE: target }, stdio: "inherit" },
  );
  console.log(
    JSON.stringify({ ok: true, plaintextSha256: envelope.plaintextSha256 }),
  );
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
