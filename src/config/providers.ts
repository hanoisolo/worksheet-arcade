import type { ProviderConfig, ProviderId } from '../types/game';

export const MISTRAL_OCR_MODEL = 'mistral-ocr-latest';

export const PROVIDER_IDS: ProviderId[] = ['mistral', 'gemini', 'openai'];

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  mistral: {
    id: 'mistral',
    label: 'Mistral (OCR + GLM 5.3)',
    model: 'zai-glm-5-3',
    fallbackModel: 'mistral-large-4',
    acceptsPdf: true,
    maxFileMB: 5,
    keyUrl: 'https://console.mistral.ai/api-keys',
  },
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    model: 'gemini-3.8-flash',
    acceptsPdf: true,
    maxFileMB: 5,
    keyUrl: 'https://aistudio.google.com/apikey',
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    model: 'gpt-6-luna',
    acceptsPdf: true,
    maxFileMB: 5,
    keyUrl: 'https://platform.openai.com/api-keys',
  },
};
