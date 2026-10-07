import { fail, notFound, ok, parseId, readJson } from "@/lib/api";
import { getProduct, setProductPhotos } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = parseId((await params).id);
  if (!id || !getProduct(id)) return notFound("Объект не найден.");
  try {
    const body = await readJson<{ mediaIds?: unknown[] }>(request);
    const ids = (body.mediaIds ?? []).map((value) => Number(value)).filter((n) => Number.isFinite(n));
    return ok({ photos: setProductPhotos(id, ids) });
  } catch (error) {
    return fail(error);
  }
}
