import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { DB_PATH, ensureDirs } from "./config";

export type DB = Database.Database;

/** schema.sql is the single source of truth, shared with scripts/seed.mjs. */
function loadSchema(): string {
  const candidates = [
    path.join(process.cwd(), "src", "lib", "schema.sql"),
    path.join(__dirname, "schema.sql"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return fs.readFileSync(candidate, "utf8");
  }
  throw new Error("schema.sql not found — run the app from the project root");
}


declare global {
  // eslint-disable-next-line no-var
  var __objetDb: DB | undefined;
}

function create(): DB {
  ensureDirs();
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(loadSchema());
  return db;
}

export function getDb(): DB {
  if (!globalThis.__objetDb) globalThis.__objetDb = create();
  return globalThis.__objetDb;
}
