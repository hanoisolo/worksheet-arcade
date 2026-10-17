import { useEffect, useRef } from 'react'
import { ArrowLeft, Construction } from 'lucide-react'

export default function GamePlaceholder({ title, onBack }: { title: string; onBack: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <section className="rounded-2xl bg-panel p-6 text-center sm:p-10">
        <Construction className="mx-auto size-12 text-amber" aria-hidden="true" />
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="mt-4 text-2xl font-extrabold text-ink outline-none"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm text-ink/85">Coming soon! This game is being built.</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border-2 border-cyan/50 px-6 text-sm font-bold text-ink transition hover:border-cyan focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to games
        </button>
      </section>
    </div>
  )
}
