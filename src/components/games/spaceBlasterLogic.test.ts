import { describe, expect, it } from 'vitest';
import {
  POINTS,
  SHIELD_HIT,
  START_SHIELD,
  initialBlaster,
  makeBlasterReducer,
} from './spaceBlasterLogic';

const L = (id: number, correct: string) => ({
  id,
  difficulty: 'easy' as const,
  question: 'Q' + id,
  options: ['a', 'b', 'c', 'd'],
  correctAnswer: correct,
  hint: 'h' + id,
  explanation: 'e' + id,
});

const levels = [L(1, 'a'), L(2, 'b'), L(3, 'c')];
const r = makeBlasterReducer(levels);

type State = ReturnType<typeof initialBlaster>;

const pick = (state: State, option: string): State =>
  r(state, { type: 'PICK', option });
const next = (state: State): State => r(state, { type: 'NEXT' });
const restart = (state: State): State => r(state, { type: 'RESTART' });

describe('spaceBlasterLogic', () => {
  it('scores a correct first try and enters the hit phase', () => {
    const state = pick(initialBlaster(), 'a');
    expect(state.phase).toBe('hit');
    expect(state.score).toBe(POINTS);
    expect(state.firstTry).toBe(1);
  });

  it('applies shield damage for a wrong pick and blocks repeats', () => {
    const wrong = pick(initialBlaster(), 'b');
    expect(wrong.phase).toBe('aim');
    expect(wrong.shield).toBe(START_SHIELD - SHIELD_HIT);
    expect(wrong.tried).toEqual(['b']);
    expect(wrong.lastWrong).toBe('b');
    expect(wrong.mistakes[0]).toEqual({
      levelId: 1,
      question: 'Q1',
      picked: 'b',
      correctAnswer: 'a',
      hint: 'h1',
      explanation: 'e1',
    });

    expect(pick(wrong, 'b')).toBe(wrong);

    const recovered = pick(wrong, 'a');
    expect(recovered.phase).toBe('hit');
    expect(recovered.score).toBe(POINTS);
    expect(recovered.firstTry).toBe(0);
    expect(recovered.lastWrong).toBeNull();
  });

  it('ignores PICK during hit and NEXT during aim', () => {
    const hit = pick(initialBlaster(), 'a');
    expect(pick(hit, 'b')).toBe(hit);

    const aim = initialBlaster();
    expect(next(aim)).toBe(aim);
  });

  it('advances levels with NEXT and wins a perfect run', () => {
    const levelTwo = next(pick(initialBlaster(), 'a'));
    expect(levelTwo.index).toBe(1);
    expect(levelTwo.phase).toBe('aim');
    expect(levelTwo.tried).toEqual([]);
    expect(levelTwo.lastWrong).toBeNull();

    const levelThree = next(pick(levelTwo, 'b'));
    const won = next(pick(levelThree, 'c'));
    expect(won.phase).toBe('won');
    expect(won.score).toBe(3 * POINTS);
  });

  it('never ends the game when the shield is empty (no game over)', () => {
    let state = initialBlaster();
    state = pick(state, 'b');
    state = pick(state, 'c');
    state = pick(state, 'd');
    expect(state.shield).toBe(START_SHIELD - 3 * SHIELD_HIT);

    state = pick(state, 'a');
    state = next(state);
    state = pick(state, 'a');
    state = pick(state, 'c');
    expect(state.shield).toBe(0);
    expect(state.phase).toBe('aim');

    state = pick(state, 'd');
    expect(state.shield).toBe(0);
    expect(state.phase).toBe('aim');

    state = pick(state, 'b');
    expect(state.phase).toBe('hit');
    state = next(state);
    state = pick(state, 'c');
    state = next(state);
    expect(state.phase).toBe('won');
    expect(state.shield).toBe(0);
  });

  it('returns the initial state on RESTART', () => {
    let state = pick(initialBlaster(), 'b');
    state = pick(state, 'a');
    state = next(state);
    expect(restart(state)).toEqual(initialBlaster());
  });
});
