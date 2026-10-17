import { AlertTriangle } from 'lucide-react';
import type { ParseError } from '../types/game';

const HEADINGS: Record<ParseError['kind'], string> = {
  auth: "That key didn't work",
  quota: 'The AI is busy or out of credit',
  network: "Couldn't reach the AI",
  too_large: 'That file is too big',
  bad_output: "The AI's answer didn't fit",
  unsupported: "That file type isn't supported",
  cancelled: 'Cancelled',
};

export default function ErrorScreen({
  error,
  onRetry,
  onDemo,
  onOpenKey,
  onHome,
}: {
  error: ParseError;
  onRetry: () => void;
  onDemo: () => void;
  onOpenKey: () => void;
  onHome: () => void;
}) {
  const showRetry = error.kind !== 'unsupported' && error.kind !== 'too_large';
  const showKey = error.kind === 'auth' || error.kind === 'quota';

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-8">
      <section className="w-full max-w-md rounded-2xl bg-panel p-6 text-ink">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-8 w-8 shrink-0 text-amber" aria-hidden />
          <div className="min-w-0">
            <h2 className="text-2xl font-bold">{HEADINGS[error.kind]}</h2>
            <p className="mt-2 break-words text-sm leading-relaxed text-ink/85">{error.message}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {showRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="min-h-11 rounded-2xl bg-lime px-5 text-base font-bold text-bg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan"
            >
              Try again
            </button>
          )}
          {showKey && (
            <button
              type="button"
              onClick={onOpenKey}
              className="min-h-11 rounded-2xl border border-cyan px-5 text-base font-bold text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan"
            >
              Check my key
            </button>
          )}
          <button
            type="button"
            onClick={onDemo}
            className="min-h-11 rounded-2xl border border-pink px-5 text-base font-bold text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan"
          >
            Play the demo instead
          </button>
          <button
            type="button"
            onClick={onHome}
            className="min-h-11 rounded-2xl px-5 text-base font-bold text-ink/85 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan"
          >
            Start over
          </button>
        </div>
      </section>
    </div>
  );
}
