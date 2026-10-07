import { ok, fail, readJson } from "@/lib/api";
import { createCollection, listCollections, type CollectionInput } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return ok({ collections: listCollections() });
}

export async function POST(request: Request) {
  try {
    const body = await readJson<CollectionInput>(request);
    return ok({ collection: createCollection(body) }, 201);
  } catch (error) {
    return fail(error);
  }
}
