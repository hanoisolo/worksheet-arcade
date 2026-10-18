import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import ReadyScreen from './ReadyScreen';
import { SAMPLE_PAYLOAD } from '../mock/sampleData';

type Results = Partial<
  Record<'space' | 'memory' | 'boss', { summary: string; stars?: 1 | 2 | 3 }>
>;

afterEach(cleanup);

function renderReady(results?: Results) {
  const onPick = vi.fn();
  const onHome = vi.fn();
  render(
    <ReadyScreen
      payload={SAMPLE_PAYLOAD}
      source="demo"
      onPick={onPick}
      onHome={onHome}
      results={results}
    />,
  );
  return { onPick, onHome };
}

function gameButton(name: RegExp) {
  return screen.getByRole('button', { name }) as HTMLButtonElement;
}

describe('ReadyScreen results', () => {
  it('shows "Pick a game" without results and no played info', () => {
    renderReady();
    expect(screen.getByRole('heading', { name: 'Pick a game' })).toBeTruthy();
    expect(screen.queryByText(/Played/)).toBeNull();
  });

  it('shows "Pick another game" with per-game played summaries', () => {
    renderReady({
      memory: { summary: '7 moves · 0:42' },
      boss: { summary: '2 of 3 stars', stars: 2 },
    });
    expect(
      screen.getByRole('heading', { name: 'Pick another game' }),
    ).toBeTruthy();
    expect(screen.getByText('Played 2 of 3')).toBeTruthy();
    expect(gameButton(/Memory Match/).textContent).toContain(
      'Played · 7 moves · 0:42',
    );
    expect(gameButton(/Boss Quest/).textContent).toContain(
      'Played · 2 of 3 stars',
    );
    expect(gameButton(/Space Blaster/).textContent).not.toContain('Played');
  });

  it('enables all game buttons and calls onPick with each game id', () => {
    const { onPick } = renderReady();
    const space = gameButton(/Space Blaster/);
    const memory = gameButton(/Memory Match/);
    const boss = gameButton(/Boss Quest/);
    expect(space.disabled).toBe(false);
    expect(memory.disabled).toBe(false);
    expect(boss.disabled).toBe(false);
    fireEvent.click(space);
    fireEvent.click(memory);
    fireEvent.click(boss);
    expect(onPick).toHaveBeenCalledWith('space');
    expect(onPick).toHaveBeenCalledWith('memory');
    expect(onPick).toHaveBeenCalledWith('boss');
    expect(onPick).toHaveBeenCalledTimes(3);
  });

  it('calls onHome from "New worksheet" and shows the helper text', () => {
    const { onHome } = renderReady();
    fireEvent.click(screen.getByRole('button', { name: /New worksheet/ }));
    expect(onHome).toHaveBeenCalled();
    expect(
      screen.getByText('Upload a different worksheet to make new games.'),
    ).toBeTruthy();
  });
});
