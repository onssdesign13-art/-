import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { cookieOptions, issueToken, passwordMatches } from "@/lib/auth";
import { readJson } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await readJson<{ password?: string }>(request);
  const password = body.password ?? "";
  if (!password || !passwordMatches(password)) {
    return NextResponse.json({ error: "Неверный пароль." }, { status: 401 });
  }
  const store = await cookies();
  store.set({ ...cookieOptions(), value: issueToken() });
  return NextResponse.json({ ok: true });
}
