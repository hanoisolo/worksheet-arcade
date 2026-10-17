export type Sfx = 'flip' | 'match' | 'miss' | 'win' | 'correct' | 'wrong' | 'hit'

type Note = {
  f: number
  at: number
  dur: number
  type: OscillatorType
}

const SOUNDS: Record<Sfx, Note[]> = {
  flip: [{ f: 660, at: 0, dur: 0.06, type: 'sine' }],
  match: [
    { f: 1046.5, at: 0, dur: 0.18, type: 'triangle' },
    { f: 1318.5, at: 0.08, dur: 0.18, type: 'triangle' },
    { f: 1568, at: 0.16, dur: 0.18, type: 'triangle' },
  ],
  correct: [
    { f: 1046.5, at: 0, dur: 0.18, type: 'triangle' },
    { f: 1318.5, at: 0.08, dur: 0.18, type: 'triangle' },
    { f: 1568, at: 0.16, dur: 0.18, type: 'triangle' },
  ],
  miss: [
    { f: 196, at: 0, dur: 0.12, type: 'square' },
    { f: 147, at: 0.12, dur: 0.18, type: 'square' },
  ],
  wrong: [
    { f: 196, at: 0, dur: 0.12, type: 'square' },
    { f: 147, at: 0.12, dur: 0.18, type: 'square' },
  ],
  win: [
    { f: 523.25, at: 0, dur: 0.22, type: 'triangle' },
    { f: 659.25, at: 0.1, dur: 0.22, type: 'triangle' },
    { f: 783.99, at: 0.2, dur: 0.22, type: 'triangle' },
    { f: 1046.5, at: 0.3, dur: 0.22, type: 'triangle' },
    { f: 1318.5, at: 0.42, dur: 0.4, type: 'triangle' },
  ],
  hit: [{ f: 110, at: 0, dur: 0.15, type: 'sawtooth' }],
}

let ctx: AudioContext | null = null
const listeners = new Set<() => void>()

function getCtx(): AudioContext | null {
  if (ctx) return ctx
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  return ctx
}

export function playSfx(name: Sfx): void {
  if (isMuted()) return
  try {
    const c = getCtx()
    if (!c) return
    if (c.state === 'suspended') void c.resume()
    const t0 = c.currentTime
    for (const { f, at, dur, type } of SOUNDS[name]) {
      const osc = c.createOscillator()
      const g = c.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(f, t0 + at)
      g.gain.setValueAtTime(0.0001, t0 + at)
      g.gain.exponentialRampToValueAtTime(0.15, t0 + at + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur)
      osc.connect(g)
      g.connect(c.destination)
      osc.start(t0 + at)
      osc.stop(t0 + at + dur + 0.02)
    }
  } catch {
    // Audio can fail (unsupported browser, blocked autoplay); never throw to callers.
  }
}

export function isMuted(): boolean {
  try {
    return localStorage.getItem('wa.muted') === '1'
  } catch {
    return false
  }
}

export function setMuted(muted: boolean): void {
  try {
    if (muted) localStorage.setItem('wa.muted', '1')
    else localStorage.removeItem('wa.muted')
  } catch {
    // Storage can be unavailable (private mode, disabled); ignore.
  }
  listeners.forEach((cb) => cb())
}

export function subscribeMuted(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function _resetSoundFxForTests(): void {
  ctx = null
  listeners.clear()
}
