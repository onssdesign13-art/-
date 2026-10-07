import crypto from "node:crypto";

/**
 * Public URL codes. Alphabet excludes characters that are easy to misread
 * (0/O, 1/I/L) because these codes get printed on physical passports and
 * scanned by phones.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 8;

export function publicCode(length = CODE_LENGTH): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

const CYRILLIC: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "c",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

export function slugify(input: string): string {
  const lowered = input.toLowerCase().trim();
  let translit = "";
  for (const char of lowered) translit += CYRILLIC[char] ?? char;
  return (
    translit
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "item"
  );
}

/** "01", "07", "128" — serials are always shown with at least two digits. */
export function padSerial(serial: number): string {
  return String(serial).padStart(2, "0");
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Accepts either a bare code or a human friendly "slug-CODE" path segment and
 * returns the trailing code.
 */
export function extractCode(segment: string): string {
  const decoded = decodeURIComponent(segment).trim();
  const parts = decoded.split("-");
  const last = normalizeCode(parts[parts.length - 1] ?? "");
  if (last.length >= 6 && /[0-9]/.test(last)) return last;
  return normalizeCode(decoded);
}
