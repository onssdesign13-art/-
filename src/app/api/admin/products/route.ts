import { fail, ok, readJson } from "@/lib/api";
import { createProduct, listCollections, listProducts, type ProductInput } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const collection = url.searchParams.get("collection");
  const products = listProducts({
    q: url.searchParams.get("q") ?? undefined,
    collectionId: collection && collection !== "all" ? Number(collection) : null,
    uncategorized: collection === "none",
    status: (url.searchParams.get("status") as ProductInput["status"] | "all") ?? "all",
    sort: url.searchParams.get("sort") ?? "created_desc",
  });
  return ok({ products, collections: listCollections() });
}

export async function POST(request: Request) {
  try {
    const body = await readJson<ProductInput>(request);
    return ok({ product: createProduct(body) }, 201);
  } catch (error) {
    return fail(error);
  }
}
