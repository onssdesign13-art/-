import { NextResponse } from "next/server";
import { RepoError } from "./repo";
import { UploadError } from "./storage";

/** Turns thrown domain errors into clean JSON responses. */
export function fail(error: unknown) {
  if (error instanceof RepoError || error instanceof UploadError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  const message = error instanceof Error ? error.message : "Непредвиденная ошибка";
  console.error("[api]", error);
  return NextResponse.json({ error: message }, { status: 500 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "Не найдено") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data as Record<string, unknown>, { status });
}

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}

export function parseId(value: string | undefined): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function toOptionalInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? Math.trunc(num) : null;
}
