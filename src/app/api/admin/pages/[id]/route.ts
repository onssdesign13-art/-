import { fail, notFound, ok, parseId, readJson } from "@/lib/api";
import { deletePage, getPage, updatePage, type PageInput } from "@/lib/repo";
import { getSettings } from "@/lib/settings";
import { objectUrl } from "@/lib/qr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const id = parseId((await params).id);
  const page = id ? getPage(id) : null;
  if (!page) return notFound("Страница не найдена.");
  const { base_url } = getSettings();
  return ok({ page: { ...page, url: objectUrl(base_url, page.code) } });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const id = parseId((await params).id);
  if (!id) return notFound("Страница не найдена.");
  try {
    const body = await readJson<PageInput & { status?: string }>(request);
    return ok({ page: updatePage(id, body) });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const id = parseId((await params).id);
  if (!id || !getPage(id)) return notFound("Страница не найдена.");
  try {
    deletePage(id);
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
