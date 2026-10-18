import type { CSSProperties, Ref } from 'react';

const LANES = [12.5, 37.5, 62.5, 87.5];
const DELAYS = [0, -9, -4.5, -13.5];
const STILL_TOP = ['8%', '40%', '22%', '54%'];
const ASSET = import.meta.env.BASE_URL + 'assets/';

type AsteroidFieldProps = {
  options: string[];
  tried: string[];
  hitOption: string | null;
  paused: boolean;
  questionId: string;
  onPick: (option: string) => void;
  fieldRef?: Ref<HTMLDivElement>;
};

export default function AsteroidField({
  options,
  tried,
  hitOption,
  paused,
  questionId,
  onPick,
  fieldRef,
}: AsteroidFieldProps) {
  return (
    <div
      ref={fieldRef}
      role="group"
      aria-labelledby={questionId}
      data-paused={paused ? 'true' : 'false'}
      data-testid="asteroid-field"
      className="asteroid-field relative mt-3 h-80 w-full overflow-hidden rounded-2xl border-2 border-cyan/30 bg-bg sm:h-96"
      style={{ backgroundImage: 'url(' + ASSET + 'space_bg.webp)', backgroundSize: 'cover' }}
    >
      {options.map((option, i) => {
        const n = i + 1;
        const isTried = tried.includes(option);
        const isHit = hitOption === option;
        return (
          <button
            key={option + i}
            type="button"
            className="asteroid flex aspect-square w-[23%] max-w-36 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan disabled:cursor-not-allowed"
            style={{ left: LANES[i] + '%', top: STILL_TOP[i], animationDelay: DELAYS[i] + 's' } as CSSProperties}
            data-testid="asteroid"
            data-option={option}
            data-state={isHit ? 'hit' : isTried ? 'tried' : 'live'}
            aria-label={'Answer ' + n + ': ' + option + (isTried ? ', already tried' : '')}
            disabled={isTried || (hitOption !== null && !isHit)}
            onClick={() => onPick(option)}
          >
            <img
              src={ASSET + 'asteroid_target.png'}
              alt=""
              draggable={false}
              className={
                'pointer-events-none absolute inset-0 size-full object-contain ' +
                (isHit ? 'asteroid-boom' : '') +
                (isTried ? ' opacity-30 grayscale' : '')
              }
            />
            {isHit && (
              <span aria-hidden="true" className="absolute text-5xl">
                💥
              </span>
            )}
            <span
              className={
                'relative max-w-full break-words rounded-xl bg-bg/85 px-1.5 py-1 text-xs font-extrabold leading-tight text-ink sm:px-2 sm:text-sm ' +
                (isHit ? 'opacity-0' : '') +
                (isTried ? ' line-through opacity-60' : '')
              }
            >
              {option}
            </span>
            <span
              aria-hidden="true"
              className="absolute left-[14%] top-[14%] ring-2 ring-bg flex size-6 items-center justify-center rounded-full bg-cyan text-xs font-extrabold text-bg"
            >
              {n}
            </span>
          </button>
        );
      })}
      {hitOption !== null && options.indexOf(hitOption) >= 0 && (
        <div
          aria-hidden="true"
          className="laser-beam pointer-events-none absolute bottom-[14%] top-0 w-1 -translate-x-1/2 rounded-full bg-cyan shadow-[0_0_12px_4px_rgba(34,211,238,0.7)]"
          style={{ left: LANES[options.indexOf(hitOption)] + '%' }}
        />
      )}
      <img
        src={ASSET + 'space_ship.png'}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute bottom-1 left-1/2 z-10 w-16 -translate-x-1/2 sm:w-20"
      />
    </div>
  );
}
