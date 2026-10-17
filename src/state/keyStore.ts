import type { ProviderId } from '../types/game';
import { PROVIDER_IDS } from '../config/providers';

const PROVIDER_STORAGE_KEY = 'wa.provider';

const keyStorageKey = (provider: ProviderId): string => `wa.key.${provider}`;

function attempt<T>(op: () => T, fallback?: T): T {
  try {
    return op();
  } catch {
    // Storage access can throw in private mode; degrade gracefully.
    return fallback as T;
  }
}

const readLocal = (key: string): string | null => attempt(() => localStorage.getItem(key), null);

const readSession = (key: string): string | null => attempt(() => sessionStorage.getItem(key), null);

const writeLocal = (key: string, value: string): void => attempt(() => localStorage.setItem(key, value));

const writeSession = (key: string, value: string): void => attempt(() => sessionStorage.setItem(key, value));

const removeLocal = (key: string): void => attempt(() => localStorage.removeItem(key));

const removeSession = (key: string): void => attempt(() => sessionStorage.removeItem(key));

const isProviderId = (value: string | null): value is ProviderId =>
  value !== null && (PROVIDER_IDS as readonly string[]).includes(value);

export function getProvider(): ProviderId {
  const stored = readLocal(PROVIDER_STORAGE_KEY);
  return isProviderId(stored) ? stored : 'gemini';
}

export function setProvider(provider: ProviderId): void {
  writeLocal(PROVIDER_STORAGE_KEY, provider);
}

export function getKey(provider: ProviderId): string {
  const key = keyStorageKey(provider);
  return readSession(key) ?? readLocal(key) ?? '';
}

export function isRemembered(provider: ProviderId): boolean {
  return readLocal(keyStorageKey(provider)) !== null;
}

export function saveKey(provider: ProviderId, key: string, remember: boolean): void {
  const storageKey = keyStorageKey(provider);
  const trimmed = key.trim();
  if (remember) {
    writeLocal(storageKey, trimmed);
    removeSession(storageKey);
  } else {
    writeSession(storageKey, trimmed);
    removeLocal(storageKey);
  }
}

export function forgetKey(provider: ProviderId): void {
  const storageKey = keyStorageKey(provider);
  removeLocal(storageKey);
  removeSession(storageKey);
}
