import { describe, expect, it } from 'vitest';
import { buildDeck, formatTime, MAX_PAIRS, pickPairs } from './memoryDeck';
import type { MemoryCard } from './memoryDeck';

interface PairInput {
  id: string;
  term: string;
  match: string;
}

const distinctPairs = (count: number): PairInput[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `pair-${index}`,
    term: `term ${index}`,
    match: `match ${index}`,
  }));

const unshuffledKeys = (pairCount: number): string[] => {
  const keys: string[] = [];
  for (let index = 0; index < pairCount; index += 1) {
    keys.push(`p${index}-t`, `p${index}-m`);
  }
  return keys;
};

describe('memoryDeck', () => {
  it('builds 12 cards from 6 distinct pairs with unique keys and complete pairs', () => {
    const deck: MemoryCard[] = buildDeck(distinctPairs(6));

    expect(deck).toHaveLength(12);

    const keys = deck.map((card) => card.key);
    expect(new Set(keys).size).toBe(12);

    const termPairIds = deck.filter((card) => card.kind === 'term').map((card) => card.pairId);
    const matchPairIds = deck.filter((card) => card.kind === 'match').map((card) => card.pairId);

    expect([...termPairIds].sort()).toEqual(['p0', 'p1', 'p2', 'p3', 'p4', 'p5']);
    expect([...matchPairIds].sort()).toEqual(['p0', 'p1', 'p2', 'p3', 'p4', 'p5']);
  });

  it('pickPairs skips pairs whose normalized match text was already used', () => {
    const input: PairInput[] = [
      { id: 'a', term: '1/2', match: '0.5' },
      { id: 'b', term: '2/4', match: ' 0.5 ' },
      { id: 'c', term: '3/4', match: '75%' },
    ];

    expect(pickPairs(input).map((pair) => pair.id)).toEqual(['a', 'c']);
  });

  it('pickPairs drops pairs with reused text, term equal to match, or empty text', () => {
    const input: PairInput[] = [
      { id: 'kept', term: '1/2', match: '0.5' },
      { id: 'reused', term: '0.5', match: 'half' },
      { id: 'self-equal', term: 'Same', match: 'same' },
      { id: 'empty-term', term: '   ', match: 'left' },
      { id: 'empty-match', term: 'right', match: '' },
    ];

    expect(pickPairs(input).map((pair) => pair.id)).toEqual(['kept']);
  });

  it('keeps at most MAX_PAIRS pairs', () => {
    expect(pickPairs(distinctPairs(8))).toHaveLength(MAX_PAIRS);
    expect(buildDeck(distinctPairs(8))).toHaveLength(12);
  });

  it('builds unique keys even when input ids repeat', () => {
    const input: PairInput[] = [
      { id: 'x', term: 'alpha', match: 'a' },
      { id: 'x', term: 'beta', match: 'b' },
    ];

    const keys = buildDeck(input).map((card) => card.key);
    expect(keys).toHaveLength(4);
    expect(new Set(keys).size).toBe(4);
  });

  it('shuffles deterministically for a fixed rng and away from the unshuffled order', () => {
    const pairs = distinctPairs(6);

    const first = buildDeck(pairs, () => 0).map((card) => card.key);
    const second = buildDeck(pairs, () => 0).map((card) => card.key);

    expect(first).toEqual(second);
    expect(first).not.toEqual(unshuffledKeys(6));
  });

  it('formats seconds as m:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(9)).toBe('0:09');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(600)).toBe('10:00');
  });
});
