import { describe, expect, it } from 'vitest';
import { normalizePayload } from '../services/validate';
import { SAMPLE_PAYLOAD } from './sampleData';

function collectStrings(payload: unknown): string[] {
  if (typeof payload === 'string') return [payload];
  if (Array.isArray(payload)) return payload.flatMap(collectStrings);
  if (typeof payload === 'object' && payload !== null) {
    return Object.values(payload).flatMap(collectStrings);
  }
  return [];
}

describe('SAMPLE_PAYLOAD', () => {
  it('normalizes successfully', () => {
    const result = normalizePayload(SAMPLE_PAYLOAD);
    expect(result.ok).toBe(true);
  });

  it('keeps 8 levels and 6 matching pairs', () => {
    const result = normalizePayload(SAMPLE_PAYLOAD);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.levels).toHaveLength(8);
    expect(result.value.matchingPairs).toHaveLength(6);
  });

  it('has every correctAnswer among the options', () => {
    const result = normalizePayload(SAMPLE_PAYLOAD);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const level of result.value.levels) {
      expect(level.options).toContain(level.correctAnswer);
    }
  });

  it('contains no backslash or dollar sign in any string', () => {
    const result = normalizePayload(SAMPLE_PAYLOAD);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const text of collectStrings(result.value)) {
      expect(text).not.toMatch(/[\\$]/);
    }
  });
});
