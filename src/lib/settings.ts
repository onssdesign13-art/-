import { getDb } from "./db";
import { DEFAULT_SETTINGS, type BrandSettings } from "./types";
import { envBaseUrl } from "./config";

export function getSettings(): BrandSettings {
  const rows = getDb().prepare("SELECT key, value FROM settings").all() as {
    key: string;
    value: string;
  }[];
  const stored: Record<string, string> = {};
  for (const row of rows) stored[row.key] = row.value;

  const merged: BrandSettings = {
    ...DEFAULT_SETTINGS,
    base_url: envBaseUrl(),
    ...stored,
  } as BrandSettings;
  if (merged.language !== "en" && merged.language !== "ru") merged.language = "ru";
  return merged;
}

export function saveSettings(patch: Partial<BrandSettings>): BrandSettings {
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  );
  const tx = db.transaction((entries: [string, string][]) => {
    for (const [key, value] of entries) stmt.run(key, value);
  });
  const entries = Object.entries(patch)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => [key, String(value)] as [string, string]);
  tx(entries);
  return getSettings();
}
