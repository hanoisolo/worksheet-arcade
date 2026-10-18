import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { playSfx } from '../../utils/soundFx';
import SpaceBlaster from './SpaceBlaster';

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
  levels: [level(1, 'a1'), level(2, 'c2')],
  matchingPairs: []
};
const ast = (o: string) => screen.getAllByTestId('asteroid').find((b) => b.dataset.option === o)!;
const onBack = vi.fn();

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SpaceBlaster', () => {
  it('renders question, score, asteroids, and shield', () => {
    render(<SpaceBlaster payload={payload} onBack={onBack} />);
    expect(screen.getByText('Question 1/2')).toBeTruthy();
    expect(screen.getByText('Score: 0')).toBeTruthy();
    expect(screen.getByText('Question text 1')).toBeTruthy();
    expect(screen.getAllByTestId('asteroid')).toHaveLength(4);
    expect(screen.getByRole('progressbar', { name: 'Shield' }).getAttribute('aria-valuenow')).toBe('100');
  });

  it('handles a wrong pick', () => {
    render(<SpaceBlaster payload={payload} onBack={onBack} />);
    fireEvent.click(ast('b1'));
    expect(screen.getByText(/Shield −20/)).toBeTruthy();
    expect(screen.getByText('Hint text 1')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Shield' }).getAttribute('aria-valuenow')).toBe('80');
    expect(ast('b1').hasAttribute('disabled')).toBe(true);
    expect(ast('b1').dataset.state).toBe('tried');
    expect(playSfx).toHaveBeenCalledWith('wrong');
  });

  it('handles a correct pick and advances to the next question', () => {
    render(<SpaceBlaster payload={payload} onBack={onBack} />);
    fireEvent.click(ast('a1'));
    expect(screen.getByText('Direct hit! +100')).toBeTruthy();
    expect(screen.getByText('Because 1')).toBeTruthy();
    expect(screen.getByText('Score: 100')).toBeTruthy();
    expect(playSfx).toHaveBeenCalledWith('laser');
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
    expect(screen.getByText('Question 2/2')).toBeTruthy();
  });

  it('picks options with keys 1-4', () => {
    render(<SpaceBlaster payload={payload} onBack={onBack} />);
    fireEvent.keyDown(window, { key: '3' });
    expect(ast('c1').dataset.state).toBe('tried');
    fireEvent.keyDown(window, { key: '1' });
    expect(screen.getByText('Direct hit! +100')).toBeTruthy();
  });

  it('moves focus to the next live asteroid after a wrong pick', () => {
    render(<SpaceBlaster payload={payload} onBack={onBack} />);
    fireEvent.click(ast('b1'));
    expect(document.activeElement).toBe(ast('c1'));
    fireEvent.click(ast('d1'));
    expect(document.activeElement).toBe(ast('a1'));
  });
});
