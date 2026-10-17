import type { ParseError, Result } from '../types/game';

export interface PostJsonOptions {
  signal?: AbortSignal;
  timeoutMs: number;
  provider: string;
}

/** Replace every occurrence of `key` with '***' so secrets never reach the UI or logs. */
export function scrub(message: string, key: string): string {
  if (!key) return message;
  return message.split(key).join('***');
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max);
}

/** Secret values carried in auth-ish headers, used to scrub provider echoes of a key. */
function secretCandidates(headers: Record<string, string>): string[] {
  const secrets: string[] = [];
  for (const [name, value] of Object.entries(headers)) {
    const lower = name.toLowerCase();
    if (lower === 'authorization') {
      const bearer = /^bearer\s+(.+)$/i.exec(value);
      if (bearer) secrets.push(bearer[1].trim());
    } else if (lower === 'x-goog-api-key') {
      secrets.push(value.trim());
    }
  }
  return secrets.filter((secret) => secret.length > 0);
}

function scrubAll(message: string, secrets: string[]): string {
  return secrets.reduce((acc, secret) => scrub(acc, secret), message);
}

function httpError(status: number, provider: string, detail: string | undefined): ParseError {
  if (status === 401 || status === 403) {
    return { kind: 'auth', message: `${provider} rejected the API key.`, status };
  }
  if (status === 429) {
    return {
      kind: 'quota',
      message: `${provider} is rate-limiting requests or the key is out of quota. Wait a moment and try again.`,
      status,
    };
  }
  if (status === 413) {
    return { kind: 'too_large', message: `The file is too large for ${provider}.`, status };
  }
  const suffix = detail ? ` ${truncate(detail, 200)}` : '';
  return { kind: 'network', message: `${provider} returned an error (${status}).${suffix}`, status };
}

async function errorFromResponse(
  res: Response,
  provider: string,
  secrets: string[],
): Promise<ParseError> {
  let detail: string | undefined;
  try {
    const parsed: unknown = JSON.parse(await res.text());
    if (parsed && typeof parsed === 'object') {
      const err = (parsed as { error?: unknown }).error;
      if (typeof err === 'string' && err) {
        detail = err;
      } else if (err && typeof err === 'object') {
        const message = (err as { message?: unknown }).message;
        if (typeof message === 'string' && message) detail = message;
      }
    }
  } catch {
    // Body was not JSON; report the status alone.
  }
  return httpError(res.status, provider, detail === undefined ? undefined : scrubAll(detail, secrets));
}

export async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  opts: PostJsonOptions,
): Promise<Result<unknown>> {
  const { signal, timeoutMs, provider } = opts;
  if (signal?.aborted) {
    return { ok: false, error: { kind: 'cancelled', message: 'Cancelled.' } };
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onUserAbort = () => controller.abort();
  signal?.addEventListener('abort', onUserAbort);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      return { ok: false, error: await errorFromResponse(res, provider, secretCandidates(headers)) };
    }
    const text = await res.text();
    try {
      return { ok: true, value: JSON.parse(text) };
    } catch {
      return { ok: true, value: text };
    }
  } catch {
    if (signal?.aborted) {
      return { ok: false, error: { kind: 'cancelled', message: 'Cancelled.' } };
    }
    if (timedOut) {
      return {
        ok: false,
        error: { kind: 'network', message: `The request to ${provider} timed out. Try again.` },
      };
    }
    return {
      ok: false,
      error: {
        kind: 'network',
        message: `Couldn't reach ${provider}. The file may be too large, the connection dropped, or the request timed out.`,
      },
    };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onUserAbort);
  }
}
