import { fail, notFound, ok, parseId, readJson } from "@/lib/api";
import {
  deleteProduct,
  getProduct,
  pagesForProduct,
  productPhotos,
  updateProduct,
  type ProductInput,
} from "@/lib/repo";
import { getSettings } from "@/lib/settings";
import { qrDataUrl, objectUrl } from "@/lib/qr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const id = parseId((await params).id);
  if (!id) return notFound("Объект не найден.");
  const product = getProduct(id);
  if (!product) return notFound("Объект не найден.");

  const pages = pagesForProduct(id);
  const base = new URL(request.url).origin;
  const { base_url } = getSettings();
  const withQr = await Promise.all(
    pages.map(async (page) => {
      const url = objectUrl(base_url || base, page.code);
      return { ...page, url, qr: await qrDataUrl(url, { size: 240 }) };
    }),
  );

  return ok({ product, photos: productPhotos(id), pages: withQr });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const id = parseId((await params).id);
  if (!id) return notFound("Объект не найден.");
  try {
    const body = await readJson<ProductInput>(request);
    return ok({ product: updateProduct(id, body) });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const id = parseId((await params).id);
  if (!id || !getProduct(id)) return notFound("Объект не найден.");
  try {
    deleteProduct(id);
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
