import { Check, Loader2, X } from 'lucide-react';
import type { ParseStep } from '../types/game';

const STEPS: { key: ParseStep; label: string }[] = [
  { key: 'reading', label: 'Reading worksheet (1/2)' },
  { key: 'building', label: 'Building games (2/2)' },
];

export default function ParsingScreen({
  step,
  providerLabel,
  onCancel,
}: {
  step: ParseStep;
  providerLabel: string;
  onCancel: () => void;
}) {
  const currentIndex = STEPS.findIndex((s) => s.key === step);
  const currentLabel = STEPS[currentIndex]?.label ?? '';

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-8">
      <section className="w-full max-w-sm rounded-2xl bg-panel p-6 text-ink shadow-lg">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2
            className="size-10 animate-spin text-cyan"
            aria-hidden="true"
          />
          <h2 className="text-xl font-bold">Building your games…</h2>
          <p className="text-sm text-ink/85">
            Using {providerLabel}. This can take up to a minute.
          </p>
        </div>

        <ol className="mt-6 flex flex-col gap-2">
          {STEPS.map((s, i) => {
            const done = i < currentIndex;
            const current = i === currentIndex;
            return (
              <li
                key={s.key}
                aria-current={current ? 'step' : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-2xl px-4 py-2 text-sm font-bold ${
                  current
                    ? 'bg-cyan/15 text-cyan'
                    : done
                      ? 'bg-lime/15 text-lime'
                      : 'text-ink/85'
                }`}
              >
                {done ? (
                  <Check className="size-5 shrink-0" aria-hidden="true" />
                ) : current ? (
                  <Loader2
                    className="size-5 shrink-0 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <span
                    className="size-5 shrink-0 rounded-full border-2 border-ink/30"
                    aria-hidden="true"
                  />
                )}
                <span>{s.label}</span>
              </li>
            );
          })}
        </ol>

        <p role="status" aria-live="polite" className="sr-only">
          {currentLabel}
        </p>

        <button
          type="button"
          onClick={onCancel}
          className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-cyan/40 bg-panel text-sm font-bold text-ink transition-colors hover:bg-cyan/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan"
        >
          <X className="size-5" aria-hidden="true" />
          Cancel
        </button>
      </section>
    </div>
  );
}
