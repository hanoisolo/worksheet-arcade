# Conventions
- Stack: React 19, TypeScript strict, Vite 6+, Tailwind CSS v4 via `@tailwindcss/vite` (CSS entry `src/index.css` with `@import "tailwindcss";` and `@theme` tokens; no tailwind.config.js, no PostCSS config). lucide-react icons, canvas-confetti (later). No other runtime deps without a decision entry.
- Tests: Vitest + @testing-library/react + jsdom (`*.test.ts(x)` next to code). E2E: @playwright/test in `e2e/`, using the system Chrome (`channel: 'chrome'`, do NOT run `playwright install`), against `vite preview --port 4173 --strictPort` via Playwright `webServer`.
- Scripts: `dev`, `build` (tsc -b && vite build), `typecheck`, `lint` (eslint), `test` (vitest run), `e2e` (playwright test), `check` = typecheck && lint && test && build.
- Layout: src/types, src/config, src/services, src/state, src/components, src/components/games, src/mock, src/utils, public/assets.
- Style: vibrant arcade, kid-friendly: dark indigo background, neon accents (pink, cyan, lime, amber), rounded-2xl cards, big type, buttons ≥44 px tall, visible focus rings, respects prefers-reduced-motion. Tokens in src/index.css `@theme`.
- Model ids/URLs only in src/config/providers.ts. API calls only in src/services.
- Never: dangerouslySetInnerHTML, logging keys, keys in URLs, third-party CDNs/fonts/analytics, SDKs for providers, a backend.
- Text from the AI is rendered as plain React text.
- Coding agent: do not commit, do not push, do not run `git` write commands, do not edit files outside the stated scope.
