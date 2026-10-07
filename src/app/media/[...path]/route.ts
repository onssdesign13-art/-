import fs from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { mediaFilePath } from "@/lib/storage";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const filename = path.basename(segments.join("/"));
  if (!filename || filename.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  const row = getDb()
    .prepare("SELECT mime FROM media WHERE filename = ?")
    .get(filename) as { mime: string } | undefined;
  if (!row) return new Response("Not found", { status: 404 });

  const file = mediaFilePath(filename);
  if (!fs.existsSync(file)) return new Response("Not found", { status: 404 });

  const stream = Readable.toWeb(fs.createReadStream(file)) as ReadableStream<Uint8Array>;
  return new Response(stream, {
    headers: {
      "Content-Type": row.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
