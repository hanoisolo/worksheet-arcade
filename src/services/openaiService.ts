import type { Result, WorksheetFile } from '../types/game';
import { PROVIDERS } from '../config/providers';
import { postJson } from './http';
import { buildPrompt } from './prompt';
import { openaiSchema } from './schema';
import type { Context, ProviderService } from './types';

const CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';

interface ChatCompletion {
  choices?: {
    message?: {
      refusal?: unknown;
      content?: unknown;
    };
  }[];
}

export const openaiService: ProviderService = {
  async extract(file: WorksheetFile): Promise<Result<Context>> {
    return { ok: true, value: { file } };
  },

  async structure(
    ctx: Context,
    key: string,
    signal?: AbortSignal,
    feedback?: string,
  ): Promise<Result<string>> {
    const file = ctx.file;
    if (!file) {
      return {
        ok: false,
        error: { kind: 'bad_output', message: 'No worksheet file in context.' },
      };
    }

    let filePart: Record<string, unknown>;
    if (file.mime.startsWith('image/')) {
      filePart = {
        type: 'image_url',
        image_url: {
          url: `data:${file.mime};base64,${file.base64}`,
          detail: 'high',
        },
      };
    } else if (file.mime === 'application/pdf') {
      filePart = {
        type: 'file',
        file: {
          filename: file.name,
          file_data: `data:application/pdf;base64,${file.base64}`,
        },
      };
    } else {
      return {
        ok: false,
        error: { kind: 'unsupported', message: `Unsupported file type: ${file.mime}.` },
      };
    }

    const content = [{ type: 'text', text: 'Here is the worksheet.' }, filePart];

    const response = await postJson(
      CHAT_COMPLETIONS_URL,
      { Authorization: `Bearer ${key}` },
      {
        model: PROVIDERS.openai.model,
        reasoning_effort: 'low',
        max_completion_tokens: 8000,
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'game_payload', strict: true, schema: openaiSchema() },
        },
        messages: [
          { role: 'system', content: buildPrompt(feedback) },
          { role: 'user', content },
        ],
      },
      { signal, timeoutMs: 120000, provider: 'OpenAI' },
    );

    if (!response.ok) {
      return response;
    }

    const message = (response.value as ChatCompletion).choices?.[0]?.message;
    const refusal = message?.refusal;
    if (typeof refusal === 'string') {
      return { ok: false, error: { kind: 'bad_output', message: refusal } };
    }
    const messageContent = message?.content;
    if (typeof messageContent === 'string' && messageContent.length > 0) {
      return { ok: true, value: messageContent };
    }
    return {
      ok: false,
      error: { kind: 'bad_output', message: 'OpenAI returned an empty message.' },
    };
  },
};
