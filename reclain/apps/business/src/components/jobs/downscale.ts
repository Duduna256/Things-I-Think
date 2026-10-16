// Shrinks a photo in the browser before it goes up: phones take 3–12 MB pictures, and the
// job log wants a quick upload on Kampala mobile data more than it wants every pixel.
// Browser-only (canvas). Falls back to the original file when the picture can't be decoded;
// the server still checks type and size.

export const MAX_EDGE = 1600;
export const JPEG_QUALITY = 0.85;

interface Drawable {
  width: number;
  height: number;
  source: CanvasImageSource;
  release(): void;
}

async function decode(file: File): Promise<Drawable> {
  if (typeof createImageBitmap === "function") {
    try {
      // "from-image" honours the EXIF orientation, so a portrait phone photo stays upright.
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { width: bitmap.width, height: bitmap.height, source: bitmap, release: () => bitmap.close() };
    } catch {
      // Older browsers refuse the option or the format; try an <img> instead.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("The picture couldn't be read."));
      el.src = url;
    });
    return { width: img.naturalWidth, height: img.naturalHeight, source: img, release: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

// The size a picture ends up at: the longest edge at most `maxEdge`, never scaled up.
export function fitWithin(width: number, height: number, maxEdge = MAX_EDGE): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge || longest === 0) return { width, height };
  const scale = maxEdge / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error("The picture couldn't be saved."))), "image/jpeg", quality);
  });
}

// A JPEG of at most MAX_EDGE pixels on its longest side, or the original when shrinking
// isn't possible or wouldn't help.
export async function downscalePhoto(file: File, maxEdge = MAX_EDGE, quality = JPEG_QUALITY): Promise<File> {
  if (typeof document === "undefined" || !file.type.startsWith("image/")) return file;
  let drawable: Drawable | null = null;
  try {
    drawable = await decode(file);
    const size = fitWithin(drawable.width, drawable.height, maxEdge);
    const alreadySmall = size.width === drawable.width && size.height === drawable.height && file.type === "image/jpeg";
    if (alreadySmall) return file;
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(drawable.source, 0, 0, size.width, size.height);
    const blob = await toBlob(canvas, quality);
    // Re-encoding a small PNG or WebP can come out bigger; keep whichever is smaller.
    if (blob.size >= file.size && file.type !== "image/heic" && file.type !== "image/heif") return file;
    const name = `${file.name.replace(/\.[a-z0-9]+$/i, "") || "photo"}.jpg`;
    return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    return file;
  } finally {
    drawable?.release();
  }
}

// "240 KB" or "3.1 MB", for the line under the preview.
export function sizeText(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
