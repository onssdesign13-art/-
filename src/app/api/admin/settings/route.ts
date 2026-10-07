import { fail, ok, readJson } from "@/lib/api";
import { getSettings, saveSettings } from "@/lib/settings";
import type { BrandSettings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return ok({ settings: getSettings() });
}

export async function PATCH(request: Request) {
  try {
    const body = await readJson<Partial<BrandSettings>>(request);
    return ok({ settings: saveSettings(body) });
  } catch (error) {
    return fail(error);
  }
}
