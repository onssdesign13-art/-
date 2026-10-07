/**
 * Client-side photo preparation: photos straight from a phone camera are 4-8 MB
 * and useless for the web, so we downscale them in the browser before upload.
 */
export const MAX_EDGE = 2000;
export const WEBP_QUALITY = 0.9;

export interface PreparedFile {
  file: File;
  width: number | null;
  height: number | null;
}

export async function prepareFile(file: File): Promise<PreparedFile> {
  const passthrough =
    !file.type.startsWith("image/") ||
    file.type === "image/gif" ||
    file.type === "image/svg+xml";
  if (passthrough) return { file, width: null, height: null };

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 1.5 * 1024 * 1024 && file.type === "image/webp") {
      return { file, width: bitmap.width, height: bitmap.height };
    }
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return { file, width: bitmap.width, height: bitmap.height };
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY),
    );
    if (!blob) return { file, width: bitmap.width, height: bitmap.height };
    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return { file: new File([blob], name, { type: "image/webp" }), width, height };
  } catch {
    return { file, width: null, height: null };
  }
}
