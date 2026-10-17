// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fileToWorksheet } from './fileToWorksheet';

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

describe('fileToWorksheet', () => {
  it('rejects files that are neither images nor PDFs', async () => {
    const result = await fileToWorksheet(new File(['hello'], 'notes.txt', { type: 'text/plain' }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('unsupported');
      expect(result.error.message).toBe('Please upload a PNG, JPEG, WEBP image or a PDF.');
    }
  });

  it('rejects HEIC photos with a targeted message', async () => {
    const byExtension = await fileToWorksheet(
      new File([new Uint8Array([1, 2, 3])], 'photo.heic', { type: '' }),
    );
    expect(byExtension.ok).toBe(false);
    if (!byExtension.ok) {
      expect(byExtension.error.kind).toBe('unsupported');
      expect(byExtension.error.message).toContain('HEIC');
    }

    const byMime = await fileToWorksheet(
      new File([new Uint8Array([1, 2, 3])], 'photo', { type: 'image/heic' }),
    );
    expect(byMime.ok).toBe(false);
    if (!byMime.ok) {
      expect(byMime.error.kind).toBe('unsupported');
      expect(byMime.error.message).toContain('HEIC');
    }
  });

  it('rejects PDFs over 5 MB', async () => {
    const result = await fileToWorksheet(
      new File([new Uint8Array(6 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('too_large');
      expect(result.error.message).toContain('5 MB');
    }
  });

  it('reads a small PDF', async () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
    const result = await fileToWorksheet(
      new File([bytes], 'worksheet.pdf', { type: 'application/pdf' }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.mime).toBe('application/pdf');
      expect(result.value.name).toBe('worksheet.pdf');
      expect(result.value.base64.length).toBeGreaterThan(0);
      expect(Array.from(decodeBase64(result.value.base64))).toEqual(Array.from(bytes));
    }
  });

  it('falls back to the raw image bytes when downscaling is unavailable', async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01, 0x02]);
    const result = await fileToWorksheet(new File([bytes], 'page.png', { type: 'image/png' }));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.mime).toBe('image/png');
      expect(result.value.name).toBe('page.png');
      expect(Array.from(decodeBase64(result.value.base64))).toEqual(Array.from(bytes));
    }
  });
});
