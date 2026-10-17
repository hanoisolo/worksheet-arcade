import type { ParseError, Result, WorksheetFile } from '../types/game';

export const ACCEPT = 'image/png,image/jpeg,image/webp,application/pdf';
export const MAX_PDF_MB = 5;
export const MAX_IMAGE_MB = 15;

const LONG_EDGE_LIMIT_PX = 2000;
const JPEG_QUALITY = 0.85;
const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/webp'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

function failure(kind: ParseError['kind'], message: string): Result<WorksheetFile> {
  return { ok: false, error: { kind, message } };
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot).toLowerCase();
}

function byteCount(base64: string): number {
  return Math.floor((base64.length * 3) / 4);
}

function withExtension(name: string, extension: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? `${name}${extension}` : `${name.slice(0, dot)}${extension}`;
}

function imageMimeFromExtension(extension: string): string {
  if (extension === '.png') return 'image/png';
  if (extension === '.webp') return 'image/webp';
  return 'image/jpeg';
}

export function readAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      const comma = dataUrl.indexOf(',');
      resolve(comma === -1 ? '' : dataUrl.slice(comma + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file.'));
    reader.onabort = () => reject(new Error('Reading the file was cancelled.'));
    reader.readAsDataURL(blob);
  });
}

// Returns null when downscaling is unavailable (e.g. jsdom) or decoding fails;
// the caller then falls back to the raw file bytes.
async function tryDownscale(file: File): Promise<WorksheetFile | null> {
  try {
    if (typeof createImageBitmap !== 'function') return null;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, LONG_EDGE_LIMIT_PX / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    bitmap.close?.();
    const comma = dataUrl.indexOf(',');
    const base64 = comma === -1 ? '' : dataUrl.slice(comma + 1);
    return {
      name: withExtension(file.name, '.jpg'),
      mime: 'image/jpeg',
      base64,
      bytes: byteCount(base64),
    };
  } catch {
    return null;
  }
}

export async function fileToWorksheet(file: File): Promise<Result<WorksheetFile>> {
  const mime = (file.type || '').toLowerCase();
  const extension = extensionOf(file.name);

  if (
    extension === '.heic' ||
    extension === '.heif' ||
    mime === 'image/heic' ||
    mime === 'image/heif'
  ) {
    return failure(
      'unsupported',
      'iPhone HEIC photos aren\'t supported yet. Please export the photo as JPEG or PNG (or take a screenshot) and try again.',
    );
  }

  const isPdf = mime === 'application/pdf' || extension === '.pdf';
  const isImage = IMAGE_MIMES.includes(mime) || IMAGE_EXTENSIONS.includes(extension);
  if (!isPdf && !isImage) {
    return failure('unsupported', 'Please upload a PNG, JPEG, WEBP image or a PDF.');
  }

  try {
    if (isPdf) {
      if (file.size > MAX_PDF_MB * 1024 * 1024) {
        return failure(
          'too_large',
          `This PDF is bigger than ${MAX_PDF_MB} MB. Try a smaller file or just the pages you need.`,
        );
      }
      const base64 = await readAsBase64(file);
      return {
        ok: true,
        value: { name: file.name, mime: 'application/pdf', base64, bytes: byteCount(base64) },
      };
    }

    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      return failure(
        'too_large',
        `This image is bigger than ${MAX_IMAGE_MB} MB. Try a smaller photo or a screenshot.`,
      );
    }

    const downscaled = await tryDownscale(file);
    if (downscaled) {
      return { ok: true, value: downscaled };
    }

    const base64 = await readAsBase64(file);
    return {
      ok: true,
      value: {
        name: file.name,
        mime: file.type || imageMimeFromExtension(extension),
        base64,
        bytes: byteCount(base64),
      },
    };
  } catch {
    return failure('bad_output', `Could not read "${file.name}". Please try again.`);
  }
}
