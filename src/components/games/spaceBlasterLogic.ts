import type { GameLevel } from '../../types/game'

export const POINTS = 100
export const SHIELD_HIT = 20
export const START_SHIELD = 100

export interface Mistake {
  levelId: number
  question: string
  picked: string
  correctAnswer: string
  hint: string
  explanation: string
}

export type BlasterPhase = 'aim' | 'hit' | 'won'

export interface BlasterState {
  index: number
  score: number
  shield: number
  phase: BlasterPhase
  tried: string[]
  lastWrong: string | null
  firstTry: number
  mistakes: Mistake[]
}

export type BlasterAction =
  | { type: 'PICK'; option: string }
  | { type: 'NEXT' }
  | { type: 'RESTART' }

export function initialBlaster(): BlasterState {
  return {
    index: 0,
    score: 0,
    shield: START_SHIELD,
    phase: 'aim',
    tried: [],
    lastWrong: null,
    firstTry: 0,
    mistakes: [],
  }
}

export function makeBlasterReducer(
  levels: GameLevel[]
): (state: BlasterState, action: BlasterAction) => BlasterState {
  return (state, action) => {
    switch (action.type) {
      case 'PICK': {
        if (state.phase !== 'aim') return state
        const level = levels[state.index]
        if (!level) return state
        if (state.tried.includes(action.option)) return state

        if (action.option === level.correctAnswer) {
          return {
            ...state,
            phase: 'hit',
            score: state.score + POINTS,
            firstTry: state.firstTry + (state.tried.length === 0 ? 1 : 0),
            lastWrong: null,
          }
        }

        const shield = Math.max(0, state.shield - SHIELD_HIT)
        return {
          ...state,
          shield,
          tried: [...state.tried, action.option],
          lastWrong: action.option,
          mistakes: [
            ...state.mistakes,
            {
              levelId: level.id,
              question: level.question,
              picked: action.option,
              correctAnswer: level.correctAnswer,
              hint: level.hint,
              explanation: level.explanation,
            },
          ],
          phase: 'aim',
        }
      }

      case 'NEXT': {
        if (state.phase !== 'hit') return state
        if (state.index + 1 >= levels.length) {
          return { ...state, phase: 'won' }
        }
        return {
          ...state,
          index: state.index + 1,
          phase: 'aim',
          tried: [],
          lastWrong: null,
        }
      }

      case 'RESTART':
        return initialBlaster()

      default:
        return state
    }
  }
}
