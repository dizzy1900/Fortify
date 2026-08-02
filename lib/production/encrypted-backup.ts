import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

export type EncryptedBackupEnvelope = {
  algorithm: "aes-256-gcm";
  keyReference: string;
  createdAt: string;
  plaintextSha256: string;
  ciphertextSha256: string;
  iv: string;
  authTag: string;
  ciphertext: string;
};

const digest = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

export function encryptBackup(
  plaintext: Uint8Array,
  input: { key: Uint8Array; keyReference: string; createdAt: string },
): EncryptedBackupEnvelope {
  if (input.key.byteLength !== 32)
    throw new Error("Backup encryption requires a 256-bit key.");
  if (!input.keyReference || !input.keyReference.includes("://"))
    throw new Error(
      "Backup keys must use an external secret-manager reference.",
    );
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", input.key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    algorithm: "aes-256-gcm",
    keyReference: input.keyReference,
    createdAt: input.createdAt,
    plaintextSha256: digest(plaintext),
    ciphertextSha256: digest(ciphertext),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function restoreBackup(
  envelope: EncryptedBackupEnvelope,
  key: Uint8Array,
) {
  if (key.byteLength !== 32)
    throw new Error("Backup restore requires a 256-bit key.");
  const ciphertext = Buffer.from(envelope.ciphertext, "base64");
  if (digest(ciphertext) !== envelope.ciphertextSha256)
    throw new Error("Encrypted backup digest mismatch.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(envelope.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(envelope.authTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  if (digest(plaintext) !== envelope.plaintextSha256)
    throw new Error("Restored backup digest mismatch.");
  return plaintext;
}
