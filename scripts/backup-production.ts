import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { encryptBackup } from "@/lib/production/encrypted-backup";
import { requireProductionRuntime } from "@/lib/runtime";

const { databaseUrl } = requireProductionRuntime();
const encodedKey = process.env.FORTIFY_BACKUP_ENCRYPTION_KEY_BASE64;
const keyReference = process.env.FORTIFY_BACKUP_ENCRYPTION_KEY_REFERENCE;
const outputPath = process.env.FORTIFY_BACKUP_OUTPUT_PATH;
if (!encodedKey || !keyReference || !outputPath)
  throw new Error(
    "Backup key, external key reference, and explicit output path are required.",
  );
const dump = execFileSync(
  "pg_dump",
  ["--format=custom", "--no-owner", "--no-acl"],
  {
    env: { ...process.env, PGDATABASE: databaseUrl },
    maxBuffer: 1024 * 1024 * 1024,
  },
);
const envelope = encryptBackup(dump, {
  key: Buffer.from(encodedKey, "base64"),
  keyReference,
  createdAt: new Date().toISOString(),
});
fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
fs.writeFileSync(path.resolve(outputPath), `${JSON.stringify(envelope)}\n`, {
  mode: 0o600,
});
console.log(
  JSON.stringify({
    ok: true,
    outputPath: path.resolve(outputPath),
    plaintextSha256: envelope.plaintextSha256,
    ciphertextSha256: envelope.ciphertextSha256,
  }),
);
