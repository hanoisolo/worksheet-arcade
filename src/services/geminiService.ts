import { PROVIDERS } from '../config/providers';
import type { Result } from '../types/game';
import { postJson } from './http';
import { buildPrompt } from './prompt';
import { geminiSchema } from './schema';
import type { Context, ProviderService } from './types';

const PROVIDER_LABEL = 'Google Gemini';
const TIMEOUT_MS = 120000;

interface GeminiPart {
  text?: string;
  thought?: boolean;
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
  finishReason?: string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

function badOutput(message: string): Result<string> {
  return { ok: false, error: { kind: 'bad_output', message } };
}

export const geminiService: ProviderService = {
  // Gemini reads the file directly in structure(), so extract is offline.
  async extract(file) {
    return { ok: true, value: { file } satisfies Context };
  },

  async structure(ctx, key, signal, feedback): Promise<Result<string>> {
    const file = ctx.file;
    if (!file) {
      return badOutput("We couldn't read the worksheet file. Please upload it again.");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${PROVIDERS.gemini.model}:generateContent`;
    const body = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: buildPrompt(feedback) },
            { inline_data: { mime_type: file.mime, data: file.base64 } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: geminiSchema(),
        temperature: 0.2,
      },
    };

    const res = await postJson(url, { 'x-goog-api-key': key }, body, {
      signal,
      timeoutMs: TIMEOUT_MS,
      provider: PROVIDER_LABEL,
    });
    if (!res.ok) return res;

    const data = res.value as GeminiResponse;
    const candidate = data.candidates?.[0];
    if (!candidate || candidate.finishReason === 'SAFETY') {
      return badOutput(
        `${PROVIDER_LABEL} couldn't turn this worksheet into games. Try a clearer photo or a different page.`,
      );
    }

    const text = (candidate.content?.parts ?? [])
      .map((part) => (part.thought !== true && typeof part.text === 'string' ? part.text : ''))
      .join('');
    if (!text.trim()) {
      return badOutput(
        `${PROVIDER_LABEL} returned an empty answer. Please try again.`,
      );
    }
    return { ok: true, value: text };
  },
};
