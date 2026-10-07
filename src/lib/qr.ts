import QRCode from "qrcode";

export function objectPath(code: string): string {
  return `/o/${code}`;
}

export function objectUrl(baseUrl: string, code: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${objectPath(code)}`;
}

export interface QrOptions {
  size?: number;
  margin?: number;
  dark?: string;
  light?: string;
}

function normalize(options: QrOptions = {}) {
  return {
    width: Math.min(Math.max(options.size ?? 512, 128), 2048),
    margin: Math.min(Math.max(options.margin ?? 2, 0), 8),
    errorCorrectionLevel: "M" as const,
    color: {
      dark: options.dark || "#000000",
      light: options.light || "#FFFFFF",
    },
  };
}

export async function qrPng(url: string, options: QrOptions = {}): Promise<Buffer> {
  return QRCode.toBuffer(url, { type: "png", ...normalize(options) });
}

export async function qrSvg(url: string, options: QrOptions = {}): Promise<string> {
  return QRCode.toString(url, { type: "svg", ...normalize(options) });
}

/** Data-URL PNG of the same QR — handy for print layouts and previews. */
export async function qrDataUrl(url: string, options: QrOptions = {}): Promise<string> {
  return QRCode.toDataURL(url, { ...normalize(options) });
}
