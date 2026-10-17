import { describe, expect, it, vi } from 'vitest';
import type { ProviderId, WorksheetFile } from '../types/game';
import type { Context, ProviderService } from './types';
import { parseWorksheet } from './adapter';
import { normalizePayload } from './validate';

const file = { name: 'fractions.pdf' } as unknown as WorksheetFile;
const context = {} as Context;
const KEY = 'test-key-123';

function goodJson(): string {
  const meta = {
    title: 'Fraction Frenzy',
    subject: 'Math',
    targetGrade: 'Grade 7',
    topicSummary: 'Practice adding and simplifying fractions.',
  };
  const difficulties = ['easy', 'easy', 'medium', 'medium', 'hard', 'hard'];
  const levels = Array.from({ length: 6 }, (_, i) => ({
    id: i + 1,
    difficulty: difficulties[i],
    question: `What is ${i + 1}/4 + 1/4?`,
    options: [`${i + 2}/4`, '1/2', '1/3', '1/8'],
    correctAnswer: `${i + 2}/4`,
    hint: 'Rewrite both fractions with the same denominator first.',
    explanation: `${i + 1}/4 + 1/4 = ${i + 2}/4.`,
  }));
  const matchingPairs = Array.from({ length: 6 }, (_, i) => ({
    id: `p${i + 1}`,
    term: `${i + 1}/2`,
    match: String((i + 1) / 2),
  }));
  return JSON.stringify({ meta, levels, matchingPairs });
}

const badJson = 'not json at all';

function fakeServices(
  extract = vi.fn().mockResolvedValue({ ok: true, value: context }),
  structure = vi.fn().mockResolvedValue({ ok: true, value: goodJson() }),
): Record<ProviderId, ProviderService> {
  const service: ProviderService = { extract, structure };
  return { mistral: service, gemini: service, openai: service };
}

describe('parseWorksheet', () => {
  it('reports reading then building', async () => {
    const onProgress = vi.fn();
    await parseWorksheet(file, 'mistral', KEY, { services: fakeServices(), onProgress });
    expect(onProgress.mock.calls.map((call) => call[0])).toEqual(['reading', 'building']);
  });

  it('returns a normalized payload for valid JSON', async () => {
    const result = await parseWorksheet(file, 'mistral', KEY, { services: fakeServices() });
    expect(result.ok ? 'ok' : `${result.error.kind}: ${result.error.message}`).toBe('ok');
    if (result.ok) {
      expect(result.value.levels).toHaveLength(6);
      expect(result.value.matchingPairs).toHaveLength(6);
    }
  });

  it('retries structure once with the validator message as feedback', async () => {
    const extract = vi.fn().mockResolvedValue({ ok: true, value: context });
    const structure = vi.fn()
      .mockResolvedValueOnce({ ok: true, value: badJson })
      .mockResolvedValueOnce({ ok: true, value: goodJson() });
    const result = await parseWorksheet(file, 'openai', KEY, { services: fakeServices(extract, structure) });

    expect(result.ok ? 'ok' : `${result.error.kind}: ${result.error.message}`).toBe('ok');
    expect(extract).toHaveBeenCalledTimes(1);
    expect(structure).toHaveBeenCalledTimes(2);

    const feedback = normalizePayload(badJson);
    if (feedback.ok) {
      throw new Error('badJson fixture must fail validation');
    }
    expect(feedback.error.kind).toBe('bad_output');
    expect(structure.mock.calls[0][3]).toBeUndefined();
    expect(structure.mock.calls[1][3]).toBe(feedback.error.message);
  });

  it('returns bad_output when the retry also fails', async () => {
    const extract = vi.fn().mockResolvedValue({ ok: true, value: context });
    const structure = vi.fn().mockResolvedValue({ ok: true, value: badJson });
    const result = await parseWorksheet(file, 'mistral', KEY, { services: fakeServices(extract, structure) });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('bad_output');
    }
    expect(extract).toHaveBeenCalledTimes(1);
    expect(structure).toHaveBeenCalledTimes(2);
  });

  it('propagates service errors without retrying', async () => {
    const extract = vi.fn().mockResolvedValue({ ok: true, value: context });
    const structure = vi.fn().mockResolvedValue({
      ok: false,
      error: { kind: 'auth', message: 'Invalid API key', status: 401 },
    });
    const result = await parseWorksheet(file, 'gemini', KEY, { services: fakeServices(extract, structure) });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('auth');
      expect(result.error.status).toBe(401);
    }
    expect(structure).toHaveBeenCalledTimes(1);
  });

  it('scrubs the API key from service error messages', async () => {
    const secret = 'sk-live-secret-123456';
    const extract = vi.fn().mockResolvedValue({
      ok: false,
      error: { kind: 'network', message: `GET https://api.example.com/v1?key=${secret} timed out` },
    });
    const result = await parseWorksheet(file, 'mistral', secret, { services: fakeServices(extract) });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('***');
      expect(result.error.message).not.toContain(secret);
    }
  });

  it('asks for an API key before calling any service', async () => {
    const services = fakeServices();
    const result = await parseWorksheet(file, 'mistral', '   ', { services });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('auth');
    }
    expect(services.mistral.extract).not.toHaveBeenCalled();
    expect(services.mistral.structure).not.toHaveBeenCalled();
  });
});
