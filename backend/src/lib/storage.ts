import { promises as fs } from "node:fs";
import { dirname, resolve } from "node:path";

export type Storage = {
  getBuffer(key: string): Promise<Buffer>;
  putBuffer(key: string, buf: Buffer, contentType?: string): Promise<string>;
  exists?(key: string): Promise<boolean>;
  publicUrl(key: string): string;
};

const BASE = process.env.LOCAL_STORAGE_DIR ?? "app/storage";
const PUBLIC_BASE = process.env.PUBLIC_FILES_BASE ?? "http://localhost:4001/api/files";

async function ensureDirFor(filePath: string) {
  await fs.mkdir(dirname(filePath), { recursive: true });
}

const local: Storage = {
  async getBuffer(key) {
    const p = resolve(BASE, key);
    return fs.readFile(p);
  },
  async putBuffer(key, buf) {
    const p = resolve(BASE, key);
    await ensureDirFor(p);
    await fs.writeFile(p, buf);
    return key;
  },
  async exists(key) {
    try {
      await fs.access(resolve(BASE, key));
      return true;
    } catch {
      return false;
    }
  },
  publicUrl(key) {
    return `${PUBLIC_BASE}/${encodeURIComponent(key)}`;
  },
};

const storage: Storage = local; // Currently using local only
export default storage;
