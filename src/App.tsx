import { useEffect, useReducer, useRef, useState } from "react";
import { Gamepad2, KeyRound } from "lucide-react";
import type { ParseStep, ProviderId, WorksheetFile } from "./types/game";
import { PROVIDERS } from "./config/providers";
import KeySettingsModal from "./components/KeySettingsModal";
import WorksheetUploader from "./components/WorksheetUploader";
import ParsingScreen from "./components/ParsingScreen";
import ErrorScreen from "./components/ErrorScreen";
import ReadyScreen, { GAMES } from "./components/ReadyScreen";
import GamePlaceholder from "./components/GamePlaceholder";
import MemoryMatch from "./components/games/MemoryMatch";
import MuteButton from "./components/MuteButton";
import { appReducer, initialState } from "./state/appMachine";
import type { AppState, GameId } from "./state/appMachine";
import { parseWorksheet } from "./services/adapter";
import { SAMPLE_PAYLOAD } from "./mock/sampleData";
import { getKey, getProvider } from "./state/keyStore";

export default function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, initialState);
  const keyButtonRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const autoStartRef = useRef(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [provider, setProvider] = useState<ProviderId>(() => getProvider());
  const [hasKey, setHasKey] = useState(() => getKey(getProvider()) !== "");

  const refreshKeyState = () => {
    const nextProvider = getProvider();
    setProvider(nextProvider);
    setHasKey(getKey(nextProvider) !== "");
  };

  const startParse = async (file: WorksheetFile) => {
    dispatch({ type: "START_PARSE" });
    const controller = new AbortController();
    abortRef.current = controller;
    const provider = getProvider();
    try {
      const result = await parseWorksheet(file, provider, getKey(provider), {
        signal: controller.signal,
        onProgress: (step: ParseStep) => dispatch({ type: "PROGRESS", step }),
      });
      if (abortRef.current !== controller) return;
      if (result.ok) {
        dispatch({ type: "PARSE_OK", payload: result.value });
      } else if (result.error.kind === "cancelled") {
        dispatch({ type: "CANCEL_PARSE" });
      } else {
        dispatch({ type: "PARSE_FAIL", error: result.error });
      }
    } catch (error) {
      if (abortRef.current !== controller) return;
      if (controller.signal.aborted) {
        dispatch({ type: "CANCEL_PARSE" });
      } else {
        dispatch({
          type: "PARSE_FAIL",
          error: {
            kind: "network",
            message:
              error instanceof Error ? error.message : "Unexpected error",
          },
        });
      }
    }
  };

  const beginParse = (file: WorksheetFile | null) => {
    if (!file) return;
    if (getKey(getProvider()) === "") {
      autoStartRef.current = true;
      setKeyModalOpen(true);
      return;
    }
    void startParse(file);
  };

  const openKeyModal = () => {
    autoStartRef.current = false;
    setKeyModalOpen(true);
  };

  const closeKeyModal = () => {
    setKeyModalOpen(false);
    refreshKeyState();
    keyButtonRef.current?.focus();
  };

  const handleSaved = () => {
    refreshKeyState();
    if (autoStartRef.current) {
      autoStartRef.current = false;
      beginParse(state.file);
    }
  };

  const goHome = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    dispatch({ type: "RESET" });
  };

  const prevPhaseRef = useRef<AppState["phase"]>(state.phase);
  useEffect(() => {
    const phaseChanged = prevPhaseRef.current !== state.phase;
    prevPhaseRef.current = state.phase;
    if (keyModalOpen) return;
    if (phaseChanged || state.phase !== "setup") {
      mainRef.current?.focus();
    }
  }, [state.phase, keyModalOpen]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      abortRef.current = null;
    },
    []
  );

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="flex items-center gap-2 sm:gap-3 bg-panel px-4 sm:px-6 py-4 shadow-lg">
        <button
          type="button"
          aria-label="Worksheet Arcade home"
          onClick={goHome}
          className="flex items-center gap-2 sm:gap-3 rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan"
        >
          <Gamepad2
            className="hidden size-7 shrink-0 text-pink sm:block sm:size-8"
            aria-hidden="true"
          />
          <span className="whitespace-nowrap text-lg font-extrabold tracking-tight sm:text-2xl">
            Worksheet <span className="text-pink">Arcade</span>
          </span>
        </button>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <MuteButton />
          <button
            ref={keyButtonRef}
            type="button"
            onClick={openKeyModal}
            aria-label={`AI key settings: ${PROVIDERS[provider].label}, ${
              hasKey ? "Key saved" : "No key yet"
            }`}
            className="inline-flex min-h-11 min-w-11 items-center gap-2 rounded-full border border-cyan px-3 text-sm font-semibold text-cyan transition-colors hover:bg-cyan/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan"
          >
            <KeyRound className="size-5" aria-hidden="true" />
            <span className="hidden sm:inline">{PROVIDERS[provider].label}</span>
          </button>
          <span
            className={`rounded-full border px-2 py-1 text-xs sm:px-2.5 font-bold whitespace-nowrap ${
              hasKey
                ? "border-lime/40 bg-lime/15 text-lime"
                : "border-amber/40 bg-amber/15 text-amber"
            }`}
          >
            {hasKey ? "Key ✓" : "Add key"}
          </span>
        </div>
      </header>
      <main
        ref={mainRef}
        tabIndex={-1}
        className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-16 text-center focus:outline-none"
      >
        {state.phase === "setup" && (
          <>
            <h1 className="text-4xl font-extrabold sm:text-5xl">
              Turn any worksheet into <span className="text-cyan">games</span>
            </h1>
            <p className="max-w-xl text-lg text-ink/80">
              Upload a worksheet, pick an AI, and play three mini-games built
              from it.
            </p>
            <WorksheetUploader
              file={state.file}
              onFile={(file) => dispatch({ type: "FILE_SELECTED", file })}
              onClear={() => dispatch({ type: "FILE_CLEARED" })}
            />
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                disabled={!state.file}
                onClick={() => beginParse(state.file)}
                className="inline-flex h-14 items-center rounded-full bg-pink px-8 text-lg font-bold text-bg transition-colors hover:bg-amber focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan disabled:cursor-not-allowed disabled:opacity-50"
              >
                Make my games
              </button>
              <button
                type="button"
                onClick={() =>
                  dispatch({ type: "USE_DEMO", payload: SAMPLE_PAYLOAD })
                }
                className="inline-flex h-14 items-center rounded-full border-2 border-cyan px-8 text-lg font-bold text-cyan transition-colors hover:bg-panel focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan"
              >
                Try the demo
              </button>
            </div>
          </>
        )}
        {state.phase === "parsing" && (
          <ParsingScreen
            step={state.step}
            providerLabel={PROVIDERS[provider].label}
            onCancel={() => abortRef.current?.abort()}
          />
        )}
        {state.phase === "error" && (
          <ErrorScreen
            error={state.error}
            onRetry={() =>
              state.file
                ? beginParse(state.file)
                : dispatch({ type: "RESET" })
            }
            onDemo={() =>
              dispatch({ type: "USE_DEMO", payload: SAMPLE_PAYLOAD })
            }
            onOpenKey={openKeyModal}
            onHome={goHome}
          />
        )}
        {state.phase === "ready" && (
          <ReadyScreen
            payload={state.payload}
            source={state.source}
            onPick={(game: GameId) => dispatch({ type: "PICK_GAME", game })}
            onHome={goHome}
          />
        )}
        {state.phase === "playing" && state.game === "memory" && (
          <MemoryMatch
            key={state.game}
            payload={state.payload}
            onBack={() => dispatch({ type: "BACK_TO_PICKER" })}
          />
        )}
        {state.phase === "playing" && state.game !== "memory" && (
          <GamePlaceholder
            title={GAMES.find((g) => g.id === state.game)?.title ?? "Game"}
            onBack={() => dispatch({ type: "BACK_TO_PICKER" })}
          />
        )}
      </main>
      <KeySettingsModal
        open={keyModalOpen}
        onClose={closeKeyModal}
        onSaved={handleSaved}
      />
    </div>
  );
}
