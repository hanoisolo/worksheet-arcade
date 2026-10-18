import type { Ref } from 'react';
import { WandSparkles } from 'lucide-react';

const ASSET = import.meta.env.BASE_URL + 'assets/';
export const BOSS_NAME = 'Goofy Slime';

function HpBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="w-full">
      <div className="mb-1 flex justify-between text-xs font-bold sm:text-sm">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        className="h-3 overflow-hidden rounded-full bg-bg/70"
      >
        <div className={'h-full rounded-full transition-all duration-500 ' + color} style={{ width: value + '%' }} />
      </div>
    </div>
  );
}

export interface BossArenaProps {
  bossHp: number;
  heroHp: number;
  mood: 'idle' | 'hit' | 'defeated';
  spellKey: number;
  attackKey: number;
  heroRef?: Ref<HTMLDivElement>;
}

export default function BossArena({ bossHp, heroHp, mood, spellKey, attackKey, heroRef }: BossArenaProps) {
  return (
    <div
      data-testid="boss-arena"
      className="relative mt-3 overflow-hidden rounded-2xl border-2 border-amber/30 bg-bg p-3 sm:p-4"
      style={{
        backgroundImage: 'url(' + ASSET + 'dungeon_bg.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="grid grid-cols-2 gap-3 rounded-xl bg-bg/70 p-2 sm:gap-6 sm:p-3">
        <HpBar label="Hero HP" value={heroHp} color={heroHp > 30 ? 'bg-cyan' : 'bg-pink'} />
        <HpBar label="Boss HP" value={bossHp} color="bg-lime" />
      </div>
      <div className="mt-3 flex h-44 items-end justify-between sm:h-56">
        <div
          ref={heroRef}
          className="relative mb-2 flex size-20 shrink-0 items-center justify-center rounded-full border-4 border-cyan bg-panel sm:size-24"
        >
          <WandSparkles className="size-10 text-cyan sm:size-12" aria-hidden="true" />
          <span className="sr-only">Your hero</span>
          {attackKey > 0 && (
            <span
              key={attackKey}
              aria-hidden="true"
              className="attack-flash pointer-events-none absolute inset-0 rounded-full bg-pink"
            />
          )}
        </div>
        <div className="relative flex flex-1 justify-end">
          <img
            src={ASSET + (mood === 'defeated' ? 'boss_defeated.png' : mood === 'hit' ? 'boss_hit.png' : 'boss_idle.png')}
            alt={BOSS_NAME + (mood === 'defeated' ? ', defeated' : mood === 'hit' ? ', hit by your spell' : '')}
            draggable={false}
            className={'w-40 select-none sm:w-56 ' + (mood === 'idle' ? 'boss-bob' : '')}
          />
          {spellKey > 0 && (
            <span
              key={spellKey}
              aria-hidden="true"
              className="spell-burst pointer-events-none absolute right-10 top-6 text-6xl sm:right-16 sm:text-7xl"
            >
              ✨
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
