import { CheckCircle2, LayoutGrid, Rocket, Sparkles, Swords, Upload } from 'lucide-react'
import type { GamePayload } from '../types/game'
import type { GameResult } from '../types/results'
import type { GameId } from '../state/appMachine'

export const GAMES: {
  id: GameId
  title: string
  blurb: string
  uses: 'levels' | 'pairs'
}[] = [
  { id: 'space', title: 'Space Blaster', blurb: 'Blast the asteroid with the right answer.', uses: 'levels' },
  { id: 'memory', title: 'Memory Match', blurb: 'Flip cards to match each term with its partner.', uses: 'pairs' },
  { id: 'boss', title: 'Boss Quest', blurb: 'Cast spells with correct answers to beat the boss.', uses: 'levels' },
]

const GAME_ICONS: Record<GameId, typeof Rocket> = {
  space: Rocket,
  memory: LayoutGrid,
  boss: Swords,
}

const GAME_ACCENTS: Record<GameId, { border: string; text: string; chip: string }> = {
  space: { border: 'border-pink/50 hover:border-pink', text: 'text-pink', chip: 'bg-pink/15' },
  memory: { border: 'border-cyan/50 hover:border-cyan', text: 'text-cyan', chip: 'bg-cyan/15' },
  boss: { border: 'border-lime/50 hover:border-lime', text: 'text-lime', chip: 'bg-lime/15' },
}

export default function ReadyScreen({
  payload,
  source,
  results = {},
  onPick,
  onHome,
}: {
  payload: GamePayload
  source: 'ai' | 'demo'
  results?: Partial<Record<GameId, GameResult>>
  onPick: (g: GameId) => void
  onHome: () => void
}) {
  const playedCount = GAMES.filter((g) => results[g.id]).length
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
      <section className="rounded-2xl bg-panel p-5 sm:p-8">
        {source === 'demo' && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Demo
          </span>
        )}
        <h2 className="mt-3 text-2xl font-extrabold text-ink sm:text-3xl">{payload.meta.title}</h2>
        <p className="mt-1 text-sm font-semibold text-ink/85">
          {payload.meta.subject} · {payload.meta.targetGrade}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink/85">{payload.meta.topicSummary}</p>
        <p className="mt-4 text-xs font-bold uppercase tracking-wider text-cyan">
          {payload.levels.length} questions · {payload.matchingPairs.length} matching pairs
        </p>
      </section>

      <div className="mt-8 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-extrabold text-ink">{playedCount > 0 ? 'Pick another game' : 'Pick a game'}</h3>
        {playedCount > 0 && <p className="text-sm font-bold text-lime">Played {playedCount} of {GAMES.length}</p>}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
        {GAMES.map((game) => {
          const Icon = GAME_ICONS[game.id]
          const accent = GAME_ACCENTS[game.id]
          const count =
            game.uses === 'levels'
              ? `${payload.levels.length} questions`
              : `${payload.matchingPairs.length} pairs`
          const result = results[game.id]
          return (
            <button
              key={game.id}
              type="button"
              onClick={() => onPick(game.id)}
              className={`flex min-h-11 flex-col items-start gap-2 rounded-2xl border-2 bg-panel p-5 text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan ${accent.border}`}
            >
              <span className={`inline-flex size-12 items-center justify-center rounded-2xl ${accent.chip}`}>
                <Icon className={`size-6 ${accent.text}`} aria-hidden="true" />
              </span>
              <span className="text-lg font-extrabold text-ink">{game.title}</span>
              <span className="text-sm leading-snug text-ink/85">{game.blurb}</span>
              <span className={`mt-auto pt-2 text-xs font-bold uppercase tracking-wider ${accent.text}`}>
                {count}
              </span>
              {result && (
                <span className="inline-flex items-center gap-1 rounded-full bg-lime/15 px-2.5 py-1 text-xs font-bold text-lime">
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  Played · {result.summary}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-8">
        <button
          type="button"
          onClick={onHome}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border-2 border-cyan/50 px-6 text-sm font-bold text-ink transition hover:border-cyan focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan"
        >
          <Upload className="size-4" aria-hidden="true" />
          New worksheet
        </button>
        <p className="mt-2 text-xs text-ink/70">Upload a different worksheet to make new games.</p>
      </div>
    </div>
  )
}
