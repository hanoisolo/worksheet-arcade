import { useEffect, useRef, useState } from 'react'
import type { GamePayload } from '../../types/game'
import { buildDeck, formatTime, type MemoryCard } from './memoryDeck'
import { playSfx } from '../../utils/soundFx'
import Confetti from '../Confetti'
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react'

export const FLIP_BACK_MS = 900

export default function MemoryMatch({ payload, onBack }: { payload: GamePayload; onBack: () => void }) {
  const [deck, setDeck] = useState<MemoryCard[]>(() => buildDeck(payload.matchingPairs))
  const [faceUp, setFaceUp] = useState<number[]>([])
  const [matched, setMatched] = useState<string[]>([])
  const [moves, setMoves] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [started, setStarted] = useState(false)
  const [locked, setLocked] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const flipTimer = useRef<number | undefined>(undefined)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const doneRef = useRef<HTMLHeadingElement>(null)

  const totalPairs = deck.length / 2
  const done = totalPairs > 0 && matched.length === totalPairs

  useEffect(() => {
    if (!started || done) return
    const id = window.setInterval(() => setSeconds(s => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [started, done])

  useEffect(() => {
    if (!done) return
    playSfx('win')
    doneRef.current?.focus()
  }, [done])

  useEffect(() => {
    headingRef.current?.focus()
  }, [deck])

  useEffect(() => {
    return () => {
      window.clearTimeout(flipTimer.current)
    }
  }, [])

  function flip(i: number) {
    if (locked || done || faceUp.includes(i) || matched.includes(deck[i].pairId)) return
    if (!started) setStarted(true)
    if (faceUp.length === 0) {
      setFaceUp([i])
      playSfx('flip')
      return
    }
    const a = deck[faceUp[0]]
    const b = deck[i]
    setMoves(m => m + 1)
    if (a.pairId === b.pairId) {
      setMatched(m => [...m, a.pairId])
      setFaceUp([])
      playSfx('match')
      const term = a.kind === 'term' ? a : b
      const other = a.kind === 'term' ? b : a
      setAnnouncement('Match! ' + term.text + ' goes with ' + other.text)
    } else {
      setFaceUp([faceUp[0], i])
      setLocked(true)
      playSfx('miss')
      setAnnouncement('Not a match. ' + a.text + ' and ' + b.text)
      flipTimer.current = window.setTimeout(() => {
        setFaceUp([])
        setLocked(false)
      }, FLIP_BACK_MS)
    }
  }

  function restart() {
    window.clearTimeout(flipTimer.current)
    setDeck(buildDeck(payload.matchingPairs))
    setFaceUp([])
    setMatched([])
    setMoves(0)
    setSeconds(0)
    setStarted(false)
    setLocked(false)
    setAnnouncement('')
  }

  const backButton = (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border-2 border-cyan/50 px-6 text-sm font-bold text-ink transition hover:border-cyan focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Back to games
    </button>
  )

  return (
    <div className="mx-auto w-full max-w-3xl px-2 sm:px-4">
      {totalPairs < 2 ? (
        <section className="rounded-2xl bg-panel p-6 text-center">
          <h2 className="text-2xl font-extrabold text-ink">Memory Match</h2>
          <p className="mt-2 text-ink/90">
            This worksheet doesn&apos;t have enough matching pairs for Memory Match.
          </p>
          <div className="mt-6 flex justify-center">{backButton}</div>
        </section>
      ) : done ? (
        <section className="relative rounded-2xl bg-panel p-6 text-center sm:p-10">
          <Confetti />
          <Trophy className="mx-auto size-14 text-amber" aria-hidden="true" />
          <h2 ref={doneRef} tabIndex={-1} className="mt-4 text-3xl font-extrabold text-ink outline-none">
            You matched them all!
          </h2>
          <p className="mt-2 text-lg text-ink/90">
            {moves} moves · {formatTime(seconds)}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={restart}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-pink px-6 text-sm font-extrabold text-bg transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Play again
            </button>
            {backButton}
          </div>
        </section>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-extrabold text-ink outline-none">
              Memory Match
            </h2>
            <div className="flex gap-2 text-sm font-bold">
              <span className="rounded-full bg-panel px-3 py-1.5">Moves: {moves}</span>
              <span className="rounded-full bg-panel px-3 py-1.5">Time: {formatTime(seconds)}</span>
              <span className="rounded-full bg-panel px-3 py-1.5">
                Pairs: {matched.length}/{totalPairs}
              </span>
            </div>
          </div>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
            {deck.map((card, i) => {
              const state = matched.includes(card.pairId) ? 'matched' : faceUp.includes(i) ? 'up' : 'down'
              const label =
                state === 'down'
                  ? 'Card ' + (i + 1) + ', face down'
                  : state === 'up'
                    ? 'Card ' + (i + 1) + ': ' + card.text
                    : 'Card ' + (i + 1) + ': ' + card.text + ', matched'
              return (
                <li key={card.key}>
                  <button
                    type="button"
                    data-state={state}
                    data-pair={card.pairId}
                    data-testid="memory-card"
                    aria-label={label}
                    aria-disabled={state === 'matched' || undefined}
                    onClick={() => flip(i)}
                    className={
                      'flex min-h-24 w-full items-center justify-center rounded-2xl border-2 p-2 text-center text-sm font-bold break-words transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan sm:min-h-28 sm:text-base ' +
                      (state === 'down'
                        ? 'border-pink/50 bg-gradient-to-br from-pink/30 to-cyan/20 text-ink hover:scale-[1.03]'
                        : state === 'up'
                          ? 'border-cyan bg-cyan/15 text-ink'
                          : 'border-lime bg-lime/20 text-lime')
                    }
                  >
                    {state === 'down' ? (
                      <span aria-hidden="true" className="text-3xl font-extrabold text-ink/80">
                        ?
                      </span>
                    ) : (
                      <span>{card.text}</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
          <p aria-live="polite" className="sr-only">
            {announcement}
          </p>
          <div className="mt-6 flex justify-center">{backButton}</div>
        </>
      )}
    </div>
  )
}
