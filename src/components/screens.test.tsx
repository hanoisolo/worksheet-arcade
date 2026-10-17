import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ParsingScreen from './ParsingScreen';
import ErrorScreen from './ErrorScreen';
import type { ParseError } from '../types/game';

afterEach(cleanup);

describe('ParsingScreen', () => {
  it('marks step 2 current and step 1 checked while building', () => {
    render(
      <ParsingScreen step="building" providerLabel="Gemini" onCancel={() => {}} />,
    );

    const steps = screen.getAllByRole('listitem');
    expect(steps).toHaveLength(2);
    expect(steps[0]?.hasAttribute('aria-current')).toBe(false);
    expect(steps[1]?.getAttribute('aria-current')).toBe('step');
    expect(steps[0]?.querySelector('svg.lucide-check')).not.toBeNull();
  });

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn();
    render(
      <ParsingScreen step="reading" providerLabel="Gemini" onCancel={onCancel} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

function renderError(error: ParseError) {
  const handlers = {
    onRetry: vi.fn(),
    onDemo: vi.fn(),
    onOpenKey: vi.fn(),
    onHome: vi.fn(),
  };
  render(<ErrorScreen error={error} {...handlers} />);
  return handlers;
}

describe('ErrorScreen', () => {
  it('shows auth copy and opens the key modal for auth errors', () => {
    const handlers = renderError({
      kind: 'auth',
      message: 'The provider rejected the key.',
      status: 401,
    });

    expect(screen.getByText("That key didn't work")).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /check my key/i }));
    expect(handlers.onOpenKey).toHaveBeenCalledTimes(1);
  });

  it('hides Try again for too_large errors', () => {
    renderError({
      kind: 'too_large',
      message: 'That file is over the size limit.',
    });

    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull();
  });

  it('calls onRetry when Try again is clicked', () => {
    const handlers = renderError({
      kind: 'network',
      message: 'Could not reach the provider.',
    });

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(handlers.onRetry).toHaveBeenCalledTimes(1);
  });
});
