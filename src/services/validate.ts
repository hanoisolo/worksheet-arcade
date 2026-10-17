import type { GameLevel, GamePayload, MatchingPair, Result } from '../types/game';

export type NormalizeResult = Result<GamePayload> & { warnings?: string[] };

const MIN_LEVELS = 6;
const MAX_LEVELS = 10;
const MIN_PAIRS = 6;
const MAX_PAIRS = 8;
const MAX_STRING_LENGTH = 300;

export function cleanLatex(s: string): string {
  let out = s;
  for (let i = 0; i < 5; i += 1) {
    if (!out.includes('\\frac')) break;
    out = out.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '$1/$2');
  }
  out = out.replace(/\\sqrt\s*\{([^{}]*)\}/g, '√$1');
  out = out.replace(/\^2/g, '²');
  out = out.replace(/\^3/g, '³');
  out = out.replace(/\\times\b/g, '×');
  out = out.replace(/\\div\b/g, '÷');
  out = out.replace(/\$/g, '');
  return out;
}

function extractJsonText(text: string): string {
  const withoutFences = text.replace(/```[a-zA-Z0-9]*\s*/g, '');
  const start = withoutFences.indexOf('{');
  const end = withoutFences.lastIndexOf('}');
  if (start === -1 || end <= start) return withoutFences.trim();
  return withoutFences.slice(start, end + 1);
}

function toText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return String(value);
  return '';
}

function toDifficulty(value: unknown): GameLevel['difficulty'] {
  const normalized = toText(value).trim().toLowerCase();
  return normalized === 'easy' || normalized === 'hard' ? normalized : 'medium';
}

function capLength(s: string): string {
  return s.length > MAX_STRING_LENGTH ? s.slice(0, MAX_STRING_LENGTH) : s;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = items.slice();
  const random = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const swap = out[i];
    out[i] = out[j];
    out[j] = swap;
  }
  return out;
}

function badOutput(message: string, warnings: string[]): NormalizeResult {
  const error = { kind: 'bad_output' as const, message };
  return warnings.length > 0 ? { ok: false, error, warnings } : { ok: false, error };
}

function repairLevel(rawLevel: unknown, index: number, warnings: string[]): GameLevel | null {
  if (typeof rawLevel !== 'object' || rawLevel === null || Array.isArray(rawLevel)) {
    warnings.push(`Dropped level ${index + 1}: not an object.`);
    return null;
  }
  const level = rawLevel as Record<string, unknown>;
  const question = cleanLatex(toText(level.question).trim());
  const correctAnswer = cleanLatex(toText(level.correctAnswer).trim());
  const hint = cleanLatex(toText(level.hint).trim());
  const explanation = cleanLatex(toText(level.explanation).trim());
  if (!question || !correctAnswer) {
    warnings.push(`Dropped level ${index + 1}: missing question or correct answer.`);
    return null;
  }

  const seen = new Set<string>();
  let options = (Array.isArray(level.options) ? level.options : [])
    .map((option) => cleanLatex(toText(option).trim()))
    .filter((option) => option.length > 0)
    .filter((option) => {
      const key = option.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  let correct = correctAnswer;
  const matching = options.find((option) => option.toLowerCase() === correctAnswer.toLowerCase());
  if (matching) {
    if (matching !== correctAnswer) {
      correct = matching;
      warnings.push(
        `Level ${index + 1}: matched the correct answer to an option with different capitalization.`,
      );
    }
  } else if (options.length >= 3) {
    options[options.length - 1] = correctAnswer;
    warnings.push(
      `Level ${index + 1}: the correct answer was missing from the options, so the last option was replaced.`,
    );
  }

  if (options.length < 4) {
    warnings.push(`Dropped level ${index + 1}: fewer than 4 options.`);
    return null;
  }
  if (options.length > 4) {
    const others = options.filter((option) => option !== correct).slice(0, 3);
    options = [correct, ...others];
    warnings.push(`Level ${index + 1}: kept the correct answer and the first 3 other options.`);
  }

  return {
    id: 0,
    difficulty: toDifficulty(level.difficulty),
    question,
    options,
    correctAnswer: correct,
    hint,
    explanation,
  };
}

export function normalizePayload(raw: unknown): NormalizeResult {
  const warnings: string[] = [];

  let data: unknown = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(extractJsonText(raw));
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return badOutput(`The AI response was not valid JSON: ${detail}`, warnings);
    }
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return badOutput('The AI response was not a JSON object.', warnings);
  }
  const root = data as Record<string, unknown>;

  const rawMeta =
    typeof root.meta === 'object' && root.meta !== null && !Array.isArray(root.meta)
      ? (root.meta as Record<string, unknown>)
      : {};
  const meta = {
    title: cleanLatex(toText(rawMeta.title).trim()) || 'Worksheet',
    subject: cleanLatex(toText(rawMeta.subject).trim()) || 'General',
    targetGrade: cleanLatex(toText(rawMeta.targetGrade).trim()) || 'Grade 7',
    topicSummary: cleanLatex(toText(rawMeta.topicSummary).trim()),
  };

  const levels: GameLevel[] = [];
  const rawLevels = Array.isArray(root.levels) ? root.levels : [];
  rawLevels.forEach((rawLevel, index) => {
    const repaired = repairLevel(rawLevel, index, warnings);
    if (repaired) levels.push(repaired);
  });

  const pairs: MatchingPair[] = [];
  const rawPairs = Array.isArray(root.matchingPairs) ? root.matchingPairs : [];
  const seenTerms = new Set<string>();
  rawPairs.forEach((rawPair, index) => {
    if (typeof rawPair !== 'object' || rawPair === null || Array.isArray(rawPair)) {
      warnings.push(`Dropped pair ${index + 1}: not an object.`);
      return;
    }
    const pair = rawPair as Record<string, unknown>;
    const term = cleanLatex(toText(pair.term).trim());
    const match = cleanLatex(toText(pair.match).trim());
    if (!term || !match) {
      warnings.push(`Dropped pair ${index + 1}: missing term or match.`);
      return;
    }
    const key = term.toLowerCase();
    if (seenTerms.has(key)) {
      warnings.push(`Dropped pair ${index + 1}: duplicate term "${term}".`);
      return;
    }
    seenTerms.add(key);
    pairs.push({ id: '', term, match });
  });

  if (levels.length > MAX_LEVELS) {
    warnings.push(`Kept the first ${MAX_LEVELS} levels (received ${levels.length}).`);
    levels.length = MAX_LEVELS;
  }
  if (pairs.length > MAX_PAIRS) {
    warnings.push(`Kept the first ${MAX_PAIRS} matching pairs (received ${pairs.length}).`);
    pairs.length = MAX_PAIRS;
  }

  levels.forEach((level, index) => {
    level.id = index + 1;
    level.options = seededShuffle(level.options, level.id);
  });
  pairs.forEach((pair, index) => {
    pair.id = `p${index + 1}`;
  });

  const problems: string[] = [];
  if (levels.length < MIN_LEVELS) {
    problems.push(`only ${levels.length} quiz levels (need at least ${MIN_LEVELS})`);
  }
  if (pairs.length < MIN_PAIRS) {
    problems.push(`only ${pairs.length} matching pairs (need at least ${MIN_PAIRS})`);
  }
  if (problems.length > 0) {
    return badOutput(`Not enough usable content: ${problems.join('; ')}.`, warnings);
  }

  const value: GamePayload = {
    meta: {
      title: capLength(meta.title),
      subject: capLength(meta.subject),
      targetGrade: capLength(meta.targetGrade),
      topicSummary: capLength(meta.topicSummary),
    },
    levels: levels.map((level) => ({
      id: level.id,
      difficulty: level.difficulty,
      question: capLength(level.question),
      options: level.options.map(capLength),
      correctAnswer: capLength(level.correctAnswer),
      hint: capLength(level.hint),
      explanation: capLength(level.explanation),
    })),
    matchingPairs: pairs.map((pair) => ({
      id: pair.id,
      term: capLength(pair.term),
      match: capLength(pair.match),
    })),
  };

  return warnings.length > 0 ? { ok: true, value, warnings } : { ok: true, value };
}
