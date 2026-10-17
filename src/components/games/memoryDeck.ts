import type { MatchingPair } from '../../types/game'

export interface MemoryCard {
  key: string
  pairId: string
  text: string
  kind: 'term' | 'match'
}

export const MAX_PAIRS = 6

export function normText(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function pickPairs(pairs: MatchingPair[]): MatchingPair[] {
  const used = new Set<string>()
  const kept: MatchingPair[] = []
  for (const pair of pairs) {
    if (kept.length >= MAX_PAIRS) break
    const term = normText(pair.term)
    const match = normText(pair.match)
    if (term === '' || match === '') continue
    if (term === match) continue
    if (used.has(term) || used.has(match)) continue
    kept.push(pair)
    used.add(term)
    used.add(match)
  }
  return kept
}

export function buildDeck(pairs: MatchingPair[], rng: () => number = Math.random): MemoryCard[] {
  const kept = pickPairs(pairs)
  const cards: MemoryCard[] = []
  kept.forEach((pair, i) => {
    const pairId = 'p' + i
    cards.push({ key: pairId + '-t', pairId, text: pair.term.trim(), kind: 'term' })
    cards.push({ key: pairId + '-m', pairId, text: pair.match.trim(), kind: 'match' })
  })
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = cards[i]
    cards[i] = cards[j]
    cards[j] = tmp
  }
  return cards
}

export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
