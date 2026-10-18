import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import SpaceBlaster from './SpaceBlaster';

vi.mock('../../utils/soundFx', () => ({ playSfx: vi.fn() }));
vi.mock('../Confetti', () => ({ default: () => <div data-testid="confetti" /> }));
import { playSfx } from '../../utils/soundFx';

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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SpaceBlaster end screens', () => {
  it('win: results screen with confetti and win sfx, play again resets', () => {
    render(<SpaceBlaster payload={payload} onBack={() => {}} />);

    fireEvent.click(ast('a1'));
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
    fireEvent.click(ast('c2'));
    fireEvent.click(screen.getByRole('button', { name: 'See results' }));

    expect(screen.getByRole('heading', { name: 'Mission complete!' })).toBeTruthy();
    expect(screen.getByText('Score: 200')).toBeTruthy();
    expect(screen.getByTestId('confetti')).toBeTruthy();
    expect(playSfx).toHaveBeenCalledWith('win');

    fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
    expect(screen.getByText('Question 1/2')).toBeTruthy();
    expect(screen.getByText('Score: 0')).toBeTruthy();
  });

  it('no game over: shield empties but play continues', () => {
    render(<SpaceBlaster payload={payload} onBack={() => {}} />);

    fireEvent.click(ast('b1'));
    fireEvent.click(ast('c1'));
    fireEvent.click(ast('d1'));
    fireEvent.click(ast('a1'));
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
    fireEvent.click(ast('a2'));
    fireEvent.click(ast('b2'));

    const shield = screen.getByRole('progressbar', { name: 'Shield' });
    expect(shield.getAttribute('aria-valuenow')).toBe('0');
    expect(screen.queryByRole('heading', { name: 'Shields down!' })).toBeNull();
    expect(screen.getByText('Question 2/2')).toBeTruthy();
    expect(screen.getByText(/shield is empty/)).toBeTruthy();

    fireEvent.click(ast('c2'));
    expect(screen.getByText('Direct hit! +100')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'See results' }));
    expect(screen.getByRole('heading', { name: 'Mission complete!' })).toBeTruthy();
    expect(screen.getByText(/Shield 0%/)).toBeTruthy();
  });

  it('back button calls onBack; empty levels show a message', () => {
    const onBack = vi.fn();
    render(<SpaceBlaster payload={payload} onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: 'Back to games' }));
    expect(onBack).toHaveBeenCalledTimes(1);

    cleanup();
    render(<SpaceBlaster payload={{ ...payload, levels: [] }} onBack={() => {}} />);
    expect(screen.getByText(/doesn't have any questions/)).toBeTruthy();
  });
});
