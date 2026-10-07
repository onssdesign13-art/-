import { fail, badRequest, ok } from "@/lib/api";
import { saveUpload } from "@/lib/storage";
import type { MediaRow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Accepts multipart/form-data with one or many `file` fields. */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const files = form.getAll("file").filter((entry): entry is File => entry instanceof File);
    if (files.length === 0) return badRequest("Файл не передан.");
    const width = form.get("width");
    const height = form.get("height");
    const single = files.length === 1;

    const saved: MediaRow[] = [];
    for (const file of files) {
      saved.push(
        await saveUpload(file, {
          width: single && width ? Number(width) : null,
          height: single && height ? Number(height) : null,
        }),
      );
    }
    return ok({ media: saved }, 201);
  } catch (error) {
    return fail(error);
  }
}
