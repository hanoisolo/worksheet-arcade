import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorksheetFile } from '../types/game';
import { geminiService } from './geminiService';

const file: WorksheetFile = {
  name: 'worksheet.png',
  mime: 'image/png',
  base64: 'aGVsbG8=',
  bytes: 5,
};

const KEY = 'test-key-123';

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
  } as Response;
}

const fetchMock = vi.fn();

describe('geminiService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('extract makes no fetch call and returns the file as context', async () => {
    const res = await geminiService.extract(file, KEY);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(res).toEqual({ ok: true, value: { file } });
  });

  it('posts to the model endpoint with the key in a header only and returns the joined text', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        candidates: [
          { content: { parts: [{ text: '{"meta":' }, { text: '1}' }] }, finishReason: 'STOP' },
        ],
      }),
    );

    const res = await geminiService.structure({ file }, KEY);
    expect(res).toEqual({ ok: true, value: '{"meta":1}' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('https://generativelanguage.googleapis.com/v1beta/models/');
    expect(url).toContain('gemini-3.8-flash:generateContent');
    expect(url).not.toContain('key=');

    const headers = init.headers as Record<string, string>;
    expect(headers['x-goog-api-key']).toBe(KEY);

    const body = JSON.parse(init.body as string) as {
      contents: { role: string; parts: { text?: string; inline_data?: unknown }[] }[];
      generationConfig: {
        responseMimeType: string;
        responseSchema: unknown;
        temperature: number;
      };
    };
    expect(body.contents).toHaveLength(1);
    expect(body.contents[0].role).toBe('user');
    expect(body.contents[0].parts[0].text).toContain('JSON');
    expect(body.contents[0].parts[1].inline_data).toEqual({
      mime_type: 'image/png',
      data: 'aGVsbG8=',
    });
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.responseSchema).toEqual(expect.objectContaining({ type: 'object' }));
    expect(body.generationConfig.temperature).toBe(0.2);
  });

  it('returns bad_output when candidates are empty', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ candidates: [] }));

    const res = await geminiService.structure({ file }, KEY);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.kind).toBe('bad_output');
      expect(res.error.message).not.toContain(KEY);
    }
  });

  it('returns bad_output when the response was blocked for safety', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        candidates: [{ content: { parts: [{ text: 'nope' }] }, finishReason: 'SAFETY' }],
      }),
    );

    const res = await geminiService.structure({ file }, KEY);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.kind).toBe('bad_output');
      expect(res.error.message).not.toContain(KEY);
    }
  });
});
