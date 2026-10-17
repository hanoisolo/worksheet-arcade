import { afterEach, describe, expect, it, vi } from 'vitest';
import { postJson, scrub, type PostJsonOptions } from './http';

const OPTS: PostJsonOptions = { timeoutMs: 1000, provider: 'Mistral' };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** A fetch that never resolves on its own and rejects when the signal aborts. */
function hangingFetch(): typeof fetch {
  return vi.fn(
    (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      }),
  ) as unknown as typeof fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('postJson', () => {
  it('returns the parsed body on 200 and sends JSON', async () => {
    let requestUrl = '';
    let requestInit: RequestInit | undefined;
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      requestUrl = url;
      requestInit = init;
      return Promise.resolve(jsonResponse(200, { ok: true, data: [1, 2] }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await postJson('https://api.test/v1/x', { Authorization: 'Bearer k' }, { a: 1 }, OPTS);

    expect(result).toEqual({ ok: true, value: { ok: true, data: [1, 2] } });
    expect(requestUrl).toBe('https://api.test/v1/x');
    expect(requestInit?.method).toBe('POST');
    expect(requestInit?.headers).toMatchObject({
      Authorization: 'Bearer k',
      'content-type': 'application/json',
    });
    expect(requestInit?.body).toBe(JSON.stringify({ a: 1 }));
  });

  it('maps 401 to auth', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse(401, { error: { message: 'bad key' } }))));

    const result = await postJson('https://api.test', {}, {}, OPTS);

    expect(result).toEqual({
      ok: false,
      error: { kind: 'auth', message: 'Mistral rejected the API key.', status: 401 },
    });
  });

  it('maps 403 to auth', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse(403, {}))));

    const result = await postJson('https://api.test', {}, {}, OPTS);

    expect(result).toEqual({
      ok: false,
      error: { kind: 'auth', message: 'Mistral rejected the API key.', status: 403 },
    });
  });

  it('maps 429 to quota', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse(429, {}))));

    const result = await postJson('https://api.test', {}, {}, OPTS);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('quota');
      expect(result.error.status).toBe(429);
    }
  });

  it('maps 413 to too_large', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse(413, {}))));

    const result = await postJson('https://api.test', {}, {}, OPTS);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('too_large');
      expect(result.error.status).toBe(413);
    }
  });

  it('maps 500 to network containing the provider error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse(500, { error: { message: 'Internal boom' } }))),
    );

    const result = await postJson('https://api.test', {}, {}, OPTS);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('network');
      expect(result.error.status).toBe(500);
      expect(result.error.message).toContain('Internal boom');
    }
  });

  it('truncates provider error messages to 200 chars', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse(500, { error: { message: 'a'.repeat(250) } }))),
    );

    const result = await postJson('https://api.test', {}, {}, OPTS);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('a'.repeat(200));
      expect(result.error.message).not.toContain('a'.repeat(201));
    }
  });

  it('maps a fetch TypeError to network', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('fetch failed'))));

    const result = await postJson('https://api.test', {}, {}, OPTS);

    expect(result).toEqual({
      ok: false,
      error: {
        kind: 'network',
        message:
          "Couldn't reach Mistral. The file may be too large, the connection dropped, or the request timed out.",
      },
    });
  });

  it('maps a timeout to network', async () => {
    vi.stubGlobal('fetch', hangingFetch());

    const result = await postJson('https://api.test', {}, {}, { ...OPTS, timeoutMs: 10 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('network');
      expect(result.error.message).toContain('timed out');
    }
  });

  it('maps a user abort to cancelled', async () => {
    vi.stubGlobal('fetch', hangingFetch());
    const controller = new AbortController();

    const pending = postJson('https://api.test', {}, {}, {
      ...OPTS,
      timeoutMs: 5000,
      signal: controller.signal,
    });
    controller.abort();
    const result = await pending;

    expect(result).toEqual({ ok: false, error: { kind: 'cancelled', message: 'Cancelled.' } });
  });

  it('returns cancelled without calling fetch when the signal is already aborted', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    controller.abort();

    const result = await postJson('https://api.test', {}, {}, { ...OPTS, signal: controller.signal });

    expect(result).toEqual({ ok: false, error: { kind: 'cancelled', message: 'Cancelled.' } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never leaks the API key from a provider error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(jsonResponse(500, { error: { message: 'key sk-secret123 is invalid' } })),
      ),
    );

    const result = await postJson(
      'https://api.test',
      { Authorization: 'Bearer sk-secret123' },
      {},
      OPTS,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).not.toContain('sk-secret123');
      expect(result.error.message).toContain('***');
    }
  });
});

describe('scrub', () => {
  it('replaces every occurrence of the key', () => {
    expect(scrub('a sk-123 b sk-123 c', 'sk-123')).toBe('a *** b *** c');
  });

  it('leaves messages without the key untouched', () => {
    expect(scrub('hello world', 'sk-123')).toBe('hello world');
  });

  it('handles an empty key', () => {
    expect(scrub('hello world', '')).toBe('hello world');
  });
});
