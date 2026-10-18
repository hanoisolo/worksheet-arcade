import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { ArrowLeft, RotateCcw, Star, CheckCircle2 } from 'lucide-react';
import Confetti from './Confetti';
import type { Mistake } from './games/spaceBlasterLogic';

interface MistakeGroup {
  levelId: number;
  question: string;
  correctAnswer: string;
  explanation: string;
  picked: string[];
}

interface VictoryReviewProps {
  title: string;
  subtitle: string;
  stars: 1 | 2 | 3;
  stats: string;
  mistakes: Mistake[];
  art?: ReactNode;
  onPlayAgain: () => void;
  onBack: () => void;
}

export default function VictoryReview({
  title,
  subtitle,
  stars,
  stats,
  mistakes,
  art,
  onPlayAgain,
  onBack,
}: VictoryReviewProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const groups = useMemo<MistakeGroup[]>(() => {
    const byLevel = new Map<number, MistakeGroup>();
    for (const m of mistakes) {
      const existing = byLevel.get(m.levelId);
      if (existing) {
        if (!existing.picked.includes(m.picked)) {
          existing.picked.push(m.picked);
        }
        continue;
      }
      byLevel.set(m.levelId, {
        levelId: m.levelId,
        question: m.question,
        correctAnswer: m.correctAnswer,
        explanation: m.explanation,
        picked: [m.picked],
      });
    }
    return [...byLevel.values()];
  }, [mistakes]);

  return (
    <section data-testid="victory-review" className="relative rounded-2xl bg-panel p-6 text-center sm:p-10">
      <Confetti />
      {art}
      <h2 ref={headingRef} tabIndex={-1} className="mt-2 text-3xl font-extrabold text-ink outline-none">
        {title}
      </h2>
      <p className="mt-1 text-xl font-extrabold text-amber">{subtitle}</p>
      <div role="img" aria-label={stars + ' of 3 stars'} className="mt-3 flex justify-center gap-2">
        {[1, 2, 3].map((i) => (
          <Star
            key={i}
            aria-hidden="true"
            className={'size-10 ' + (i <= stars ? 'fill-amber text-amber' : 'text-ink/30')}
          />
        ))}
      </div>
      <p className="mt-2 text-ink/90">{stats}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onPlayAgain}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-pink px-6 text-sm font-extrabold text-bg transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Play again
        </button>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border-2 border-cyan/50 px-6 text-sm font-bold text-ink transition hover:border-cyan focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to games
        </button>
      </div>
      <div className="mt-8 text-left">
        {groups.length === 0 ? (
          <p className="flex items-center gap-2 rounded-2xl border-2 border-lime/50 bg-lime/10 p-4 font-bold text-lime">
            <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
            Perfect run: no mistakes to review!
          </p>
        ) : (
          <>
            <h3 className="text-lg font-extrabold text-ink">Let&apos;s review ({groups.length})</h3>
            <p className="text-sm text-ink/80">These questions took more than one try. Here&apos;s how they work.</p>
            <ol className="mt-3 space-y-3">
              {groups.map((g) => (
                <li key={g.levelId} data-testid="review-item" className="rounded-2xl border-2 border-amber/40 bg-bg/40 p-4">
                  <p className="font-extrabold text-ink">{g.question}</p>
                  <p className="mt-1 text-sm text-ink/85">
                    You tried: <span className="line-through">{g.picked.join(', ')}</span>
                  </p>
                  <p className="mt-1 text-sm font-bold text-lime">Correct answer: {g.correctAnswer}</p>
                  <p className="mt-1 text-sm text-ink/90">{g.explanation}</p>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </section>
  );
}
