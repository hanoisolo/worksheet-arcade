import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import VictoryReview from './VictoryReview';

vi.mock('./Confetti', () => ({ default: () => <div data-testid="confetti" /> }));

const m = (levelId: number, picked: string) => ({
  levelId,
  question: 'Q' + levelId,
  picked,
  correctAnswer: 'right' + levelId,
  hint: 'h',
  explanation: 'Because ' + levelId,
});

afterEach(cleanup);

it('renders the focused heading, star rating, grouped review items, and confetti', () => {
  render(
    <VictoryReview
      title="Victory!"
      subtitle="You win"
      stars={2}
      stats="3 of 4 on the first try"
      mistakes={[m(2, 'x'), m(2, 'y'), m(5, 'z')]}
      onPlayAgain={vi.fn()}
      onBack={vi.fn()}
    />,
  );

  expect(screen.getByRole('heading', { name: 'Victory!' })).toBe(document.activeElement);
  expect(screen.getByRole('img', { name: '2 of 3 stars' })).toBeTruthy();
  expect(screen.getByText("Let's review (2)")).toBeTruthy();
  const items = screen.getAllByTestId('review-item');
  expect(items).toHaveLength(2);
  expect(items[0].textContent).toContain('Q2');
  expect(items[0].textContent).toContain('You tried:');
  expect(items[0].textContent).toContain('x, y');
  expect(items[0].textContent).toContain('Correct answer: right2');
  expect(items[0].textContent).toContain('Because 2');
  expect(items[1].textContent).toContain('Q5');
  expect(screen.getByTestId('confetti')).toBeTruthy();
});

it('lists a duplicate pick once', () => {
  render(
    <VictoryReview
      title="Victory!"
      subtitle="You win"
      stars={3}
      stats="3 of 3 on the first try"
      mistakes={[m(1, 'x'), m(1, 'x')]}
      onPlayAgain={vi.fn()}
      onBack={vi.fn()}
    />,
  );

  const items = screen.getAllByTestId('review-item');
  expect(items).toHaveLength(1);
  expect(items[0].textContent).toContain('You tried: x');
  expect(items[0].textContent).not.toContain('x, x');
});

it('shows the perfect run message when there are no mistakes', () => {
  render(
    <VictoryReview
      title="Victory!"
      subtitle="You win"
      stars={3}
      stats="4 of 4 on the first try"
      mistakes={[]}
      onPlayAgain={vi.fn()}
      onBack={vi.fn()}
    />,
  );

  expect(screen.getByText('Perfect run: no mistakes to review!')).toBeTruthy();
  expect(screen.queryAllByTestId('review-item')).toHaveLength(0);
});

it('calls onPlayAgain and onBack and renders the art node', () => {
  const onPlayAgain = vi.fn();
  const onBack = vi.fn();

  render(
    <VictoryReview
      title="Victory!"
      subtitle="You win"
      stars={1}
      stats="2 of 4 on the first try"
      mistakes={[]}
      art={<span>ART</span>}
      onPlayAgain={onPlayAgain}
      onBack={onBack}
    />,
  );

  expect(screen.getByText('ART')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
  expect(onPlayAgain).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Back to games' }));
  expect(onBack).toHaveBeenCalledTimes(1);
});
