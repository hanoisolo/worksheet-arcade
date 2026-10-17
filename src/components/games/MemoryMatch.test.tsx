// @vitest-environment jsdom
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ComponentProps } from 'react';
import MemoryMatch, { FLIP_BACK_MS } from './MemoryMatch';
import { playSfx } from '../../utils/soundFx';
import { SAMPLE_PAYLOAD } from '../../mock/sampleData';

vi.mock('../../utils/soundFx', () => ({ playSfx: vi.fn() }));
vi.mock('../Confetti', () => ({ default: () => <div data-testid="confetti" /> }));

type Payload = ComponentProps<typeof MemoryMatch>['payload'];

const NOT_ENOUGH_PAIRS =
  "This worksheet doesn't have enough matching pairs for Memory Match.";

const onBack = vi.fn();

const renderGame = (payload: Payload = SAMPLE_PAYLOAD) =>
  render(<MemoryMatch payload={payload} onBack={onBack} />);

const cards = () => screen.getAllByTestId('memory-card');
const byPair = (id: string) => cards().filter((c) => c.dataset.pair === id);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('MemoryMatch', () => {
  it('renders 12 face-down cards with zeroed moves and pairs', () => {
    renderGame();

    const faceDown = cards();
    expect(faceDown).toHaveLength(12);
    expect(faceDown.every((c) => c.dataset.state === 'down')).toBe(true);
    const labels = faceDown.map((c) => c.getAttribute('aria-label') ?? '');
    expect(labels.every((label) => label.includes('face down'))).toBe(true);
    expect(screen.getByText('Moves: 0')).toBeInTheDocument();
    expect(screen.getByText('Pairs: 0/6')).toBeInTheDocument();
  });

  it('flips a mismatched pair up, locks the board, then flips both back down', () => {
    renderGame();

    const first = byPair('p0')[0];
    const second = byPair('p1')[0];
    fireEvent.click(first);
    fireEvent.click(second);

    expect(first.dataset.state).toBe('up');
    expect(second.dataset.state).toBe('up');
    expect(screen.getByText('Moves: 1')).toBeInTheDocument();
    expect(playSfx).toHaveBeenCalledWith('miss');

    const third = byPair('p2')[0];
    fireEvent.click(third);
    expect(third.dataset.state).toBe('down');

    act(() => {
      vi.advanceTimersByTime(FLIP_BACK_MS);
    });
    expect(cards().every((c) => c.dataset.state === 'down')).toBe(true);
  });

  it('marks both cards of a matching pair as matched', () => {
    renderGame();

    const [first, second] = byPair('p2');
    fireEvent.click(first);
    fireEvent.click(second);

    expect(first.dataset.state).toBe('matched');
    expect(second.dataset.state).toBe('matched');
    expect(screen.getByText('Pairs: 1/6')).toBeInTheDocument();
    expect(playSfx).toHaveBeenCalledWith('match');
  });

  it('shows the win screen after all pairs match and resets on play again', () => {
    renderGame();

    for (const id of ['p0', 'p1', 'p2', 'p3', 'p4', 'p5']) {
      const [first, second] = byPair(id);
      fireEvent.click(first);
      fireEvent.click(second);
    }

    const heading = screen.getByRole('heading', { name: 'You matched them all!' });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText('6 moves · 0:00')).toBeInTheDocument();
    expect(playSfx).toHaveBeenCalledWith('win');
    expect(screen.getByTestId('confetti')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Play again' }));

    expect(cards()).toHaveLength(12);
    expect(cards().every((c) => c.dataset.state === 'down')).toBe(true);
    expect(screen.getByText('Moves: 0')).toBeInTheDocument();
  });

  it('ticks the elapsed play time', () => {
    renderGame();

    fireEvent.click(cards()[0]);
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText('Time: 0:03')).toBeInTheDocument();
  });

  it('dedupes matching pairs that resolve to the same value', () => {
    renderGame({
      ...SAMPLE_PAYLOAD,
      matchingPairs: [
        { id: 'a', term: '1/2', match: '0.5' },
        { id: 'b', term: '2/4', match: '0.5' },
        { id: 'c', term: '3/4', match: '75%' },
      ],
    });

    expect(cards()).toHaveLength(4);
  });

  it('shows the fallback screen when there are not enough pairs', () => {
    renderGame({
      ...SAMPLE_PAYLOAD,
      matchingPairs: [{ id: 'a', term: 'x', match: 'y' }],
    });

    expect(screen.getByText(NOT_ENOUGH_PAIRS)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to games' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
