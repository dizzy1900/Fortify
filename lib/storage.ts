import fs from "node:fs/promises";
import path from "node:path";

export interface FileStorageAdapter {
  put(relativePath: string, bytes: Uint8Array | string): Promise<string>;
  read(relativePath: string): Promise<Uint8Array>;
  exists(relativePath: string): Promise<boolean>;
}

export class LocalFileStorageAdapter implements FileStorageAdapter {
  constructor(private readonly root = path.resolve(process.cwd(), process.env.FORTIFY_STORAGE_PATH ?? "storage/evidence")) {}
  private resolve(relativePath: string) {
    const target = path.resolve(this.root, relativePath);
    if (!target.startsWith(`${this.root}${path.sep}`)) throw new Error("Storage path escapes adapter root");
    return target;
  }
  async put(relativePath: string, bytes: Uint8Array | string) { const target = this.resolve(relativePath); await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, bytes); return target; }
  async read(relativePath: string) { return new Uint8Array(await fs.readFile(this.resolve(relativePath))); }
  async exists(relativePath: string) { try { await fs.access(this.resolve(relativePath)); return true; } catch { return false; } }
}

// Future adapter contract: the same relative keys can be backed by an S3-compatible
// object store. No remote integration is configured or implied in this MVP.
