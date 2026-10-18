import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import BossQuest from './BossQuest';

vi.mock('../../utils/soundFx', () => ({ playSfx: vi.fn() }));
vi.mock('../Confetti', () => ({ default: () => <div data-testid="confetti" /> }));
import { playSfx } from '../../utils/soundFx';

const level = (id: number, correct: string) => ({ id, difficulty: 'easy' as const, question: 'Question text ' + id, options: ['a' + id, 'b' + id, 'c' + id, 'd' + id], correctAnswer: correct, hint: 'Hint text ' + id, explanation: 'Because ' + id });
const payload = { meta: { title: 'T', subject: 'S', targetGrade: 'G', topicSummary: 'x' }, levels: [level(1, 'a1'), level(2, 'b2'), level(3, 'c3'), level(4, 'd4'), level(5, 'a5'), level(6, 'b6')], matchingPairs: [] };
const spell = (o: string) => screen.getAllByTestId('spell').find((b) => b.dataset.option === o)!;
const bar = (name: string) => screen.getByRole('progressbar', { name });

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('early victory: four correct answers defeat the boss', () => {
  render(<BossQuest payload={payload} onBack={() => {}} />);
  fireEvent.click(spell('a1'));
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  fireEvent.click(spell('b2'));
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  fireEvent.click(spell('c3'));
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  fireEvent.click(spell('d4'));
  expect(screen.getByText('Final blow! The Goofy Slime is defeated!')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Claim victory' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Claim victory' }));
  expect(screen.getByRole('heading', { name: 'Victory!' })).toBeTruthy();
  expect(screen.getByText('You defeated the Goofy Slime!')).toBeTruthy();
  expect(screen.getByRole('img', { name: '3 of 3 stars' })).toBeTruthy();
  expect(screen.getByText('4 of 4 on the first try · Hero HP 100%')).toBeTruthy();
  expect(screen.getByTestId('confetti')).toBeTruthy();
  expect(playSfx).toHaveBeenCalledWith('win');
});

it('stars: wrong answer costs a star and hero HP, play again resets', () => {
  render(<BossQuest payload={payload} onBack={() => {}} />);
  fireEvent.click(spell('b1'));
  fireEvent.click(spell('a1'));
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  fireEvent.click(spell('b2'));
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  fireEvent.click(spell('c3'));
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  fireEvent.click(spell('d4'));
  fireEvent.click(screen.getByRole('button', { name: 'Claim victory' }));
  expect(screen.getByRole('img', { name: '2 of 3 stars' })).toBeTruthy();
  expect(screen.getByText('3 of 4 on the first try · Hero HP 85%')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
  expect(screen.getByText('Question 1/6')).toBeTruthy();
  expect(bar('Boss HP').getAttribute('aria-valuenow')).toBe('100');
});

it('questions run out: boss escapes', () => {
  render(<BossQuest payload={{ ...payload, levels: [level(1, 'a1'), level(2, 'b2')] }} onBack={() => {}} />);
  fireEvent.click(spell('a1'));
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  fireEvent.click(spell('b2'));
  expect(screen.getByRole('button', { name: 'Claim victory' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Claim victory' }));
  expect(screen.getByRole('heading', { name: 'Victory!' })).toBeTruthy();
  expect(screen.getByText('The Goofy Slime ran away to practice!')).toBeTruthy();
});

it('back button and empty worksheet', () => {
  const onBack = vi.fn();
  render(<BossQuest payload={payload} onBack={onBack} />);
  fireEvent.click(screen.getByRole('button', { name: 'Back to games' }));
  expect(onBack).toHaveBeenCalledTimes(1);
  cleanup();
  render(<BossQuest payload={{ ...payload, levels: [] }} onBack={() => {}} />);
  expect(screen.getByText(/doesn't have any questions/)).toBeTruthy();
});
