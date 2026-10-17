import type { GamePayload, ParseStep, ProviderId, Result, WorksheetFile } from '../types/game';
import type { ProviderService } from './types';
import { geminiService } from './geminiService';
import { mistralService } from './mistralService';
import { openaiService } from './openaiService';
import { normalizePayload } from './validate';
import { scrub } from './http';

export const SERVICES: Record<ProviderId, ProviderService> = {
  mistral: mistralService,
  gemini: geminiService,
  openai: openaiService,
};

export interface ParseOptions {
  signal?: AbortSignal;
  onProgress?: (step: ParseStep) => void;
  services?: Record<ProviderId, ProviderService>;
}

type Failure = Extract<Result<GamePayload>, { ok: false }>['error'];

export async function parseWorksheet(
  file: WorksheetFile,
  provider: ProviderId,
  key: string,
  opts: ParseOptions = {},
): Promise<Result<GamePayload>> {
  const svc = (opts.services ?? SERVICES)[provider];
  const { signal, onProgress } = opts;

  const fail = (error: Failure): Result<GamePayload> => ({
    ok: false,
    error: { ...error, message: scrub(error.message, key) },
  });

  if (!key.trim()) {
    return fail({ kind: 'auth', message: 'Add an API key first.' });
  }

  onProgress?.('reading');
  const ctx = await svc.extract(file, key, signal);
  if (!ctx.ok) {
    return fail(ctx.error);
  }

  onProgress?.('building');
  const raw = await svc.structure(ctx.value, key, signal);
  if (!raw.ok) {
    return fail(raw.error);
  }

  const first = normalizePayload(raw.value);
  if (first.ok) {
    return { ok: true, value: first.value };
  }
  if (first.error.kind !== 'bad_output') {
    return fail(first.error);
  }

  const retry = await svc.structure(ctx.value, key, signal, first.error.message);
  if (!retry.ok) {
    return fail(retry.error);
  }

  const second = normalizePayload(retry.value);
  if (second.ok) {
    return { ok: true, value: second.value };
  }
  return fail(second.error);
}
