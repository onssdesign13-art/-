import { fail, notFound, ok, parseId } from "@/lib/api";
import { deleteMedia, getMedia } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = parseId((await params).id);
  if (!id || !getMedia(id)) return notFound("Файл не найден.");
  try {
    deleteMedia(id);
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
