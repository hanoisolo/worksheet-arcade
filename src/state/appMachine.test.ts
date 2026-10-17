import { beforeEach, describe, expect, it } from 'vitest'
import type { GamePayload, ParseError, WorksheetFile } from '../types/game'
import {
  appReducer,
  clearPayload,
  initialState,
  loadPayload,
  savePayload,
  type AppState,
} from './appMachine'

const backing = new Map<string, string>()

Object.defineProperty(globalThis, 'sessionStorage', {
  value: {
    getItem: (key: string): string | null => backing.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      backing.set(key, value)
    },
    removeItem: (key: string): void => {
      backing.delete(key)
    },
  },
  writable: true,
  configurable: true,
})

beforeEach(() => {
  backing.clear()
})

const file: WorksheetFile = {
  name: 'worksheet.pdf',
  mime: 'application/pdf',
  base64: 'Zm9v',
  bytes: 3,
}

const otherFile: WorksheetFile = {
  name: 'math.png',
  mime: 'image/png',
  base64: 'YmFy',
  bytes: 3,
}

const payload: GamePayload = JSON.parse(`{
  "meta": {
    "title": "Fraction Frenzy",
    "subject": "Math",
    "targetGrade": "3",
    "topicSummary": "Recognizing and comparing simple fractions"
  },
  "levels": [
    {
      "id": "level-1",
      "difficulty": 1,
      "question": "Which fraction equals one half?",
      "options": ["1/2", "1/3", "2/3", "1/4"],
      "correctAnswer": "1/2",
      "hint": "A half is one of two equal parts.",
      "explanation": "One half means one of two equal parts of a whole."
    }
  ],
  "matchingPairs": [{ "id": "pair-1", "term": "numerator", "match": "top number" }]
}`)

const parseError: ParseError = { kind: 'network', message: 'Request failed' }

const setupState = (selected: WorksheetFile | null): AppState => ({
  phase: 'setup',
  file: selected,
})

const parsingState: AppState = { phase: 'parsing', file, step: 'reading' }

const readyAiState: AppState = { phase: 'ready', payload, source: 'ai', file }

const readyDemoState: AppState = { phase: 'ready', payload, source: 'demo', file: null }

const playingState: AppState = { phase: 'playing', payload, source: 'ai', game: 'memory', file }

const playingDemoState: AppState = {
  phase: 'playing',
  payload,
  source: 'demo',
  game: 'space',
  file: null,
}

const errorState: AppState = { phase: 'error', error: parseError, file }

const everyPhase: AppState[] = [
  setupState(null),
  parsingState,
  readyAiState,
  playingState,
  errorState,
]

describe('initialState', () => {
  it('starts in setup with no file when nothing is cached', () => {
    expect(initialState()).toEqual({ phase: 'setup', file: null })
  })

  it('restores a cached payload as ready with source ai', () => {
    savePayload(payload)
    expect(initialState()).toEqual({ phase: 'ready', payload, source: 'ai', file: null })
  })

  it('falls back to setup when the cached value is not valid JSON', () => {
    sessionStorage.setItem('wa.payload', '{not json')
    expect(initialState()).toEqual({ phase: 'setup', file: null })
  })
})

