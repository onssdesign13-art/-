import path from "node:path";
import fs from "node:fs";

const root = process.cwd();

function resolveDataDir(): string {
  const raw = process.env.DATA_DIR?.trim() || "./data";
  return path.isAbsolute(raw) ? raw : path.join(root, raw);
}

export const DATA_DIR = resolveDataDir();
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
export const DB_PATH = path.join(DATA_DIR, "app.db");

export function ensureDirs(): void {
  for (const dir of [DATA_DIR, UPLOAD_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD?.trim() || "change-me";
}

export function sessionSecret(): string {
  return (
    process.env.SESSION_SECRET?.trim() ||
    "dev-only-secret-change-me-please-32-chars-min"
  );
}

/** Public base URL used for QR payloads (no trailing slash). */
export function envBaseUrl(): string {
  const raw = process.env.BASE_URL?.trim() || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}
