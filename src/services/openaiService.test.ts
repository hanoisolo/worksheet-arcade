import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WorksheetFile } from '../types/game';
import { openaiService } from './openaiService';

const worksheet = (mime: string, name = 'worksheet'): WorksheetFile => ({
  name,
  mime,
  base64: 'QUJD',
  bytes: 3,
});

interface CapturedRequest {
  url: unknown;
  headers: unknown;
  body: unknown;
}

function stubFetch(responseData: unknown): CapturedRequest {
  const captured: CapturedRequest = { url: undefined, headers: undefined, body: undefined };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: unknown, init?: { headers?: unknown; body?: unknown }) => {
      captured.url = input;
      captured.headers = init?.headers;
      captured.body = init?.body;
      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return captured;
}

function sentBody(captured: CapturedRequest): Record<string, unknown> {
  const raw = captured.body;
  return typeof raw === 'string'
    ? (JSON.parse(raw) as Record<string, unknown>)
    : (raw as Record<string, unknown>);
}

function headerValue(headers: unknown, name: string): string | undefined {
  if (headers instanceof Headers) {
    return headers.get(name) ?? undefined;
  }
  if (headers && typeof headers === 'object') {
    for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
      if (key.toLowerCase() === name.toLowerCase()) {
        return String(value);
      }
    }
  }
  return undefined;
}

describe('openaiService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('extract returns the file without any network call', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const file = worksheet('image/png');
    const result = await openaiService.extract(file, 'k');

    expect(result).toEqual({ ok: true, value: { file } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('structure requests the configured model and omits temperature', async () => {
    const captured = stubFetch({ choices: [{ message: { content: '{"games":[]}' } }] });

    const result = await openaiService.structure({ file: worksheet('image/png') }, 'k');

    expect(result).toEqual({ ok: true, value: '{"games":[]}' });
    expect(String(captured.url)).toBe('https://api.openai.com/v1/chat/completions');
    const body = sentBody(captured);
    expect(body.model).toBe('gpt-6-luna');
    expect(body).not.toHaveProperty('temperature');
  });

  it('structure sends images as high-detail image_url parts', async () => {
    const captured = stubFetch({ choices: [{ message: { content: 'ok' } }] });

    await openaiService.structure({ file: worksheet('image/jpeg') }, 'k');

    const messages = sentBody(captured).messages as { content: unknown }[];
    expect(messages[1].content).toEqual([
      { type: 'text', text: 'Here is the worksheet.' },
      {
        type: 'image_url',
        image_url: { url: 'data:image/jpeg;base64,QUJD', detail: 'high' },
      },
    ]);
  });

  it('structure sends pdfs as file parts with the filename', async () => {
    const captured = stubFetch({ choices: [{ message: { content: 'ok' } }] });

    await openaiService.structure({ file: worksheet('application/pdf', 'sheet.pdf') }, 'k');

    const messages = sentBody(captured).messages as { content: unknown[] }[];
    expect(messages[1].content[1]).toEqual({
      type: 'file',
      file: {
        filename: 'sheet.pdf',
        file_data: 'data:application/pdf;base64,QUJD',
      },
    });
  });

  it('structure sends the API key as a bearer token', async () => {
    const captured = stubFetch({ choices: [{ message: { content: 'ok' } }] });

    await openaiService.structure({ file: worksheet('image/png') }, 'k');

    expect(headerValue(captured.headers, 'Authorization')).toBe('Bearer k');
  });

  it('structure maps a refusal to bad_output', async () => {
    stubFetch({ choices: [{ message: { refusal: 'Cannot process this worksheet.' } }] });

    const result = await openaiService.structure({ file: worksheet('image/png') }, 'k');

    expect(result).toEqual({
      ok: false,
      error: { kind: 'bad_output', message: 'Cannot process this worksheet.' },
    });
  });
});
