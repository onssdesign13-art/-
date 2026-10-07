import { notFound, ok, parseId } from "@/lib/api";
import { getPage } from "@/lib/repo";
import { getSettings } from "@/lib/settings";
import { objectUrl, qrPng, qrSvg } from "@/lib/qr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACCENT_SAFE = /^#[0-9a-fA-F]{3,8}$/;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = parseId((await params).id);
  const page = id ? getPage(id) : null;
  if (!page) return notFound("Страница не найдена.");

  const url = new URL(request.url);
  const settings = getSettings();
  const target = url.searchParams.get("target") || objectUrl(settings.base_url, page.code);
  const size = Number(url.searchParams.get("size") || 720);
  const margin = Number(url.searchParams.get("margin") || 1);
  const format = (url.searchParams.get("format") || "png").toLowerCase();
  const download = url.searchParams.get("download") === "1";
  const darkParam = url.searchParams.get("dark");
  const dark = darkParam && ACCENT_SAFE.test(darkParam) ? darkParam : "#000000";

  const filename = `passport-${page.code}-${page.serial}`;

  if (url.searchParams.get("data") === "1") {
    return ok({ url: target, code: page.code, serial: page.serial });
  }

  if (format === "svg") {
    const svg = await qrSvg(target, { size, margin, dark });
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "no-store",
        ...(download
          ? { "Content-Disposition": `attachment; filename="${filename}.svg"` }
          : {}),
      },
    });
  }

  const png = await qrPng(target, { size, margin, dark });
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
      ...(download
        ? { "Content-Disposition": `attachment; filename="${filename}.png"` }
        : {}),
    },
  });
}
