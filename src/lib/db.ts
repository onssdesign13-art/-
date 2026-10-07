import Database from "better-sqlite3";
import { DB_PATH, ensureDirs } from "./config";

export type DB = Database.Database;

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS media (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  filename      TEXT NOT NULL UNIQUE,
  original_name TEXT,
  mime          TEXT NOT NULL,
  bytes         INTEGER NOT NULL DEFAULT 0,
  width         INTEGER,
  height        INTEGER,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS collections (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  release_date   TEXT,
  description    TEXT,
  cover_media_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  name               TEXT NOT NULL,
  slug               TEXT NOT NULL UNIQUE,
  code               TEXT NOT NULL UNIQUE,
  collection_id      INTEGER REFERENCES collections(id) ON DELETE SET NULL,
  category           TEXT,
  material           TEXT,
  dimensions         TEXT,
  year               INTEGER,
  description        TEXT,
  limited            INTEGER NOT NULL DEFAULT 0,
  edition_size       INTEGER,
  show_edition_count INTEGER NOT NULL DEFAULT 1,
  status             TEXT NOT NULL DEFAULT 'active',
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_media (
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_id   INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  position   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, media_id)
);

CREATE TABLE IF NOT EXISTS pages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  serial     INTEGER NOT NULL,
  code       TEXT NOT NULL UNIQUE,
  label      TEXT,
  note       TEXT,
  status     TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  UNIQUE (product_id, serial)
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  at        TEXT NOT NULL,
  action    TEXT NOT NULL,
  entity    TEXT,
  entity_id TEXT,
  detail    TEXT
);

CREATE INDEX IF NOT EXISTS idx_products_collection ON products(collection_id);
CREATE INDEX IF NOT EXISTS idx_pages_product ON pages(product_id);
CREATE INDEX IF NOT EXISTS idx_collections_release ON collections(release_date);
`;

declare global {
  // eslint-disable-next-line no-var
  var __objetDb: DB | undefined;
}

function create(): DB {
  ensureDirs();
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

export function getDb(): DB {
  if (!globalThis.__objetDb) globalThis.__objetDb = create();
  return globalThis.__objetDb;
}
