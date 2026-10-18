import type { Ref } from 'react';

interface SpellChoicesProps {
  options: string[];
  tried: string[];
  correct: string | null;
  locked: boolean;
  questionId: string;
  onPick: (option: string) => void;
  groupRef?: Ref<HTMLDivElement>;
}

export default function SpellChoices({
  options,
  tried,
  correct,
  locked,
  questionId,
  onPick,
  groupRef,
}: SpellChoicesProps) {
  return (
    <div
      ref={groupRef}
      role="group"
      aria-labelledby={questionId}
      className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3"
    >
      {options.map((option, i) => {
        const n = i + 1;
        const isTried = tried.includes(option);
        const isCorrect = correct === option;
        return (
          <button
            key={option + i}
            type="button"
            data-testid="spell"
            data-option={option}
            data-state={isCorrect ? 'hit' : isTried ? 'tried' : 'live'}
            disabled={isTried || locked}
            aria-label={'Spell ' + n + ': ' + option + (isTried ? ', already tried' : '')}
            onClick={() => onPick(option)}
            className={
              'flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 px-4 py-2 text-left text-base font-extrabold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan disabled:cursor-not-allowed ' +
              (isCorrect
                ? 'border-lime bg-lime/20 text-lime'
                : isTried
                  ? 'border-ink/20 bg-panel/60 text-ink/60 line-through'
                  : 'border-amber/60 bg-panel text-ink hover:border-amber hover:bg-amber/10')
            }
          >
            <span
              aria-hidden="true"
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber text-sm font-extrabold text-bg"
            >
              {n}
            </span>
            <span className="min-w-0 break-words">{option}</span>
          </button>
        );
      })}
    </div>
  );
}
