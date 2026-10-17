export interface GameLevel {
  id: number;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options: string[]; // exactly 4
  correctAnswer: string;
  hint: string;
  explanation: string;
}

export interface MatchingPair {
  id: string;
  term: string;
  match: string;
}

export interface GamePayload {
  meta: {
    title: string;
    subject: string;
    targetGrade: string;
    topicSummary: string;
  };
  levels: GameLevel[]; // 6–10
  matchingPairs: MatchingPair[]; // 6–8
}

export type ProviderId = 'mistral' | 'gemini' | 'openai';

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  model: string;
  fallbackModel?: string;
  acceptsPdf: boolean;
  maxFileMB: number;
  keyUrl: string;
}

export interface WorksheetFile {
  name: string;
  mime: string;
  base64: string;
  bytes: number;
}

export type ParseErrorKind =
  | 'auth'
  | 'quota'
  | 'network'
  | 'too_large'
  | 'bad_output'
  | 'unsupported'
  | 'cancelled';

export interface ParseError {
  kind: ParseErrorKind;
  message: string;
  status?: number;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: ParseError };

export type ParseStep = 'reading' | 'building';
