import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import BossQuest from './BossQuest';
vi.mock('../../utils/soundFx', () => ({ playSfx: vi.fn() }));
vi.mock('../Confetti', () => ({ default: () => <div data-testid="confetti" /> }));
import { playSfx } from '../../utils/soundFx';
const level = (id: number, correct: string) => ({ id, difficulty: 'easy' as const, question: 'Question text ' + id, options: ['a' + id, 'b' + id, 'c' + id, 'd' + id], correctAnswer: correct, hint: 'Hint text ' + id, explanation: 'Because ' + id });
const payload = { meta: { title: 'T', subject: 'S', targetGrade: 'G', topicSummary: 'x' }, levels: [level(1, 'a1'), level(2, 'b2'), level(3, 'c3'), level(4, 'd4'), level(5, 'a5'), level(6, 'b6')], matchingPairs: [] };
const CORRECT = ['a1', 'b2', 'c3', 'd4', 'a5', 'b6'];
const spell = (o: string) => screen.getAllByTestId('spell').find((b) => b.dataset.option === o)!;
const bar = (name: string) => screen.getByRole('progressbar', { name });
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('the battle covers every question', () => {
  const onComplete = vi.fn();
  render(<BossQuest payload={payload} onBack={vi.fn()} onComplete={onComplete} />);
  for (let i = 0; i < 5; i++) {
    fireEvent.click(spell(CORRECT[i]));
    next();
  }
  expect(bar('Boss HP').getAttribute('aria-valuenow')).toBe('17');
  expect(screen.queryByText(/Final blow/)).toBeNull();
  fireEvent.click(spell('b6'));
  expect(screen.getByText('Final blow! The Goofy Slime is defeated!')).toBeTruthy();
  expect(bar('Boss HP').getAttribute('aria-valuenow')).toBe('0');
  fireEvent.click(screen.getByRole('button', { name: 'Claim victory' }));
  expect(onComplete).toHaveBeenCalledTimes(1);
  expect(onComplete).toHaveBeenCalledWith({ summary: '3 of 3 stars', stars: 3 });
  expect(screen.getByRole('heading', { name: 'Victory!' })).toBeTruthy();
  expect(screen.getByText('You defeated the Goofy Slime!')).toBeTruthy();
  expect(screen.getByRole('img', { name: '3 of 3 stars' })).toBeTruthy();
  expect(screen.getByText('6 of 6 on the first try · Hero HP 100%')).toBeTruthy();
  expect(screen.getByText('Perfect run: no mistakes to review!')).toBeTruthy();
  expect(screen.getByTestId('confetti')).toBeTruthy();
  expect(playSfx).toHaveBeenCalledWith('win');
});

it('mistakes show up in the review', () => {
  render(<BossQuest payload={payload} onBack={vi.fn()} />);
  fireEvent.click(spell('b1'));
  fireEvent.click(spell('c1'));
  fireEvent.click(spell('a1'));
  next();
  fireEvent.click(spell('a2'));
  fireEvent.click(spell('b2'));
  next();
  fireEvent.click(spell('c3'));
  next();
  fireEvent.click(spell('d4'));
  next();
  fireEvent.click(spell('a5'));
  next();
  fireEvent.click(spell('b6'));
  fireEvent.click(screen.getByRole('button', { name: 'Claim victory' }));
  expect(screen.getByRole('img', { name: '2 of 3 stars' })).toBeTruthy();
  expect(screen.getByText('4 of 6 on the first try · Hero HP 55%')).toBeTruthy();
  const items = screen.getAllByTestId('review-item');
  expect(items).toHaveLength(2);
  expect(items[0].textContent).toContain('Question text 1');
  expect(items[0].textContent).toContain('b1, c1');
  expect(items[0].textContent).toContain('Correct answer: a1');
  expect(items[0].textContent).toContain('Because 1');
  expect(items[1].textContent).toContain('Correct answer: b2');
  fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
  expect(screen.getByText('Question 1/6')).toBeTruthy();
  expect(bar('Boss HP').getAttribute('aria-valuenow')).toBe('100');
});

it('back and empty', () => {
  const onBack = vi.fn();
  render(<BossQuest payload={payload} onBack={onBack} />);
  fireEvent.click(screen.getByRole('button', { name: 'Back to games' }));
  expect(onBack).toHaveBeenCalledTimes(1);
  cleanup();
  render(<BossQuest payload={{ ...payload, levels: [] }} onBack={onBack} />);
  expect(screen.getByText(/doesn't have any questions/)).toBeTruthy();
});
