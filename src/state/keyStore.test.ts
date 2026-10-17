import { beforeEach, describe, expect, it } from 'vitest';
import { forgetKey, getKey, getProvider, isRemembered, saveKey, setProvider } from './keyStore';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('keyStore', () => {
  it('defaults to gemini when no provider is stored', () => {
    expect(getProvider()).toBe('gemini');
  });

  it('falls back to gemini for an invalid stored provider', () => {
    localStorage.setItem('wa.provider', 'grok');
    expect(getProvider()).toBe('gemini');
  });

  it('persists the selected provider', () => {
    setProvider('mistral');
    expect(localStorage.getItem('wa.provider')).toBe('mistral');
    expect(getProvider()).toBe('mistral');
  });

  it('saves to sessionStorage only by default', () => {
    saveKey('mistral', 'k1', false);
    expect(sessionStorage.getItem('wa.key.mistral')).toBe('k1');
    expect(localStorage.getItem('wa.key.mistral')).toBeNull();
    expect(getKey('mistral')).toBe('k1');
    expect(isRemembered('mistral')).toBe(false);
  });

  it('moves the key to localStorage when remembered and drops the session copy', () => {
    saveKey('mistral', 'k1', false);
    saveKey('mistral', 'k2', true);
    expect(localStorage.getItem('wa.key.mistral')).toBe('k2');
    expect(sessionStorage.getItem('wa.key.mistral')).toBeNull();
    expect(getKey('mistral')).toBe('k2');
    expect(isRemembered('mistral')).toBe(true);
  });

  it('removes the local copy when remember is switched back off', () => {
    saveKey('mistral', 'k2', true);
    saveKey('mistral', 'k3', false);
    expect(sessionStorage.getItem('wa.key.mistral')).toBe('k3');
    expect(localStorage.getItem('wa.key.mistral')).toBeNull();
    expect(isRemembered('mistral')).toBe(false);
  });

  it('prefers the session copy in getKey', () => {
    localStorage.setItem('wa.key.openai', 'local-copy');
    sessionStorage.setItem('wa.key.openai', 'session-copy');
    expect(getKey('openai')).toBe('session-copy');
  });

  it('falls back to localStorage, then empty string, in getKey', () => {
    expect(getKey('openai')).toBe('');
    localStorage.setItem('wa.key.openai', 'local-copy');
    expect(getKey('openai')).toBe('local-copy');
  });

  it('forgets the key from both storages', () => {
    localStorage.setItem('wa.key.gemini', 'local-copy');
    sessionStorage.setItem('wa.key.gemini', 'session-copy');
    forgetKey('gemini');
    expect(localStorage.getItem('wa.key.gemini')).toBeNull();
    expect(sessionStorage.getItem('wa.key.gemini')).toBeNull();
    expect(getKey('gemini')).toBe('');
    expect(isRemembered('gemini')).toBe(false);
  });

  it('trims whitespace from saved keys', () => {
    saveKey('gemini', '  gem-key\t\n', true);
    expect(getKey('gemini')).toBe('gem-key');
    saveKey('openai', '  oai-key  ', false);
    expect(getKey('openai')).toBe('oai-key');
  });
});
