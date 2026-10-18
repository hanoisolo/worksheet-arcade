import type { GameLevel } from '../../types/game'
import type { Mistake } from './spaceBlasterLogic'

export type { Mistake }

export const SPELL_DAMAGE = 25
export const BOSS_ATTACK = 15
export const START_HP = 100

export type QuestPhase = 'aim' | 'hit' | 'won'

export interface QuestState {
  index: number
  bossHp: number
  heroHp: number
  phase: QuestPhase
  tried: string[]
  lastWrong: string | null
  firstTry: number
  answered: number
  mistakes: Mistake[]
}

export type QuestAction =
  | { type: 'PICK'; option: string }
  | { type: 'NEXT' }
  | { type: 'RESTART' }

export function initialQuest(): QuestState {
  return {
    index: 0,
    bossHp: START_HP,
    heroHp: START_HP,
    phase: 'aim',
    tried: [],
    lastWrong: null,
    firstTry: 0,
    answered: 0,
    mistakes: []
  }
}

export function isFinalBlow(state: QuestState, levelCount: number): boolean {
  return state.bossHp === 0 || state.index + 1 >= levelCount
}

export function starsFor(firstTry: number, answered: number): 1 | 2 | 3 {
  if (answered === 0) return 1
  const ratio = firstTry / answered
  if (ratio >= 0.9) return 3
  if (ratio >= 0.6) return 2
  return 1
}

export function makeQuestReducer(
  levels: GameLevel[]
): (state: QuestState, action: QuestAction) => QuestState {
  return (state: QuestState, action: QuestAction): QuestState => {
    switch (action.type) {
      case 'PICK': {
        if (state.phase !== 'aim') return state
        const level = levels[state.index]
        if (!level || state.tried.includes(action.option)) return state
        if (action.option === level.correctAnswer) {
          return {
            ...state,
            phase: 'hit',
            bossHp: Math.max(0, state.bossHp - SPELL_DAMAGE),
            answered: state.answered + 1,
            firstTry: state.firstTry + (state.tried.length === 0 ? 1 : 0),
            lastWrong: null
          }
        }
        return {
          ...state,
          heroHp: Math.max(0, state.heroHp - BOSS_ATTACK),
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
              explanation: level.explanation
            }
          ]
        }
      }
      case 'NEXT': {
        if (state.phase !== 'hit') return state
        if (isFinalBlow(state, levels.length)) {
          return { ...state, phase: 'won' }
        }
        return {
          ...state,
          index: state.index + 1,
          phase: 'aim',
          tried: [],
          lastWrong: null
        }
      }
      case 'RESTART':
        return initialQuest()
      default:
        return state
    }
  }
}
