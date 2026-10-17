import { useRef, useState } from "react";
import { Gamepad2, KeyRound } from "lucide-react";
import type { ProviderId } from "./types/game";
import { PROVIDERS } from "./config/providers";
import KeySettingsModal from "./components/KeySettingsModal";
import { getKey, getProvider } from "./state/keyStore";

export default function App() {
  const keyButtonRef = useRef<HTMLButtonElement>(null);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [provider, setProvider] = useState<ProviderId>(() => getProvider());
  const [hasKey, setHasKey] = useState(() => getKey(getProvider()) !== "");

  const refreshKeyState = () => {
    const nextProvider = getProvider();
    setProvider(nextProvider);
    setHasKey(getKey(nextProvider) !== "");
  };

  const closeKeyModal = () => {
    setKeyModalOpen(false);
    refreshKeyState();
    keyButtonRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="flex items-center gap-2 sm:gap-3 bg-panel px-4 sm:px-6 py-4 shadow-lg">
        <Gamepad2 className="size-7 shrink-0 sm:size-8 text-pink" aria-hidden="true" />
        <span className="whitespace-nowrap text-xl font-extrabold tracking-tight sm:text-2xl">
          Worksheet <span className="text-pink">Arcade</span>
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            ref={keyButtonRef}
            type="button"
            onClick={() => setKeyModalOpen(true)}
            aria-label={`AI key settings: ${PROVIDERS[provider].label}, ${
              hasKey ? "Key saved" : "No key yet"
            }`}
            className="inline-flex min-h-11 min-w-11 items-center gap-2 rounded-full border border-cyan px-3 text-sm font-semibold text-cyan transition-colors hover:bg-cyan/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan"
          >
            <KeyRound className="size-5" aria-hidden="true" />
            <span className="hidden sm:inline">{PROVIDERS[provider].label}</span>
          </button>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-bold whitespace-nowrap ${
              hasKey
                ? "border-lime/40 bg-lime/15 text-lime"
                : "border-amber/40 bg-amber/15 text-amber"
            }`}
          >
            {hasKey ? "Key ✓" : "Add key"}
          </span>
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-16 text-center">
        <h1 className="text-4xl font-extrabold sm:text-5xl">
          Turn any worksheet into <span className="text-cyan">games</span>
        </h1>
        <p className="max-w-xl text-lg text-ink/80">
          Upload a worksheet, pick an AI, and play three mini-games built from
          it.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href="#upload"
            className="inline-flex h-14 items-center rounded-full bg-pink px-8 text-lg font-bold text-bg transition-colors hover:bg-amber focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan"
          >
            Get started
          </a>
          <a
            href="#how-it-works"
            className="inline-flex h-14 items-center rounded-full border-2 border-cyan px-8 text-lg font-bold text-cyan transition-colors hover:bg-panel focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan"
          >
            How it works
          </a>
        </div>
      </main>
      <KeySettingsModal
        open={keyModalOpen}
        onClose={closeKeyModal}
        onSaved={refreshKeyState}
      />
    </div>
  );
}
