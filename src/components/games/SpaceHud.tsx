import type { Ref } from 'react';

interface SpaceHudProps {
  index: number;
  total: number;
  score: number;
  shield: number;
  question: string;
  questionId: string;
  headingRef?: Ref<HTMLHeadingElement>;
}

export default function SpaceHud({
  index,
  total,
  score,
  shield,
  question,
  questionId,
  headingRef,
}: SpaceHudProps) {
  return (
    <div className="rounded-2xl bg-panel p-3 text-left sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="mr-auto text-lg font-extrabold text-ink outline-none sm:text-xl"
        >
          Space Blaster
        </h2>
        <span className="rounded-full bg-bg/60 px-3 py-1 text-xs font-bold sm:text-sm">
          Question {index + 1}/{total}
        </span>
        <span className="rounded-full bg-bg/60 px-3 py-1 text-xs font-bold text-amber sm:text-sm">
          Score: {score}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs font-bold sm:text-sm">
        <span>Shield</span>
        <div
          role="progressbar"
          aria-label="Shield"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={shield}
          className="h-3 flex-1 overflow-hidden rounded-full bg-bg/70"
        >
          <div
            className={'h-full rounded-full transition-all duration-300 ' + (shield > 40 ? 'bg-cyan' : 'bg-pink')}
            style={{ width: shield + '%' }}
          />
        </div>
        <span className="w-10 text-right">{shield}%</span>
      </div>
      <p id={questionId} className="mt-3 text-lg font-extrabold text-ink sm:text-2xl">
        {question}
      </p>
    </div>
  );
}
