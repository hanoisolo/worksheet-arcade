import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WorksheetFile } from '../types/game';
import { mistralService } from './mistralService';
import { MISTRAL_REASONING_RESPONSE } from './__fixtures__/mistralReasoning';

type FetchMock = ReturnType<typeof vi.fn>;
type FetchCall = [string, { headers?: unknown; body?: string }];

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function requestAt(mock: FetchMock, index: number): { url: string; auth: string; body: Record<string, unknown> } {
  const [url, init] = mock.mock.calls[index] as unknown as FetchCall;
  const headers: Record<string, string> = {};
  if (init?.headers instanceof Headers) {
    init.headers.forEach((value, name) => {
      headers[name] = value;
    });
  } else if (init?.headers && typeof init.headers === 'object') {
    Object.assign(headers, init.headers as Record<string, string>);
  }
  const authName = Object.keys(headers).find((name) => name.toLowerCase() === 'authorization');
  return {
    url,
    auth: authName ? headers[authName] : '',
    body: JSON.parse(init?.body ?? '{}') as Record<string, unknown>,
  };
}

function pngFile(): WorksheetFile {
  return { name: 'page.png', mime: 'image/png', base64: 'aGk=', bytes: 3 };
}

function pdfFile(): WorksheetFile {
  return { name: 'worksheet.pdf', mime: 'application/pdf', base64: 'aGk=', bytes: 3 };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('mistralService.extract', () => {
  it('posts PNG files as image_url data URIs', async () => {
    const fetchMock = vi.fn(async () => respond({ pages: [{ markdown: 'Question 1' }] }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await mistralService.extract(pngFile(), 'k');

    expect(result).toEqual({ ok: true, value: { text: 'Question 1' } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = requestAt(fetchMock, 0);
    expect(request.url).toBe('https://api.mistral.ai/v1/ocr');
    expect(request.auth).toBe('Bearer k');
    expect(request.body.model).toBe('mistral-ocr-latest');
    expect(request.body.document).toEqual({ type: 'image_url', image_url: 'data:image/png;base64,aGk=' });
  });

  it('posts PDF files as document_url data URIs', async () => {
    const fetchMock = vi.fn(async () => respond({ pages: [{ markdown: 'PDF text' }] }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await mistralService.extract(pdfFile(), 'k');

    expect(result).toEqual({ ok: true, value: { text: 'PDF text' } });
    expect(requestAt(fetchMock, 0).body.document).toEqual({
      type: 'document_url',
      document_url: 'data:application/pdf;base64,aGk=',
    });
  });

  it('joins page markdown with blank lines', async () => {
    const fetchMock = vi.fn(async () => respond({ pages: [{ markdown: 'Page one' }, { markdown: 'Page two' }, {}] }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await mistralService.extract(pdfFile(), 'k');

    expect(result).toEqual({ ok: true, value: { text: 'Page one\n\nPage two\n\n' } });
  });

  it('rejects unsupported mime types without calling the API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await mistralService.extract(
      { name: 'sheet.doc', mime: 'application/msword', base64: 'aGk=', bytes: 3 },
      'k',
    );

    expect(result).toEqual({ ok: false, error: { kind: 'unsupported', message: expect.any(String) } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns bad_output when OCR reads no text', async () => {
    const fetchMock = vi.fn(async () => respond({ pages: [{ markdown: '   ' }] }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await mistralService.extract(pngFile(), 'k');

    expect(result).toEqual({
      ok: false,
      error: { kind: 'bad_output', message: "Couldn't read any text from this worksheet." },
    });
  });
});

describe('mistralService.structure', () => {
  const ctx = { text: '1) What is 2 + 2?' };

  it('calls the primary model with a json_schema response format', async () => {
    const fetchMock = vi.fn(async () =>
      respond({ choices: [{ message: { content: '{"title":"Fraction Frenzy"}' } }] }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await mistralService.structure(ctx, 'k');

    expect(result).toEqual({ ok: true, value: '{"title":"Fraction Frenzy"}' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = requestAt(fetchMock, 0);
    expect(request.url).toBe('https://api.mistral.ai/v1/chat/completions');
    expect(request.auth).toBe('Bearer k');
    expect(request.body.model).toBe('zai-glm-5-3');
    expect(request.body.temperature).toBe(0.2);
    expect(request.body.response_format).toMatchObject({
      type: 'json_schema',
      json_schema: { name: 'game_payload', strict: true, schema: expect.any(Object) },
    });
    expect(request.body.messages).toEqual([
      { role: 'system', content: expect.any(String) },
      { role: 'user', content: 'WORKSHEET TEXT:\n1) What is 2 + 2?' },
    ]);
  });

  it('retries once with the fallback model after a 500', async () => {
    const fetchMock = vi.fn(async () => respond({ message: 'upstream error' }, 500));
    fetchMock.mockResolvedValueOnce(respond({ message: 'upstream error' }, 500));
    fetchMock.mockResolvedValueOnce(respond({ choices: [{ message: { content: '{"title":"Retry"}' } }] }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await mistralService.structure(ctx, 'k');

    expect(result).toEqual({ ok: true, value: '{"title":"Retry"}' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(requestAt(fetchMock, 0).body.model).toBe('zai-glm-5-3');
    expect(requestAt(fetchMock, 1).body.model).toBe('mistral-large-4');
  });

  it('does not retry on auth failures', async () => {
    const fetchMock = vi.fn(async () => respond({ message: 'Unauthorized' }, 401));
    vi.stubGlobal('fetch', fetchMock);

    const result = await mistralService.structure(ctx, 'k');

    expect(result).toMatchObject({ ok: false, error: { kind: 'auth' } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns bad_output when the model returns empty content', async () => {
    const fetchMock = vi.fn(async () => respond({ choices: [{ message: { content: '' } }] }));
    fetchMock.mockResolvedValueOnce(respond({ choices: [{ message: { content: '' } }] }));
    fetchMock.mockResolvedValueOnce(respond({ choices: [{ message: { content: '' } }] }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await mistralService.structure(ctx, 'k');

    expect(result).toEqual({ ok: false, error: { kind: 'bad_output', message: expect.any(String) } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(requestAt(fetchMock, 0).body.model).toBe('zai-glm-5-3');
    expect(requestAt(fetchMock, 1).body.model).toBe('mistral-large-4');
  });

  it('joins the text chunks and skips thinking when content is a reasoning chunk array', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respond(MISTRAL_REASONING_RESPONSE)));

    const result = await mistralService.structure(ctx, 'k');

    expect(result).toEqual({ ok: true, value: '{"meta":{"title":"Fraction Frenzy"}}' });
  });

  it('returns bad_output when a chunk array has only thinking', async () => {
    const content = [{ type: 'thinking', thinking: [{ type: 'text', text: 'hmm' }] }];
    const fetchMock = vi.fn(async () => respond({ choices: [{ message: { content } }] }));
    fetchMock.mockResolvedValueOnce(respond({ choices: [{ message: { content } }] }));
    fetchMock.mockResolvedValueOnce(respond({ choices: [{ message: { content } }] }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await mistralService.structure(ctx, 'k');

    expect(result).toEqual({
      ok: false,
      error: { kind: 'bad_output', message: 'Mistral returned an empty response.' },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(requestAt(fetchMock, 0).body.model).toBe('zai-glm-5-3');
    expect(requestAt(fetchMock, 1).body.model).toBe('mistral-large-4');
  });

  it('falls back when the primary returns empty content', async () => {
    const fetchMock = vi.fn(async () => respond({ message: 'unexpected call' }, 500));
    fetchMock.mockResolvedValueOnce(respond({ choices: [{ message: { content: '' } }] }));
    fetchMock.mockResolvedValueOnce(respond({ choices: [{ message: { content: '{"title":"Fallback"}' } }] }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await mistralService.structure(ctx, 'k');

    expect(result).toEqual({ ok: true, value: '{"title":"Fallback"}' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(requestAt(fetchMock, 0).body.model).toBe('zai-glm-5-3');
    expect(requestAt(fetchMock, 1).body.model).toBe('mistral-large-4');
  });

  it('falls back when the primary returns only thinking chunks', async () => {
    const thinking = [{ type: 'thinking', thinking: [{ type: 'text', text: 'hmm' }] }];
    const fetchMock = vi.fn(async () => respond({ message: 'unexpected call' }, 500));
    fetchMock.mockResolvedValueOnce(respond({ choices: [{ message: { content: thinking } }] }));
    fetchMock.mockResolvedValueOnce(respond({ choices: [{ message: { content: '{"title":"Fallback"}' } }] }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await mistralService.structure(ctx, 'k');

    expect(result).toEqual({ ok: true, value: '{"title":"Fallback"}' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(requestAt(fetchMock, 0).body.model).toBe('zai-glm-5-3');
    expect(requestAt(fetchMock, 1).body.model).toBe('mistral-large-4');
  });

  it('returns bad_output after a 500 and an empty fallback without a third call', async () => {
    const fetchMock = vi.fn(async () => respond({ message: 'upstream error' }, 500));
    fetchMock.mockResolvedValueOnce(respond({ message: 'upstream error' }, 500));
    fetchMock.mockResolvedValueOnce(respond({ choices: [{ message: { content: '' } }] }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await mistralService.structure(ctx, 'k');

    expect(result).toEqual({
      ok: false,
      error: { kind: 'bad_output', message: 'Mistral returned an empty response.' },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(requestAt(fetchMock, 0).body.model).toBe('zai-glm-5-3');
    expect(requestAt(fetchMock, 1).body.model).toBe('mistral-large-4');
  });

  it('returns bad_output without calling the API when context has no text', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await mistralService.structure({}, 'k');

    expect(result).toEqual({ ok: false, error: { kind: 'bad_output', message: expect.any(String) } });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
