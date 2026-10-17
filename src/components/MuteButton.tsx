import { useSyncExternalStore } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { isMuted, setMuted, subscribeMuted } from '../utils/soundFx';

export default function MuteButton() {
  const muted = useSyncExternalStore(subscribeMuted, isMuted, () => false);

  return (
    <button
      type="button"
      aria-label="Mute sound"
      aria-pressed={muted}
      title={muted ? 'Sound is off' : 'Sound is on'}
      onClick={() => setMuted(!muted)}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-cyan text-cyan transition-colors hover:bg-cyan/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan"
    >
      {muted ? (
        <VolumeX className="size-5" aria-hidden="true" />
      ) : (
        <Volume2 className="size-5" aria-hidden="true" />
      )}
    </button>
  );
}
