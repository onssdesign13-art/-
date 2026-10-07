import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { UPLOAD_DIR, ensureDirs } from "./config";
import { getDb } from "./db";
import { nowIso } from "./ids";
import type { MediaRow } from "./types";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

export class UploadError extends Error {}

export async function saveUpload(
  file: File,
  meta: { width?: number | null; height?: number | null } = {},
): Promise<MediaRow> {
  ensureDirs();
  const ext = MIME_EXT[file.type];
  if (!ext) {
    throw new UploadError(
      `Неподдерживаемый формат (${file.type || "unknown"}). Разрешены JPG, PNG, WEBP, AVIF, GIF, SVG.`,
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError("Файл больше 20 МБ — уменьшите фотографию и попробуйте снова.");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now().toString(36)}-${crypto
    .randomBytes(6)
    .toString("hex")}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), bytes);

  const info = getDb()
    .prepare(
      `INSERT INTO media (filename, original_name, mime, bytes, width, height, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      filename,
      file.name || null,
      file.type,
      bytes.byteLength,
      meta.width ?? null,
      meta.height ?? null,
      nowIso(),
    );

  return getMedia(Number(info.lastInsertRowid)) as MediaRow;
}

export function getMedia(id: number): MediaRow | null {
  return (
    (getDb().prepare("SELECT * FROM media WHERE id = ?").get(id) as MediaRow) ??
    null
  );
}

export function mediaFilePath(filename: string): string {
  return path.join(UPLOAD_DIR, path.basename(filename));
}

export function deleteMedia(id: number): void {
  const db = getDb();
  const media = getMedia(id);
  if (!media) return;
  db.prepare("DELETE FROM product_media WHERE media_id = ?").run(id);
  db.prepare("UPDATE collections SET cover_media_id = NULL WHERE cover_media_id = ?").run(id);
  db.prepare("DELETE FROM media WHERE id = ?").run(id);
  const file = mediaFilePath(media.filename);
  try {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  } catch {
    /* file already gone — ignore */
  }
}

/** Removes orphaned media rows/files that no longer belong to anything. */
export function collectOrphans(): number {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT m.id FROM media m
       LEFT JOIN product_media pm ON pm.media_id = m.id
       LEFT JOIN collections c ON c.cover_media_id = m.id
       WHERE pm.media_id IS NULL AND c.id IS NULL`,
    )
    .all() as { id: number }[];
  for (const row of rows) deleteMedia(row.id);
  return rows.length;
}
