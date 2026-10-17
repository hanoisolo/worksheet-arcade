import type { GamePayload } from '../../types/game';
import { initialBlaster, makeBlasterReducer } from './spaceBlasterLogic';
import SpaceHud from './SpaceHud';
import AsteroidField from './AsteroidField';
import { playSfx } from '../../utils/soundFx';
import { prefersReducedMotion } from '../../utils/motion';
import Confetti from '../Confetti';
import { ArrowLeft, RotateCcw, Trophy, ShieldAlert, Lightbulb, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

const QUESTION_ID = 'blaster-question';

const primaryButtonClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-pink px-6 text-sm font-extrabold text-bg transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan';

type Props = {
  payload: GamePayload;
  onBack: () => void;
};

export default function SpaceBlaster({ payload, onBack }: Props) {
  const levels = payload.levels;
  const reducer = useMemo(() => makeBlasterReducer(levels), [levels]);
  const [state, dispatch] = useReducer(reducer, undefined, initialBlaster);
  const level = levels[state.index];

  const headingRef = useRef<HTMLHeadingElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const endRef = useRef<HTMLHeadingElement>(null);

  const pick = useCallback(
    (option: string) => {
      if (state.phase !== 'aim' || state.tried.includes(option) || !level) return;
      if (option === level.correctAnswer) {
        playSfx('laser');
      } else {
        playSfx('wrong');
        if (!prefersReducedMotion()) {
          fieldRef.current?.animate?.(
            [
              { transform: 'translateX(0)' },
              { transform: 'translateX(-10px)' },
              { transform: 'translateX(10px)' },
              { transform: 'translateX(-6px)' },
              { transform: 'translateX(0)' },
            ],
            { duration: 400 },
          );
        }
      }
      dispatch({ type: 'PICK', option });
    },
    [state, level],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
      const n = Number(e.key);
      if (state.phase === 'aim' && level && n >= 1 && n <= level.options.length) {
        e.preventDefault();
        pick(level.options[n - 1]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state, level, pick]);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    if (state.phase === 'hit') {
      nextRef.current?.focus();
    } else if (state.phase === 'won') {
      playSfx('win');
      endRef.current?.focus();
    } else if (state.phase === 'lost') {
      playSfx('hit');
      endRef.current?.focus();
    }
  }, [state.phase]);

  useEffect(() => {
    if (state.phase === 'aim' && state.tried.length === 0) {
      headingRef.current?.focus();
    }
  }, [state.index, state.phase, state.tried.length]);

  const backButton = (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border-2 border-cyan/50 px-6 text-sm font-bold text-ink transition hover:border-cyan focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Back to games
    </button>
  );

  if (levels.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl overflow-x-clip px-1 sm:px-4">
        <section className="rounded-2xl bg-panel p-6 text-center">
          <h2 className="text-2xl font-extrabold">Space Blaster</h2>
          <p className="mt-2 text-ink/90">
            This worksheet doesn&apos;t have any questions for Space Blaster.
          </p>
          <div className="mt-6 flex justify-center">{backButton}</div>
        </section>
      </div>
    );
  }

  if (state.phase === 'won') {
    return (
      <div className="mx-auto w-full max-w-3xl overflow-x-clip px-1 sm:px-4">
        <section className="relative rounded-2xl bg-panel p-6 text-center sm:p-10">
          <Confetti />
          <Trophy className="mx-auto size-14 text-amber" aria-hidden="true" />
          <h2 ref={endRef} tabIndex={-1} className="mt-4 text-3xl font-extrabold outline-none">
            Mission complete!
          </h2>
          <p className="mt-2 text-2xl font-extrabold text-amber">Score: {state.score}</p>
          <p className="mt-1 text-ink/90">
            {state.firstTry} of {levels.length} on the first try · Shield {state.shield}%
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => dispatch({ type: 'RESTART' })} className={primaryButtonClass}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Play again
            </button>
            {backButton}
          </div>
        </section>
      </div>
    );
  }

  if (state.phase === 'lost') {
    return (
      <div className="mx-auto w-full max-w-3xl overflow-x-clip px-1 sm:px-4">
        <section className="rounded-2xl bg-panel p-6 text-center sm:p-10">
          <ShieldAlert className="mx-auto size-14 text-pink" aria-hidden="true" />
          <h2 ref={endRef} tabIndex={-1} className="mt-4 text-3xl font-extrabold outline-none">
            Shields down!
          </h2>
          <p className="mt-2 text-2xl font-extrabold text-amber">Score: {state.score}</p>
          <p className="mt-1 text-ink/90">Every pilot needs practice. Want another go?</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => dispatch({ type: 'RESTART' })} className={primaryButtonClass}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Try again
            </button>
            {backButton}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl overflow-x-clip px-1 sm:px-4">
      <SpaceHud
        index={state.index}
        total={levels.length}
        score={state.score}
        shield={state.shield}
        question={level.question}
        questionId={QUESTION_ID}
        headingRef={headingRef}
      />
      <AsteroidField
        options={level.options}
        tried={state.tried}
        hitOption={state.phase === 'hit' ? level.correctAnswer : null}
        paused={state.phase !== 'aim'}
        questionId={QUESTION_ID}
        onPick={pick}
        fieldRef={fieldRef}
      />
      <div aria-live="polite" className="mt-3 min-h-20">
        {state.phase === 'hit' ? (
          <div className="rounded-2xl border-2 border-lime/60 bg-lime/10 p-4 text-left">
            <p className="flex items-center gap-2 font-extrabold text-lime">
              <Sparkles className="size-5" aria-hidden="true" />
              Direct hit! +100
            </p>
            <p className="mt-1 text-sm text-ink/90">{level.explanation}</p>
            <div className="mt-3 flex justify-end">
              <button
                ref={nextRef}
                type="button"
                onClick={() => dispatch({ type: 'NEXT' })}
                className={primaryButtonClass}
              >
                {state.index + 1 >= levels.length ? 'See results' : 'Next question'}
              </button>
            </div>
          </div>
        ) : state.lastWrong ? (
          <div className="rounded-2xl border-2 border-amber/60 bg-amber/10 p-4 text-left">
            <p className="flex items-center gap-2 font-extrabold text-amber">
              <ShieldAlert className="size-5" aria-hidden="true" />
              Shield −20. Not quite — try another asteroid!
            </p>
            <p className="mt-1 flex gap-2 text-sm text-ink/90">
              <Lightbulb className="size-4 shrink-0 text-amber" aria-hidden="true" />
              <span>
                <span className="font-bold">Hint:</span> {level.hint}
              </span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink/80">
            Tap or click an asteroid, or press 1–4. Asteroids keep coming back, so take your time.
          </p>
        )}
      </div>
      <div className="mt-4 flex justify-center">{backButton}</div>
    </div>
  );
}
