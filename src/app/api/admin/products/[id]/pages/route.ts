import { fail, notFound, ok, parseId, readJson, toOptionalInt } from "@/lib/api";
import { createPage, getProduct, pagesForProduct } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const id = parseId((await params).id);
  if (!id || !getProduct(id)) return notFound("Объект не найден.");
  return ok({ pages: pagesForProduct(id) });
}

export async function POST(request: Request, { params }: Ctx) {
  const id = parseId((await params).id);
  if (!id) return notFound("Объект не найден.");
  try {
    const body = await readJson<{ label?: string; note?: string; serial?: unknown; count?: unknown }>(
      request,
    );
    const count = Math.min(Math.max(toOptionalInt(body.count) ?? 1, 1), 50);
    const created = [];
    for (let i = 0; i < count; i += 1) {
      created.push(
        createPage(id, {
          label: body.label,
          note: body.note,
          serial: i === 0 ? toOptionalInt(body.serial) : null,
        }),
      );
    }
    return ok({ pages: created }, 201);
  } catch (error) {
    return fail(error);
  }
}
