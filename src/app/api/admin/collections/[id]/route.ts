import { fail, notFound, ok, parseId, readJson } from "@/lib/api";
import {
  deleteCollection,
  getCollection,
  listProducts,
  updateCollection,
  type CollectionInput,
} from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const id = parseId((await params).id);
  if (!id) return notFound("Коллекция не найдена.");
  const collection = getCollection(id);
  if (!collection) return notFound("Коллекция не найдена.");
  return ok({ collection, products: listProducts({ collectionId: id, sort: "name_asc" }) });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const id = parseId((await params).id);
  if (!id) return notFound("Коллекция не найдена.");
  try {
    const body = await readJson<CollectionInput>(request);
    return ok({ collection: updateCollection(id, body) });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const id = parseId((await params).id);
  if (!id) return notFound("Коллекция не найдена.");
  try {
    deleteCollection(id);
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
