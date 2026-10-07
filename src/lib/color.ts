/**
 * Tailwind colours are declared as `rgb(var(--token) / <alpha-value>)`, so CSS
 * variables must hold bare channels. The admin UI stores hex, hence this bridge.
 */
export function hexToRgbChannels(hex: string, fallback = "217 58 22"): string {
  const value = hex?.trim() ?? "";
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (!match) return fallback;
  let raw = match[1];
  if (raw.length === 3) raw = raw.split("").map((char) => char + char).join("");
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}
