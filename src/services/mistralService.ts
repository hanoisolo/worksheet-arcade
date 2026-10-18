import type { Result, WorksheetFile } from '../types/game';
import { MISTRAL_OCR_MODEL, PROVIDERS } from '../config/providers';
import { postJson } from './http';
import { buildPrompt } from './prompt';
import { mistralSchema } from './schema';
import type { Context, ProviderService } from './types';

const OCR_URL = 'https://api.mistral.ai/v1/ocr';
const CHAT_URL = 'https://api.mistral.ai/v1/chat/completions';
const MAX_TEXT_CHARS = 30000;

type OcrResponse = { pages?: Array<{ markdown?: string }> };
type ChatResponse = { choices?: Array<{ message?: { content?: unknown } }> };

function ocrDocument(
  file: WorksheetFile,
): { type: 'image_url'; image_url: string } | { type: 'document_url'; document_url: string } | null {
  if (file.mime.startsWith('image/')) {
    return { type: 'image_url', image_url: `data:${file.mime};base64,${file.base64}` };
  }
  if (file.mime === 'application/pdf') {
    return { type: 'document_url', document_url: `data:application/pdf;base64,${file.base64}` };
  }
  return null;
}

async function extract(file: WorksheetFile, key: string, signal?: AbortSignal): Promise<Result<Context>> {
  const document = ocrDocument(file);
  if (!document) {
    return { ok: false, error: { kind: 'unsupported', message: `Unsupported file type: ${file.mime}` } };
  }
  const response = await postJson(
    OCR_URL,
    { Authorization: `Bearer ${key}` },
    { model: MISTRAL_OCR_MODEL, document },
    { signal, timeoutMs: 45000, provider: 'Mistral' },
  );
  if (!response.ok) return response;
  const data = response.value as OcrResponse;
  const text = ((data.pages ?? []).map((page) => page.markdown ?? '').join('\n\n')).slice(0, MAX_TEXT_CHARS);
  if (!text.trim()) {
    return { ok: false, error: { kind: 'bad_output', message: "Couldn't read any text from this worksheet." } };
  }
  return { ok: true, value: { text } };
}

function chatBody(model: string, text: string, feedback?: string): Record<string, unknown> {
  return {
    model,
    temperature: 0.2,
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'game_payload', schema: mistralSchema(), strict: true },
    },
    messages: [
      { role: 'system', content: buildPrompt(feedback) },
      { role: 'user', content: 'WORKSHEET TEXT:\n' + text },
    ],
  };
}

async function callChat(
  model: string,
  text: string,
  key: string,
  signal: AbortSignal | undefined,
  feedback?: string,
): Promise<Result<unknown>> {
  return postJson(
    CHAT_URL,
    { Authorization: `Bearer ${key}` },
    chatBody(model, text, feedback),
    { signal, timeoutMs: 90000, provider: 'Mistral' },
  );
}

function canRecoverWithFallback(error: { kind: string; status?: number }): boolean {
  if (error.status === 400 || error.status === 404) return true;
  if (error.status !== undefined && error.status >= 500) return true;
  return error.kind === 'network' && error.status === undefined;
}

// Reasoning models (e.g. zai-glm-5-3) return content as an array of chunks:
// { type: 'thinking', thinking: [...] } then { type: 'text', text }. Keep only the text chunks.
function messageText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((chunk: { type?: unknown; text?: unknown } | null) =>
      chunk?.type === 'text' && typeof chunk.text === 'string' ? chunk.text : '',
    )
    .join('');
}

async function structure(ctx: Context, key: string, signal?: AbortSignal, feedback?: string): Promise<Result<string>> {
  if (!ctx.text) {
    return { ok: false, error: { kind: 'bad_output', message: 'No worksheet text available to structure.' } };
  }
  const fallbackModel = PROVIDERS.mistral.fallbackModel;
  let response = await callChat(PROVIDERS.mistral.model, ctx.text, key, signal, feedback);
  let usedFallback = false;
  if (!response.ok && fallbackModel !== undefined && canRecoverWithFallback(response.error)) {
    response = await callChat(fallbackModel, ctx.text, key, signal, feedback);
    usedFallback = true;
  }
  if (!response.ok) return response;
  let data = response.value as ChatResponse;
  let content = messageText(data.choices?.[0]?.message?.content);
  if (!content.trim() && fallbackModel !== undefined && !usedFallback) {
    response = await callChat(fallbackModel, ctx.text, key, signal, feedback);
    if (!response.ok) return response;
    data = response.value as ChatResponse;
    content = messageText(data.choices?.[0]?.message?.content);
  }
  if (!content.trim()) {
    return { ok: false, error: { kind: 'bad_output', message: 'Mistral returned an empty response.' } };
  }
  return { ok: true, value: content };
}

export const mistralService: ProviderService = { extract, structure };
