import { describe, expect, it } from 'vitest';
import type { GamePayload } from '../types/game';
import { cleanLatex, normalizePayload } from './validate';
import {
  correctMissing,
  fencedWithProse,
  garbage,
  latex,
  tooFewLevels,
  valid,
  wrongOptionCounts,
} from './__fixtures__/payloads';

function collectStrings(payload: GamePayload): string[] {
  return [
    payload.meta.title,
    payload.meta.subject,
    payload.meta.targetGrade,
    payload.meta.topicSummary,
    ...payload.levels.flatMap((level) => [
      level.question,
      level.correctAnswer,
      level.hint,
      level.explanation,
      ...level.options,
    ]),
    ...payload.matchingPairs.flatMap((pair) => [pair.term, pair.match]),
  ];
}

function expectWellFormed(payload: GamePayload): void {
  expect(payload.levels.length).toBeGreaterThanOrEqual(6);
  expect(payload.levels.length).toBeLessThanOrEqual(10);
  expect(payload.matchingPairs.length).toBeGreaterThanOrEqual(6);
  expect(payload.matchingPairs.length).toBeLessThanOrEqual(8);
  payload.levels.forEach((level, index) => {
    expect(level.id).toBe(index + 1);
    expect(level.options).toHaveLength(4);
    expect(new Set(level.options.map((option) => option.toLowerCase())).size).toBe(4);
    expect(level.options).toContain(level.correctAnswer);
    expect(level.question.length).toBeGreaterThan(0);
  });
  payload.matchingPairs.forEach((pair, index) => {
    expect(pair.id).toBe(`p${index + 1}`);
    expect(pair.term.length).toBeGreaterThan(0);
    expect(pair.match.length).toBeGreaterThan(0);
  });
  collectStrings(payload).forEach((s) => expect(s.length).toBeLessThanOrEqual(300));
}

describe('cleanLatex', () => {
  it('converts LaTeX to plain text', () => {
    expect(cleanLatex('\\frac{3}{4}')).toBe('3/4');
    expect(cleanLatex('x^2 + y^3')).toBe('x² + y³');
    expect(cleanLatex('\\sqrt{9}')).toBe('√9');
    expect(cleanLatex('2 \\times 3 \\div 4')).toBe('2 × 3 ÷ 4');
    expect(cleanLatex('$5$')).toBe('5');
    expect(cleanLatex('$\\frac{1}{2}$ of $x^2$')).toBe('1/2 of x²');
  });
});

describe('normalizePayload', () => {
  it('normalizes the valid fixture', () => {
    const result = normalizePayload(valid);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.levels).toHaveLength(8);
    expect(result.value.matchingPairs).toHaveLength(6);
    expect(result.value.meta.title).toBe('Fraction Fun');
    expectWellFormed(result.value);
  });

  it('caps every string at 300 characters', () => {
    const result = normalizePayload(valid);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.levels[7].hint).toHaveLength(300);
    collectStrings(result.value).forEach((s) => expect(s.length).toBeLessThanOrEqual(300));
  });

  it('extracts JSON from a fenced response with prose', () => {
    const direct = normalizePayload(valid);
    const fenced = normalizePayload(fencedWithProse);
    if (!direct.ok || !fenced.ok) throw new Error('expected ok');
    expect(fenced.value).toEqual(direct.value);
  });

  it('cleans LaTeX notation from the latex fixture', () => {
    const result = normalizePayload(latex);
    if (!result.ok) throw new Error(result.error.message);
    expectWellFormed(result.value);
    const text = collectStrings(result.value).join(' ');
    expect(text).toContain('3/4');
    expect(text).toContain('x²');
    expect(text).toContain('√9');
    expect(text).toContain('×');
    expect(text).toContain('÷');
    expect(text).not.toContain('$');
    expect(text).not.toContain('\\frac');
    expect(text).not.toContain('\\sqrt');
    expect(text).not.toContain('\\times');
    expect(text).not.toContain('\\div');
  });

  it('drops levels with 3 options and trims levels with 6 options', () => {
    const result = normalizePayload(wrongOptionCounts);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.levels).toHaveLength(6);
    expectWellFormed(result.value);
    expect(result.warnings === undefined ? 0 : result.warnings.length).toBeGreaterThan(0);
  });

  it('repairs missing and case-mismatched correct answers', () => {
    const result = normalizePayload(correctMissing);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.levels).toHaveLength(7);
    expectWellFormed(result.value);
    const caseLevel = result.value.levels.find(
      (level) => level.question === 'Which process do plants use to make food?',
    );
    expect(caseLevel?.correctAnswer).toBe('photosynthesis');
    expect(caseLevel?.options).toContain('photosynthesis');
  });

  it('returns bad_output for too few levels', () => {
    const result = normalizePayload(tooFewLevels);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected bad_output');
    expect(result.error.kind).toBe('bad_output');
    expect(result.error.message).toContain('4');
    expect(result.error.message).toContain('level');
  });

  it('returns bad_output for garbage input', () => {
    const result = normalizePayload(garbage);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected bad_output');
    expect(result.error.kind).toBe('bad_output');
    expect(result.error.message).toContain('JSON');
  });

  it('clamps to 10 levels and 8 pairs', () => {
    const levels = [];
    for (let i = 1; i <= 12; i += 1) {
      levels.push({
        id: i,
        difficulty: 'medium',
        question: `Question number ${i}?`,
        options: [`Correct ${i}`, `Wrong ${i}a`, `Wrong ${i}b`, `Wrong ${i}c`],
        correctAnswer: `Correct ${i}`,
        hint: `Hint ${i}`,
        explanation: `Explanation ${i}`,
      });
    }
    const matchingPairs = [];
    for (let i = 1; i <= 9; i += 1) {
      matchingPairs.push({ id: `p${i}`, term: `Term ${i}`, match: `Match ${i}` });
    }
    const result = normalizePayload({
      meta: { title: 'Big', subject: 'Math', targetGrade: 'Grade 7', topicSummary: '' },
      levels,
      matchingPairs,
    });
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.levels).toHaveLength(10);
    expect(result.value.matchingPairs).toHaveLength(8);
    expectWellFormed(result.value);
  });

  it('shuffles options deterministically and moves the correct answer around', () => {
    const first = normalizePayload(valid);
    const second = normalizePayload(valid);
    if (!first.ok || !second.ok) throw new Error('expected ok');
    expect(second.value.levels.map((level) => level.options)).toEqual(
      first.value.levels.map((level) => level.options),
    );
    const positions = first.value.levels.map((level) => level.options.indexOf(level.correctAnswer));
    expect(positions.every((position) => position === 0)).toBe(false);
    expect(new Set(positions).size).toBeGreaterThan(1);
  });
});
