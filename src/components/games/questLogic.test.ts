import { describe, expect, it } from 'vitest';
import {
  BOSS_ATTACK,
  SPELL_DAMAGE,
  START_HP,
  initialQuest,
  isFinalBlow,
  makeQuestReducer,
  starsFor,
} from './questLogic';

type State = ReturnType<typeof initialQuest>;

const L = (id: number, correct: string) => ({
  id,
  difficulty: 'easy' as const,
  question: 'Q' + id,
  options: ['a', 'b', 'c', 'd'],
  correctAnswer: correct,
  hint: 'h' + id,
  explanation: 'e' + id,
});

const six = [L(1, 'a'), L(2, 'b'), L(3, 'c'), L(4, 'd'), L(5, 'a'), L(6, 'b')];
const r = makeQuestReducer(six);
const pick = (s: State, o: string) => r(s, { type: 'PICK', option: o });
const next = (s: State) => r(s, { type: 'NEXT' });

describe('questLogic', () => {
  it('correct first try hits the boss', () => {
    const s = pick(initialQuest(), 'a');
    expect(s.phase).toBe('hit');
    expect(s.bossHp).toBe(START_HP - SPELL_DAMAGE);
    expect(s.answered).toBe(1);
    expect(s.firstTry).toBe(1);
  });

  it('wrong pick damages the hero and records the mistake', () => {
    const s1 = pick(initialQuest(), 'b');
    expect(s1.phase).toBe('aim');
    expect(s1.heroHp).toBe(START_HP - BOSS_ATTACK);
    expect(s1.tried).toEqual(['b']);
    expect(s1.lastWrong).toBe('b');
    expect(s1.mistakes[0]).toEqual({
      levelId: 1,
      question: 'Q1',
      picked: 'b',
      correctAnswer: 'a',
      hint: 'h1',
      explanation: 'e1',
    });
    expect(pick(s1, 'b')).toBe(s1);
    const s2 = pick(s1, 'a');
    expect(s2.phase).toBe('hit');
    expect(s2.firstTry).toBe(0);
    expect(s2.answered).toBe(1);
  });

  it('never triggers game over: heroHp floors at 0 and the level stays playable', () => {
    let s = initialQuest();
    s = pick(s, 'b');
    s = pick(s, 'c');
    s = pick(s, 'd');
    expect(s.heroHp).toBe(START_HP - 3 * BOSS_ATTACK);
    s = pick(s, 'a');
    expect(s.phase).toBe('hit');
    s = next(s);
    expect(s.index).toBe(1);

    s = pick(s, 'a');
    s = pick(s, 'c');
    s = pick(s, 'd');
    expect(s.heroHp).toBe(START_HP - 6 * BOSS_ATTACK);
    s = pick(s, 'b');
    expect(s.phase).toBe('hit');
    s = next(s);
    expect(s.index).toBe(2);

    s = pick(s, 'a');
    expect(s.heroHp).toBe(0);
    s = pick(s, 'b');
    expect(s.heroHp).toBe(0);
    expect(s.phase).toBe('aim');
    s = pick(s, 'c');
    expect(s.phase).toBe('hit');
  });

  it('wins early when the boss is defeated with questions left', () => {
    let s = initialQuest();
    s = next(pick(s, 'a'));
    s = next(pick(s, 'b'));
    s = next(pick(s, 'c'));
    s = pick(s, 'd');
    expect(s.bossHp).toBe(0);
    expect(isFinalBlow(s, six.length)).toBe(true);
    s = next(s);
    expect(s.phase).toBe('won');
    expect(s.index).toBe(3);
  });

  it('wins when questions run out before the boss dies', () => {
    const r2 = makeQuestReducer([L(1, 'a'), L(2, 'b')]);
    let s = initialQuest();
    s = r2(s, { type: 'PICK', option: 'a' });
    s = r2(s, { type: 'NEXT' });
    s = r2(s, { type: 'PICK', option: 'b' });
    expect(s.bossHp).toBe(START_HP - 2 * SPELL_DAMAGE);
    expect(s.phase).toBe('hit');
    s = r2(s, { type: 'NEXT' });
    expect(s.phase).toBe('won');
  });

  it('ignores NEXT in aim and PICK in hit, and resets on RESTART', () => {
    const s0 = initialQuest();
    expect(next(s0)).toBe(s0);
    const s1 = pick(s0, 'a');
    expect(s1.phase).toBe('hit');
    expect(pick(s1, 'b')).toBe(s1);
    expect(r(s1, { type: 'RESTART' })).toEqual(initialQuest());
  });

  it('maps the first-try ratio to stars', () => {
    expect(starsFor(4, 4)).toBe(3);
    expect(starsFor(9, 10)).toBe(3);
    expect(starsFor(3, 4)).toBe(2);
    expect(starsFor(3, 5)).toBe(2);
    expect(starsFor(2, 4)).toBe(1);
    expect(starsFor(0, 0)).toBe(1);
  });
});
