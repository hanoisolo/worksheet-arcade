import type { GamePayload, ParseError, ParseStep, WorksheetFile } from '../types/game'

export type GameId = 'space' | 'memory' | 'boss'

export type AppState =
  | { phase: 'setup'; file: WorksheetFile | null }
  | { phase: 'parsing'; file: WorksheetFile; step: ParseStep }
  | { phase: 'ready'; payload: GamePayload; source: 'ai' | 'demo'; file: WorksheetFile | null }
  | {
      phase: 'playing'
      payload: GamePayload
      source: 'ai' | 'demo'
      game: GameId
      file: WorksheetFile | null
    }
  | { phase: 'error'; error: ParseError; file: WorksheetFile | null }

export type Action =
  | { type: 'FILE_SELECTED'; file: WorksheetFile }
  | { type: 'FILE_CLEARED' }
  | { type: 'START_PARSE' }
  | { type: 'CANCEL_PARSE' }
  | { type: 'PROGRESS'; step: ParseStep }
  | { type: 'PARSE_OK'; payload: GamePayload }
  | { type: 'PARSE_FAIL'; error: ParseError }
  | { type: 'USE_DEMO'; payload: GamePayload }
  | { type: 'PICK_GAME'; game: GameId }
  | { type: 'BACK_TO_PICKER' }
  | { type: 'RESET' }

const STORAGE_KEY = 'wa.payload'

export function savePayload(payload: GamePayload): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Storage can be unavailable or full; caching is best-effort.
  }
}

export function loadPayload(): GamePayload | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const record = parsed as Record<string, unknown>
    const hasMeta = typeof record.meta === 'object' && record.meta !== null
    const hasLevels = Array.isArray(record.levels)
    if (!hasMeta || !hasLevels) return null
    return parsed as GamePayload
  } catch {
    return null
  }
}

export function clearPayload(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Best-effort; a failed clear only leaves a stale cache entry.
  }
}

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'FILE_SELECTED':
      if (state.phase === 'setup' || state.phase === 'error') {
        return { phase: 'setup', file: action.file }
      }
      return state
    case 'FILE_CLEARED':
      if (state.phase === 'setup') {
        return { phase: 'setup', file: null }
      }
      return state
    case 'START_PARSE':
      if (
        (state.phase === 'setup' || state.phase === 'error') &&
        state.file !== null
      ) {
        return { phase: 'parsing', file: state.file, step: 'reading' }
      }
      return state
    case 'CANCEL_PARSE':
      if (state.phase === 'parsing') {
        return { phase: 'setup', file: state.file }
      }
      return state
    case 'PROGRESS':
      if (state.phase === 'parsing') {
        return { phase: 'parsing', file: state.file, step: action.step }
      }
      return state
    case 'PARSE_OK':
      if (state.phase === 'parsing') {
        savePayload(action.payload)
        return { phase: 'ready', payload: action.payload, source: 'ai', file: state.file }
      }
      return state
    case 'PARSE_FAIL':
      if (state.phase === 'parsing') {
        return { phase: 'error', error: action.error, file: state.file }
      }
      return state
    case 'USE_DEMO':
      return { phase: 'ready', payload: action.payload, source: 'demo', file: null }
    case 'PICK_GAME':
      if (state.phase === 'ready') {
        return {
          phase: 'playing',
          payload: state.payload,
          source: state.source,
          game: action.game,
          file: state.file,
        }
      }
      return state
    case 'BACK_TO_PICKER':
      if (state.phase === 'playing') {
        return { phase: 'ready', payload: state.payload, source: state.source, file: state.file }
      }
      return state
    case 'RESET':
      clearPayload()
      return { phase: 'setup', file: null }
  }
}

export function initialState(): AppState {
  const cached = loadPayload()
  if (cached !== null) {
    return { phase: 'ready', payload: cached, source: 'ai', file: null }
  }
  return { phase: 'setup', file: null }
}
