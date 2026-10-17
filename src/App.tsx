import { Gamepad2 } from "lucide-react";

export default function App() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="flex items-center gap-3 bg-panel px-6 py-4 shadow-lg">
        <Gamepad2 className="size-8 text-pink" aria-hidden="true" />
        <span className="text-2xl font-extrabold tracking-tight">
          Worksheet <span className="text-pink">Arcade</span>
        </span>
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
    </div>
  );
}
