# Worksheet Arcade

**Live:** https://arcade.inguyen.ca

Turn any worksheet into three mini-games. Upload a worksheet (PDF or photo), pick an AI provider, paste your own API key, and play:

- **Space Blaster**: answer asteroids drift down slowly and keep looping. Tap, click or press 1–4 to fire. Wrong answers show a hint, and there is no timer and no game over.
- **Memory Match**: a 12-card grid of terms and their matches, with moves and time.
- **Boss Quest**: cast spells (correct answers) to defeat the Goofy Slime. The battle covers every question and awards 1–3 stars.

Both quiz games end on a review screen that lists each missed question with its correct answer and explanation. **Try the demo** works offline, with no key.

## Privacy and keys

- No backend. The app is a static site; your worksheet goes **directly from your browser to the AI provider you choose** (Mistral, Google Gemini or OpenAI) and nowhere else.
- Your API key is kept in this browser tab only (`sessionStorage`) unless you tick "Remember on this device" (`localStorage`). It is never put in a URL or logged.
- A strict Content-Security-Policy allows network calls only to the three provider APIs.
- Use your own key. On a shared or school computer, leave "remember" off.

## Providers and models

| Provider | Models |
| --- | --- |
| Mistral | `mistral-ocr-latest` to read the worksheet, then GLM 5.3 (`zai-glm-5-3`) to build the games, falling back to `mistral-large-4` |
| Google Gemini | `gemini-3.8-flash` |
| OpenAI | `gpt-6-luna` |

Model IDs live in `src/config/providers.ts`.

## Development

Requires Node 20.19+ (CI uses Node 22).

```bash
npm ci
npm run dev        # http://localhost:5173
npm run check      # typecheck + lint + unit tests + production build
npm run e2e        # Playwright (desktop + phone) against the production build; uses system Chrome
```

Stack: React 19, TypeScript, Vite, Tailwind CSS v4, Vitest + Testing Library, Playwright + axe-core. Sounds are synthesized with the Web Audio API (no audio files), and there is a mute toggle in the header.

Project docs: `docs/spec.md` (spec), `docs/conventions.md`, `docs/segments.md` (build log), `docs/decisions.md`.

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`: `npm ci`, then `npm run check`, then the built `dist/` is deployed to GitHub Pages. `public/CNAME` sets the custom domain `arcade.inguyen.ca`.

## Art

The images in `public/assets/` are **placeholders** (CC0, see `public/assets/README.md`). Final art will replace them with the same file names.

## Licence

MIT © 2026 Don Nguyen, see [LICENSE](LICENSE).

Third-party licences for the bundled libraries (React, lucide-react) are in `public/third-party-licenses.txt`, which is served as `/third-party-licenses.txt`.
