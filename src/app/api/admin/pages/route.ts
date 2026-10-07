import { ok } from "@/lib/api";
import { listPages } from "@/lib/repo";
import { getSettings } from "@/lib/settings";
import { objectUrl } from "@/lib/qr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const productParam = url.searchParams.get("product");
  const pages = listPages({
    q: url.searchParams.get("q") ?? undefined,
    productId: productParam ? Number(productParam) : undefined,
  });
  const { base_url } = getSettings();
  return ok({
    pages: pages.map((page) => ({ ...page, url: objectUrl(base_url, page.code) })),
  });
}
