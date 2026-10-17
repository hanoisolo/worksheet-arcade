import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KeySettingsModal from './KeySettingsModal';

const onClose = vi.fn();
const onSaved = vi.fn();

function renderModal(open = true) {
  render(<KeySettingsModal open={open} onClose={onClose} onSaved={onSaved} />);
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  onClose.mockReset();
  onSaved.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('KeySettingsModal', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(
      <KeySettingsModal open={false} onClose={onClose} onSaved={onSaved} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('is a dialog named "AI provider & key"', () => {
    renderModal();
    expect(screen.getByRole('dialog', { name: 'AI provider & key' })).toBeInTheDocument();
  });

  it('warns the key stays in this browser and names the selected provider', async () => {
    const user = userEvent.setup();
    renderModal();
    expect(screen.getByText(/stays in this browser/)).toHaveTextContent(/gemini/i);
    await user.click(screen.getByRole('radio', { name: /openai/i }));
    expect(screen.getByText(/stays in this browser/)).toHaveTextContent(/openai/i);
  });

  it('disables Save while the key is empty', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /^save/i })).toBeDisabled();
  });

  it('saves to sessionStorage when Remember is unchecked', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.type(screen.getByLabelText(/api key/i), 'test-key-123');
    await user.click(screen.getByRole('button', { name: /^save/i }));
    expect(sessionStorage.getItem('wa.key.gemini')).toBe('test-key-123');
    expect(localStorage.getItem('wa.key.gemini')).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledWith('gemini');
  });

  it('saves to localStorage when Remember is checked', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('checkbox', { name: /remember/i }));
    await user.type(screen.getByLabelText(/api key/i), 'test-key-123');
    await user.click(screen.getByRole('button', { name: /^save/i }));
    expect(localStorage.getItem('wa.key.gemini')).toBe('test-key-123');
    expect(sessionStorage.getItem('wa.key.gemini')).toBeNull();
  });

  it('clears both storages on Forget key', async () => {
    const user = userEvent.setup();
    sessionStorage.setItem('wa.key.gemini', 'test-key-123');
    localStorage.setItem('wa.key.gemini', 'test-key-123');
    renderModal();
    await user.click(screen.getByRole('button', { name: /forget/i }));
    expect(sessionStorage.getItem('wa.key.gemini')).toBeNull();
    expect(localStorage.getItem('wa.key.gemini')).toBeNull();
  });

  it('calls onClose on Escape', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('toggles the key input type with show/hide', async () => {
    const user = userEvent.setup();
    renderModal();
    const input = screen.getByLabelText(/api key/i);
    expect(input).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: /show/i }));
    expect(input).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: /hide/i }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('stores the selected provider in localStorage on save', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('radio', { name: /mistral/i }));
    await user.type(screen.getByLabelText(/api key/i), 'test-key-123');
    await user.click(screen.getByRole('button', { name: /^save/i }));
    expect(localStorage.getItem('wa.provider')).toBe('mistral');
  });
});
