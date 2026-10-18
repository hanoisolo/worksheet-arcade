import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import BossQuest from './BossQuest';
import { playSfx } from '../../utils/soundFx';

vi.mock('../../utils/soundFx', () => ({ playSfx: vi.fn() }));
vi.mock('../Confetti', () => ({ default: () => <div data-testid="confetti" /> }));

const level = (id: number, correct: string) => ({
  id,
  difficulty: 'easy' as const,
  question: 'Question text ' + id,
  options: ['a' + id, 'b' + id, 'c' + id, 'd' + id],
  correctAnswer: correct,
  hint: 'Hint text ' + id,
  explanation: 'Because ' + id
});
const payload = {
  meta: { title: 'T', subject: 'S', targetGrade: 'G', topicSummary: 'x' },
  levels: [level(1, 'a1'), level(2, 'b2'), level(3, 'c3'), level(4, 'd4'), level(5, 'a5'), level(6, 'b6')],
  matchingPairs: []
};
const spell = (o: string) => screen.getAllByTestId('spell').find((b) => b.dataset.option === o)!;
const bar = (name: string) => screen.getByRole('progressbar', { name });
const onBack = vi.fn();

afterEach(() => { cleanup(); vi.clearAllMocks() });

test('renders the Boss Quest board with hero and boss HP bars', () => {
  render(<BossQuest payload={payload} onBack={onBack} />);
  expect(screen.getByRole('heading', { name: 'Boss Quest' })).toBeTruthy();
  expect(screen.getByText('Question 1/6')).toBeTruthy();
  expect(screen.getByText('Question text 1')).toBeTruthy();
  expect(screen.getAllByTestId('spell')).toHaveLength(4);
  expect(bar('Hero HP').getAttribute('aria-valuenow')).toBe('100');
  expect(bar('Boss HP').getAttribute('aria-valuenow')).toBe('100');
});

test('a wrong spell bonks the hero, shows a hint, and moves focus to the next live spell', () => {
  render(<BossQuest payload={payload} onBack={onBack} />);
  fireEvent.click(spell('b1'));
  expect(screen.getByText(/bonks you/)).toBeTruthy();
  expect(screen.getByText('Hint text 1')).toBeTruthy();
  expect(bar('Hero HP').getAttribute('aria-valuenow')).toBe('85');
  expect((spell('b1') as HTMLButtonElement).disabled).toBe(true);
  expect(spell('b1').getAttribute('data-state')).toBe('tried');
  expect(document.activeElement).toBe(spell('c1'));
  expect(playSfx).toHaveBeenCalledWith('hit');
});

test('a correct spell hits the boss and advances to the next question', () => {
  render(<BossQuest payload={payload} onBack={onBack} />);
  fireEvent.click(spell('a1'));
  expect(screen.getByText('Your spell hit! −25 boss HP')).toBeTruthy();
  expect(screen.getByText('Because 1')).toBeTruthy();
  expect(bar('Boss HP').getAttribute('aria-valuenow')).toBe('75');
  expect(spell('a1').getAttribute('data-state')).toBe('hit');
  expect(playSfx).toHaveBeenCalledWith('correct');
  const next = screen.getByRole('button', { name: 'Next question' });
  expect(document.activeElement).toBe(next);
  fireEvent.click(next);
  expect(screen.getByText('Question 2/6')).toBeTruthy();
});

test('keys 1-4 pick spells and focus wraps to the first live spell', () => {
  render(<BossQuest payload={payload} onBack={onBack} />);
  fireEvent.keyDown(window, { key: '4' });
  expect(spell('d1').getAttribute('data-state')).toBe('tried');
  expect(document.activeElement).toBe(spell('a1'));
  fireEvent.keyDown(window, { key: '1' });
  expect(screen.getByText('Your spell hit! −25 boss HP')).toBeTruthy();
});

test('hero HP floors at 0 and the quest continues without a game over', () => {
  render(<BossQuest payload={payload} onBack={onBack} />);
  fireEvent.click(spell('b1'));
  fireEvent.click(spell('c1'));
  fireEvent.click(spell('d1'));
  fireEvent.click(spell('a1'));
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  fireEvent.click(spell('a2'));
  fireEvent.click(spell('c2'));
  fireEvent.click(spell('d2'));
  expect(bar('Hero HP').getAttribute('aria-valuenow')).toBe('10');
  fireEvent.click(spell('b2'));
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  fireEvent.click(spell('a3'));
  expect(bar('Hero HP').getAttribute('aria-valuenow')).toBe('0');
  expect(screen.getByText(/heroes never give up/)).toBeTruthy();
  expect(screen.queryByText(/game over/i)).toBeNull();
  fireEvent.click(spell('c3'));
  expect(screen.getByText('Your spell hit! −25 boss HP')).toBeTruthy();
});
