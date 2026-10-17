import { describe, expect, it } from 'vitest';
import { MISTRAL_OCR_MODEL, PROVIDERS, PROVIDER_IDS } from './providers';

describe('providers registry', () => {
  it('has exactly three providers', () => {
    expect(PROVIDER_IDS).toHaveLength(3);
    expect(Object.keys(PROVIDERS)).toHaveLength(3);
  });

  it('ids match registry keys', () => {
    for (const id of PROVIDER_IDS) {
      expect(PROVIDERS[id].id).toBe(id);
    }
    expect(PROVIDER_IDS).toEqual(Object.keys(PROVIDERS));
  });

  it('uses the exact model ids from the spec', () => {
    expect(MISTRAL_OCR_MODEL).toBe('mistral-ocr-latest');
    expect(PROVIDERS.mistral.model).toBe('zai-glm-5-3');
    expect(PROVIDERS.mistral.fallbackModel).toBe('mistral-large-4');
    expect(PROVIDERS.gemini.model).toBe('gemini-3.8-flash');
    expect(PROVIDERS.openai.model).toBe('gpt-6-luna');
  });

  it('caps uploads at 5 MB for every provider', () => {
    for (const id of PROVIDER_IDS) {
      expect(PROVIDERS[id].maxFileMB).toBe(5);
    }
  });
});
