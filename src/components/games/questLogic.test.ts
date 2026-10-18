import { describe, expect, it } from 'vitest';
import {
  BOSS_ATTACK,
  START_HP,
  bossHpAfter,
  initialQuest,
  isFinalBlow,
  makeQuestReducer,
  starsFor,
} from './questLogic';

type QuestState = ReturnType<typeof initialQuest>;

const L = (id: number, correct: string) => ({
  id,
  difficulty: 'easy' as const,
  question: 'Q' + id,
  options: ['a', 'b', 'c', 'd'],
  correctAnswer: correct,
  hint: 'h' + id,
  explanation: 'e' + id,
});

const answers = ['a', 'b', 'c', 'd', 'a', 'b', 'c', 'd'];

const make = (n: number) => answers.slice(0, n).map((c, i) => L(i + 1, c));

const rig = (n: number) => {
  const reduce = makeQuestReducer(make(n));
  return {
    pick: (s: QuestState, option: string) => reduce(s, { type: 'PICK', option }),
    next: (s: QuestState) => reduce(s, { type: 'NEXT' }),
    restart: (s: QuestState) => reduce(s, { type: 'RESTART' }),
  };
};

describe('bossHpAfter', () => {
  it('scales boss hp with answered questions', () => {
    expect(bossHpAfter(1, 8)).toBe(88);
    expect(bossHpAfter(4, 8)).toBe(50);
    expect(bossHpAfter(7, 8)).toBe(13);
    expect(bossHpAfter(8, 8)).toBe(0);
    expect(bossHpAfter(1, 6)).toBe(83);
    expect(bossHpAfter(5, 6)).toBe(17);
    expect(bossHpAfter(1, 4)).toBe(75);
    expect(bossHpAfter(1, 1)).toBe(0);
    expect(bossHpAfter(0, 0)).toBe(0);
    expect(bossHpAfter(3, 0)).toBe(0);
  });
});

describe('quest constants', () => {
  it('exposes the boss attack and starting hp', () => {
    expect(BOSS_ATTACK).toBe(15);
    expect(START_HP).toBe(100);
  });
});

describe('quest reducer', () => {
  it('lands a spell on a correct first pick', () => {
    const { pick } = rig(8);
    const s = pick(initialQuest(), 'a');
    expect(s.phase).toBe('hit');
    expect(s.bossHp).toBe(88);
    expect(s.answered).toBe(1);
    expect(s.firstTry).toBe(1);
  });

  it('records a wrong pick and lets the player retry', () => {
    const { pick } = rig(8);
    const s0 = initialQuest();
    const s1 = pick(s0, 'b');
    expect(s1.phase).toBe('aim');
    expect(s1.heroHp).toBe(85);
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

  it('covers every question and ends on the final blow', () => {
    const cases: [number, number][] = [
      [8, 13],
      [6, 17],
      [3, 33],
    ];
    for (const [n, after] of cases) {
      const { pick, next } = rig(n);
      let s = initialQuest();
      for (let i = 0; i < n - 2; i += 1) {
        s = next(pick(s, answers[i]));
      }
      s = pick(s, answers[n - 2]);
      expect(s.bossHp).toBe(after);
      expect(isFinalBlow(s, n)).toBe(false);
      s = next(s);
      s = pick(s, answers[n - 1]);
      expect(s.bossHp).toBe(0);
      expect(isFinalBlow(s, n)).toBe(true);
      s = next(s);
      expect(s.phase).toBe('won');
      expect(s.index).toBe(n - 1);
    }
  });

  it('keeps the quest going when the hero runs out of hp', () => {
    const { pick, next } = rig(8);
    let s = initialQuest();
    s = pick(s, 'b');
    s = pick(s, 'c');
    s = pick(s, 'd');
    expect(s.heroHp).toBe(55);
    s = pick(s, 'a');
    s = next(s);
    s = pick(s, 'a');
    s = pick(s, 'c');
    s = pick(s, 'd');
    expect(s.heroHp).toBe(10);
    s = pick(s, 'b');
    s = next(s);
    s = pick(s, 'a');
    expect(s.heroHp).toBe(0);
    expect(s.phase).toBe('aim');
    s = pick(s, 'c');
    expect(s.phase).toBe('hit');
  });

  it('ignores out-of-phase actions and restarts to the initial quest', () => {
    const { pick, next, restart } = rig(8);
    const s0 = initialQuest();
    expect(next(s0)).toBe(s0);
    const s1 = pick(s0, 'b');
    expect(next(s1)).toBe(s1);
    const s2 = pick(s1, 'a');
    expect(s2.phase).toBe('hit');
    expect(pick(s2, 'c')).toBe(s2);
    expect(restart(s2)).toEqual(initialQuest());
  });
});

describe('starsFor', () => {
  it('grades by first-try ratio', () => {
    expect(starsFor(8, 8)).toBe(3);
    expect(starsFor(9, 10)).toBe(3);
    expect(starsFor(7, 8)).toBe(2);
    expect(starsFor(3, 5)).toBe(2);
    expect(starsFor(2, 4)).toBe(1);
    expect(starsFor(0, 0)).toBe(1);
  });
});
