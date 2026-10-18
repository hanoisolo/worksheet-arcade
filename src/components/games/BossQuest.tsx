import type { GamePayload } from '../../types/game';
import { initialQuest, isFinalBlow, makeQuestReducer, starsFor } from './questLogic';
import BossArena, { BOSS_NAME } from './BossArena';
import SpellChoices from './SpellChoices';
import { playSfx } from '../../utils/soundFx';
import { prefersReducedMotion } from '../../utils/motion';
import Confetti from '../Confetti';
import { ArrowLeft, Lightbulb, RotateCcw, Sparkles, Star, Swords } from 'lucide-react';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

const QUESTION_ID = 'quest-question';
const ASSET = import.meta.env.BASE_URL + 'assets/';
const primaryButtonClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-pink px-6 text-sm font-extrabold text-bg transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan';

type Props = {
  payload: GamePayload;
  onBack: () => void;
};

export default function BossQuest({ payload, onBack }: Props) {
  const levels = payload.levels;
  const reducer = useMemo(() => makeQuestReducer(levels), [levels]);
  const [state, dispatch] = useReducer(reducer, undefined, initialQuest);
  const level = levels[state.index];
  const [spellKey, setSpellKey] = useState(0);
  const [attackKey, setAttackKey] = useState(0);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const endRef = useRef<HTMLHeadingElement>(null);

  const pick = useCallback(
    (option: string) => {
      if (state.phase !== 'aim' || !level || state.tried.includes(option)) return;
      if (option === level.correctAnswer) {
        playSfx('correct');
        setSpellKey(k => k + 1);
      } else {
        playSfx('hit');
        setAttackKey(k => k + 1);
        if (!prefersReducedMotion()) {
          heroRef.current?.animate?.(
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
    [state.phase, state.tried, level],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
      const n = Number(e.key);
      if (state.phase === 'aim' && level && n >= 1 && n <= level.options.length) {
        e.preventDefault();
        pick(level.options[n - 1]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.phase, level, pick]);

  useEffect(() => {
    if (state.phase === 'hit') {
      nextRef.current?.focus();
    } else if (state.phase === 'won') {
      playSfx('win');
      endRef.current?.focus();
    }
  }, [state.phase]);

  useEffect(() => {
    if (state.phase === 'aim' && state.tried.length === 0) headingRef.current?.focus();
  }, [state.index, state.phase, state.tried.length]);

  useEffect(() => {
    if (state.phase !== 'aim' || !state.lastWrong || !level) return;
    const buttons = Array.from(
      groupRef.current?.querySelectorAll<HTMLButtonElement>('[data-testid="spell"]') ?? [],
    );
    const start = level.options.indexOf(state.lastWrong);
    for (let k = 1; k <= buttons.length; k++) {
      const b = buttons[(start + k) % buttons.length];
      if (b && !b.disabled) {
        b.focus();
        break;
      }
    }
  }, [state.phase, state.lastWrong, state.tried.length, level]);

  const restart = () => {
    dispatch({ type: 'RESTART' });
    setSpellKey(0);
    setAttackKey(0);
  };

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
      <div className="mx-auto w-full max-w-3xl px-1 sm:px-4">
        <section className="rounded-2xl bg-panel p-6 text-center">
          <h2 className="text-2xl font-extrabold">Boss Quest</h2>
          <p className="mt-2 text-ink/90">
            This worksheet doesn&apos;t have any questions for Boss Quest.
          </p>
          <div className="mt-6 flex justify-center">{backButton}</div>
        </section>
      </div>
    );
  }

  if (state.phase === 'won') {
    const stars = starsFor(state.firstTry, state.answered);
    return (
      <div className="mx-auto w-full max-w-3xl px-1 sm:px-4">
        <section className="relative rounded-2xl bg-panel p-6 text-center sm:p-10">
          <Confetti />
          <img
            src={ASSET + (state.bossHp === 0 ? 'boss_defeated.png' : 'boss_idle.png')}
            alt={BOSS_NAME + (state.bossHp === 0 ? ', defeated' : '')}
            className="mx-auto w-28 sm:w-36"
          />
          <h2 ref={endRef} tabIndex={-1} className="mt-2 text-3xl font-extrabold outline-none">
            Victory!
          </h2>
          <p className="mt-1 text-lg text-ink/90">
            {state.bossHp === 0
              ? 'You defeated the ' + BOSS_NAME + '!'
              : 'The ' + BOSS_NAME + ' ran away to practice!'}
          </p>
          <div
            role="img"
            aria-label={stars + ' of 3 stars'}
            className="mt-3 flex justify-center gap-2"
          >
            {[1, 2, 3].map(i => (
              <Star
                key={i}
                aria-hidden="true"
                className={'size-10 ' + (i <= stars ? 'fill-amber text-amber' : 'text-ink/30')}
              />
            ))}
          </div>
          <p className="mt-2 text-ink/90">
            {state.firstTry} of {state.answered} on the first try · Hero HP {state.heroHp}%
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={restart} className={primaryButtonClass}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Play again
            </button>
            {backButton}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-1 sm:px-4">
      <div className="rounded-2xl bg-panel p-3 text-left sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="mr-auto text-lg font-extrabold outline-none sm:text-xl"
          >
            Boss Quest
          </h2>
          <span className="rounded-full bg-bg/60 px-3 py-1 text-xs font-bold sm:text-sm">
            Question {state.index + 1}/{levels.length}
          </span>
        </div>
        <p id={QUESTION_ID} className="mt-2 text-lg font-extrabold sm:text-2xl">
          {level.question}
        </p>
      </div>
      <BossArena
        bossHp={state.bossHp}
        heroHp={state.heroHp}
        mood={state.phase === 'hit' ? (state.bossHp === 0 ? 'defeated' : 'hit') : 'idle'}
        spellKey={spellKey}
        attackKey={attackKey}
        heroRef={heroRef}
      />
      <SpellChoices
        options={level.options}
        tried={state.tried}
        correct={state.phase === 'hit' ? level.correctAnswer : null}
        locked={state.phase !== 'aim'}
        questionId={QUESTION_ID}
        onPick={pick}
        groupRef={groupRef}
      />
      <div aria-live="polite" className="mt-3 min-h-20 text-left">
        {state.phase === 'hit' ? (
          <div className="rounded-2xl border-2 border-lime/60 bg-lime/10 p-4">
            <p className="flex items-center gap-2 font-extrabold text-lime">
              <Sparkles className="size-5" aria-hidden="true" />
              {state.bossHp === 0
                ? 'Final blow! The ' + BOSS_NAME + ' is defeated!'
                : 'Your spell hit! −25 boss HP'}
            </p>
            <p className="mt-1 text-sm text-ink/90">{level.explanation}</p>
            <div className="mt-3 flex justify-end">
              <button
                ref={nextRef}
                type="button"
                onClick={() => dispatch({ type: 'NEXT' })}
                className={primaryButtonClass}
              >
                {isFinalBlow(state, levels.length) ? 'Claim victory' : 'Next question'}
              </button>
            </div>
          </div>
        ) : state.lastWrong ? (
          <div className="rounded-2xl border-2 border-amber/60 bg-amber/10 p-4">
            <p className="flex items-center gap-2 font-extrabold text-amber">
              <Swords className="size-5 shrink-0" aria-hidden="true" />
              {state.heroHp > 0
                ? 'The ' + BOSS_NAME + ' bonks you! −15 hero HP. Try another spell!'
                : 'The ' + BOSS_NAME + ' bonks you, but heroes never give up. Try another spell!'}
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
            Pick a spell: tap or click it, or press 1–4. No rush!
          </p>
        )}
      </div>
      <div className="mt-4 flex justify-center">{backButton}</div>
    </div>
  );
}
