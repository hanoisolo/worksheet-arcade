import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import {
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  ShieldAlert,
  X,
} from 'lucide-react';
import type { ProviderId } from '../types/game';
import { PROVIDERS, PROVIDER_IDS } from '../config/providers';
import {
  forgetKey,
  getKey,
  getProvider,
  isRemembered,
  saveKey,
  setProvider,
} from '../state/keyStore';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export default function KeySettingsModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: (p: ProviderId) => void;
}) {
  const [provider, setProviderState] = useState<ProviderId>(() => getProvider());
  const [key, setKey] = useState('');
  const [remember, setRemember] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstRadioRef = useRef<HTMLInputElement>(null);
  const uid = useId();
  const titleId = `${uid}-title`;
  const warningId = `${uid}-warning`;
  const keyInputId = `${uid}-key`;

  useEffect(() => {
    if (!open) return;
    const p = getProvider();
    setProviderState(p);
    setKey(getKey(p) ?? '');
    setRemember(isRemembered(p));
    setShowKey(false);
    firstRadioRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const config = PROVIDERS[provider];

  function handleProviderChange(p: ProviderId) {
    setProviderState(p);
    setKey(getKey(p) ?? '');
    setRemember(isRemembered(p));
    setShowKey(false);
  }

  function handleSave() {
    if (!key.trim()) return;
    setProvider(provider);
    saveKey(provider, key, remember);
    onSaved?.(provider);
    onClose();
  }

  function handleForget() {
    forgetKey(provider);
    setKey('');
  }

  function handleOverlayMouseDown(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((el) => el.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (e.shiftKey) {
      if (active === first || !dialog.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else if (active === last || !dialog.contains(active)) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={handleOverlayMouseDown}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={warningId}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border-2 border-cyan/40 bg-panel p-6 text-ink shadow-[0_0_48px_rgba(34,211,238,0.25)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 inline-flex size-11 items-center justify-center rounded-2xl text-ink/85 transition-colors hover:bg-ink/10 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan"
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        <div className="space-y-5">
          <h2
            id={titleId}
            className="flex items-center gap-2 pr-12 text-2xl font-black tracking-wide"
          >
            <KeyRound className="size-6 shrink-0 text-cyan" aria-hidden="true" />
            AI provider & key
          </h2>

          <fieldset>
            <legend className="mb-2 block text-xs font-black uppercase tracking-widest text-ink/85">
              Choose your AI
            </legend>
            <div className="space-y-3">
              {PROVIDER_IDS.map((p, i) => {
                const cfg = PROVIDERS[p];
                const selected = provider === p;
                return (
                  <label key={p} className="block cursor-pointer">
                    <input
                      ref={i === 0 ? firstRadioRef : undefined}
                      type="radio"
                      name="provider"
                      value={p}
                      checked={selected}
                      onChange={() => handleProviderChange(p)}
                      className="peer sr-only"
                    />
                    <div
                      className={`flex items-center justify-between gap-3 rounded-2xl border-2 bg-bg p-4 transition peer-focus-visible:ring-4 peer-focus-visible:ring-cyan ${
                        selected
                          ? 'border-cyan shadow-[0_0_24px_rgba(34,211,238,0.4)]'
                          : 'border-ink/20 hover:border-cyan/60 hover:shadow-[0_0_16px_rgba(34,211,238,0.2)]'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-bold">{cfg.label}</span>
                        <span className="mt-1 block font-mono text-xs text-ink/85">
                          {cfg.model}
                        </span>
                      </span>
                      {selected && (
                        <Check className="size-6 shrink-0 text-cyan" aria-hidden="true" />
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <a
            href={config.keyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-1 font-bold text-cyan underline underline-offset-4 transition-colors hover:text-pink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan"
          >
            Get a key
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>

          <div>
            <label
              htmlFor={keyInputId}
              className="mb-2 block text-xs font-black uppercase tracking-widest text-ink/85"
            >
              API key
            </label>
            <div className="relative">
              <input
                id={keyInputId}
                type={showKey ? 'text' : 'password'}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="Paste your API key"
                className="min-h-[44px] w-full rounded-2xl border-2 border-ink/20 bg-bg py-3 pl-4 pr-14 text-ink placeholder:text-ink/50 focus-visible:border-cyan focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? 'Hide key' : 'Show key'}
                aria-pressed={showKey}
                className="absolute right-2 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-2xl text-ink/85 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan"
              >
                {showKey ? (
                  <EyeOff className="size-5" aria-hidden="true" />
                ) : (
                  <Eye className="size-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-cyan focus-visible:ring-4 focus-visible:ring-cyan"
            />
            <span>
              <span className="block font-bold">Remember on this device</span>
              <span className="mt-0.5 block text-sm text-ink/85">
                Off: the key is cleared when you close this tab.
              </span>
            </span>
          </label>

          <div
            id={warningId}
            className="flex gap-3 rounded-2xl border-2 border-amber bg-amber/10 p-4"
          >
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-ink/85">
              {`Your key stays in this browser and is sent only to ${config.label}. Don't use this on a shared computer: browser extensions can read saved keys. Use a key with a spending limit.`}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleSave}
              disabled={!key.trim()}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-2xl bg-pink px-6 font-black uppercase tracking-wide text-bg transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleForget}
              className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border-2 border-ink/30 px-6 font-bold text-ink/85 transition-colors hover:border-pink hover:text-pink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan"
            >
              Forget key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
