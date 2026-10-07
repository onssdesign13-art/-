import crypto from "node:crypto";
import { cookies } from "next/headers";
import { adminPassword, sessionSecret } from "./config";

const COOKIE = "objet_admin";
const TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

function sign(value: string): string {
  return crypto.createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

export function issueToken(): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: "admin", exp: Date.now() + TTL_MS }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: string;
      exp?: number;
    };
    return data.sub === "admin" && typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}

export function passwordMatches(candidate: string): boolean {
  const expected = Buffer.from(adminPassword());
  const given = Buffer.from(candidate);
  if (expected.length !== given.length) return false;
  return crypto.timingSafeEqual(expected, given);
}

export const SESSION_COOKIE = COOKIE;

export function cookieOptions() {
  return {
    name: COOKIE,
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: TTL_MS / 1000,
    secure: process.env.NODE_ENV === "production" && !envAllowsInsecureCookies(),
  };
}

function envAllowsInsecureCookies(): boolean {
  // Set INSECURE_COOKIES=1 when running the production build over plain HTTP
  // (e.g. http://<vps-ip>:3000 without a TLS terminator).
  return process.env.INSECURE_COOKIES === "1";
}

/** Server component helper: is the current visitor an authenticated admin? */
export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifyToken(store.get(COOKIE)?.value);
}