describe('appReducer', () => {
  it('FILE_SELECTED from setup stores the file', () => {
    expect(appReducer(setupState(null), { type: 'FILE_SELECTED', file })).toEqual({
      phase: 'setup',
      file,
    })
  })

  it('FILE_SELECTED from error returns to setup with the new file', () => {
    expect(appReducer(errorState, { type: 'FILE_SELECTED', file: otherFile })).toEqual({
      phase: 'setup',
      file: otherFile,
    })
  })

  it('FILE_SELECTED from parsing, ready, or playing is invalid', () => {
    for (const state of [parsingState, readyAiState, playingState]) {
      expect(appReducer(state, { type: 'FILE_SELECTED', file })).toBe(state)
    }
  })

  it('FILE_CLEARED from setup drops the file', () => {
    expect(appReducer(setupState(file), { type: 'FILE_CLEARED' })).toEqual({
      phase: 'setup',
      file: null,
    })
  })

  it('FILE_CLEARED outside setup is invalid', () => {
    for (const state of [parsingState, readyAiState, playingState, errorState]) {
      expect(appReducer(state, { type: 'FILE_CLEARED' })).toBe(state)
    }
  })

  it('START_PARSE from setup with a file enters parsing at reading', () => {
    expect(appReducer(setupState(file), { type: 'START_PARSE' })).toEqual({
      phase: 'parsing',
      file,
      step: 'reading',
    })
  })

  it('START_PARSE without a file is invalid', () => {
    const state = setupState(null)
    expect(appReducer(state, { type: 'START_PARSE' })).toBe(state)
  })

  it('START_PARSE from error with a file re-enters parsing at reading', () => {
    expect(appReducer(errorState, { type: 'START_PARSE' })).toEqual({
      phase: 'parsing',
      file,
      step: 'reading',
    })
  })

  it('START_PARSE from error without a file is invalid', () => {
    const state: AppState = { phase: 'error', error: parseError, file: null }
    expect(appReducer(state, { type: 'START_PARSE' })).toBe(state)
  })

  it('START_PARSE outside setup and error is invalid', () => {
    for (const state of [parsingState, readyAiState, playingState]) {
      expect(appReducer(state, { type: 'START_PARSE' })).toBe(state)
    }
  })

  it('CANCEL_PARSE from parsing returns to setup and keeps the file', () => {
    expect(appReducer(parsingState, { type: 'CANCEL_PARSE' })).toEqual({
      phase: 'setup',
      file,
    })
  })

  it('CANCEL_PARSE outside parsing is invalid', () => {
    for (const state of [setupState(file), readyAiState, playingState, errorState]) {
      expect(appReducer(state, { type: 'CANCEL_PARSE' })).toBe(state)
    }
  })

  it('PROGRESS updates the step while parsing', () => {
    expect(appReducer(parsingState, { type: 'PROGRESS', step: 'building' })).toEqual({
      phase: 'parsing',
      file,
      step: 'building',
    })
  })

  it('PROGRESS outside parsing is invalid', () => {
    for (const state of [setupState(file), readyAiState, playingState, errorState]) {
      expect(appReducer(state, { type: 'PROGRESS', step: 'building' })).toBe(state)
    }
  })

  it('PARSE_OK moves parsing to ready with source ai and keeps the file', () => {
    expect(appReducer(parsingState, { type: 'PARSE_OK', payload })).toEqual({
      phase: 'ready',
      payload,
      source: 'ai',
      file,
    })
  })

  it('PARSE_OK caches the payload', () => {
    appReducer(parsingState, { type: 'PARSE_OK', payload })
    expect(loadPayload()).toEqual(payload)
  })

  it('PARSE_OK outside parsing is invalid and does not cache', () => {
    expect(appReducer(readyAiState, { type: 'PARSE_OK', payload })).toBe(readyAiState)
    expect(loadPayload()).toBeNull()
  })

  it('PARSE_FAIL moves parsing to error and keeps the file', () => {
    expect(appReducer(parsingState, { type: 'PARSE_FAIL', error: parseError })).toEqual({
      phase: 'error',
      error: parseError,
      file,
    })
  })

  it('PARSE_FAIL outside parsing is invalid', () => {
    for (const state of [setupState(file), readyAiState, playingState, errorState]) {
      expect(appReducer(state, { type: 'PARSE_FAIL', error: parseError })).toBe(state)
    }
  })

  it('USE_DEMO lands in ready with source demo from any phase', () => {
    for (const state of everyPhase) {
      expect(appReducer(state, { type: 'USE_DEMO', payload })).toEqual({
        phase: 'ready',
        payload,
        source: 'demo',
        file: null,
      })
    }
  })

  it('USE_DEMO does not cache the payload', () => {
    appReducer(playingState, { type: 'USE_DEMO', payload })
    expect(loadPayload()).toBeNull()
  })

  it('PICK_GAME from ready starts playing', () => {
    expect(appReducer(readyAiState, { type: 'PICK_GAME', game: 'space' })).toEqual({
      phase: 'playing',
      payload,
      source: 'ai',
      game: 'space',
      file,
    })
  })

  it('PICK_GAME outside ready is invalid', () => {
    for (const state of [setupState(file), parsingState, playingDemoState, errorState]) {
      expect(appReducer(state, { type: 'PICK_GAME', game: 'boss' })).toBe(state)
    }
  })

  it('BACK_TO_PICKER from playing returns to the previous ready state', () => {
    expect(appReducer(playingState, { type: 'BACK_TO_PICKER' })).toEqual(readyAiState)
    expect(appReducer(playingDemoState, { type: 'BACK_TO_PICKER' })).toEqual(readyDemoState)
  })

  it('BACK_TO_PICKER outside playing is invalid', () => {
    for (const state of [setupState(file), parsingState, readyAiState, errorState]) {
      expect(appReducer(state, { type: 'BACK_TO_PICKER' })).toBe(state)
    }
  })

  it('RESET returns to setup with no file from any phase', () => {
    for (const state of everyPhase) {
      expect(appReducer(state, { type: 'RESET' })).toEqual({ phase: 'setup', file: null })
    }
  })

  it('RESET clears the cached payload', () => {
    savePayload(payload)
    expect(appReducer(playingState, { type: 'RESET' })).toEqual({ phase: 'setup', file: null })
    expect(loadPayload()).toBeNull()
  })
})

describe('payload cache helpers', () => {
  it('loadPayload returns null when nothing is cached', () => {
    expect(loadPayload()).toBeNull()
  })

  it('loadPayload returns null when meta or levels is missing', () => {
    sessionStorage.setItem('wa.payload', '{"meta":{"title":"Fractions"}}')
    expect(loadPayload()).toBeNull()
    sessionStorage.setItem('wa.payload', '{"levels":[]}')
    expect(loadPayload()).toBeNull()
  })

  it('clearPayload removes the cached entry', () => {
    savePayload(payload)
    clearPayload()
    expect(loadPayload()).toBeNull()
  })
})
