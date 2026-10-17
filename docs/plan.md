# Worksheet Arcade — Phase 1 blueprint (v2, Argon-reviewed)

Status: planning only. No repo, no push, no DNS, no Vibe yet. Target: `arcade.inguyen.ca`, new repo `hanoisolo/worksheet-arcade` (GitHub Pages via Actions). Static SPA, BYOK, no backend.

## 0. Reality check (verified 2026-10-17)
### CORS (curl OPTIONS preflight from Origin https://arcade.inguyen.ca, no keys; plus keyless POST)
| Endpoint | Preflight | Allow-Origin | Allowed headers | Keyless POST error has CORS? | Verdict |
|---|---|---|---|---|---|
| api.mistral.ai/v1/ocr | 200 | `*` | Authorization, Content-Type, … | yes (401 + `*`) | OK |
| api.mistral.ai/v1/chat/completions | 200 | `*` | Authorization, Content-Type, … | yes | OK |
| api.openai.com/v1/chat/completions | 200 | echoes origin | echoes requested | yes (401 + `*`) | OK technically; OpenAI discourages browser keys (policy, not a block) |
| generativelanguage…:generateContent | 200 | echoes origin | authorization, content-type, x-goog-api-key | yes (403 + origin) | OK |
=> No CORS blocker. No proxy required. Error bodies are readable in-browser, so we can show real error messages.

### Model IDs
- Mistral OCR: `mistral-ocr-latest` (alias → OCR 4.1; OCR 4.0 retired 2026-09-30). Accepts BOTH images (`document:{type:"image_url", image_url:"data:image/png;base64,…"}`; PNG/JPEG/WEBP/GIF/AVIF/TIFF/BMP) and PDFs (`type:"document_url"`, base64 data URI OK). Spec's "document_url for everything" is WRONG for images → must branch on MIME.
- GLM 5.3 on Mistral: `zai-glm-5-3` (text-only, structured outputs supported, $1.4/$4.4 per 1M). Fallback: `mistral-large-4` (explicit id; multimodal, structured outputs). Do not use `mistral-large-latest` unless verified.
- Gemini: spec's `gemini-2.5-flash` is now restricted to accounts that already used it → new parents would fail. Use `gemini-3.8-flash` (stable GA, inputs text/image/PDF, structured outputs). Cheap alt: `gemini-3.5-flash-lite`.
- OpenAI: `gpt-4o` still served but legacy. Default `gpt-6-luna` (vision, Chat Completions, structured outputs, $0.10/$0.50 per 1M). Note: reasoning model → use `max_completion_tokens`, `reasoning_effort:"low"`, no `temperature`. PDFs in Chat Completions go as `{type:"file", file:{filename, file_data:"data:application/pdf;base64,…"}}`; images as `image_url`.

## 1. Stack & config
- React 19 + TS (strict) + Vite 6 + Tailwind v4 (`@tailwindcss/vite` plugin, no PostCSS config), lucide-react, canvas-confetti, Web Audio synth. Vitest + Testing Library; ESLint; `npm run check` = typecheck + lint + test + build.
- `vite.config.ts`: `base: '/'`, `plugins:[react(), tailwind()]`, `build.target:'es2022'`, `test.environment:'jsdom'`.
- `public/CNAME` = `arcade.inguyen.ca`; `public/404.html` not needed (single route, hash-free state machine, no router).
- Design tokens in `src/styles/tokens.css` (arcade palette, large tap targets ≥44px, `prefers-reduced-motion` respected for shake/confetti).

## 2. Types (`src/types/game.ts`)
Spec contract unchanged (GameLevel, MatchingPair, GamePayload). Add:
```ts
export type ProviderId = 'mistral'|'gemini'|'openai';
export interface ProviderConfig { id: ProviderId; model: string; label: string; acceptsPdf: boolean; maxFileMB: number }
export interface WorksheetFile { name: string; mime: string; base64: string; bytes: number }
export type ParseError = { kind: 'auth'|'quota'|'network'|'cors'|'too_large'|'bad_output'|'unsupported'; message: string; status?: number };
export type Result<T> = { ok: true; value: T } | { ok: false; error: ParseError };
```

## 3. Adapter router (`src/services/`)
- `adapter.ts`: `parseWorksheet(file, provider, key, signal): Promise<Result<GamePayload>>`. Picks service from a registry, accepts a user-cancel `AbortSignal` and an `onProgress(step)` callback; **per-call timeouts** chained to the user signal (Mistral OCR 45 s, chat 90 s; Gemini/OpenAI 120 s) [Argon], maps HTTP status → ParseError (401/403 auth, 429 quota, 413 too_large, TypeError fetch → `network` with copy "Couldn't reach <provider> — file may be too large, connection dropped, or the request timed out" — because gateway 413/504 responses often lack CORS headers and surface only as TypeError). [Argon]
- Re-ask: `adapter` owns the single automatic re-ask; services expose `extract()` (OCR/file → context) and `structure(context, feedback?)` so a Mistral re-ask **reuses cached OCR markdown** instead of re-billing OCR. [Argon]
- Shared `prompt.ts`: one structuring prompt (grade-appropriate, kid-friendly hints, exactly 4 options, correctAnswer ∈ options, 6–10 levels, 6–8 pairs, JSON only; **math as plain text/Unicode — `3/4`, `½`, `x²`, `√9` — never LaTeX**). [Argon]
- `schema.ts`: one canonical GamePayload schema + **per-provider emitters** [Argon]: OpenAI strict (`additionalProperties:false` on every object, all props in `required`); Gemini `responseSchema` (OpenAPI-3.0 subset: no `additionalProperties`, no `$schema`); Mistral `json_schema` (OpenAI-style). Unit test each emitter's output shape.
- `mistralService.ts`: OCR (image_url vs document_url by MIME) → join `pages[].markdown` (cap ~30k chars) → chat `zai-glm-5-3`, `response_format: json_schema` (fallback `json_object`), temperature 0.2; on 400/5xx/invalid JSON retry once with `mistral-large-4`.
- `geminiService.ts`: one call, `x-goog-api-key` header (never `?key=`), `inline_data` (image or PDF), `generationConfig.responseMimeType:'application/json'` + `responseSchema`.
- `openaiService.ts`: one call; image → `image_url` data URI (`detail:"high"`), PDF → `file` part; `response_format: json_schema` strict.
- No SDKs (raw fetch) to keep bundle small and avoid SDK "dangerouslyAllowBrowser" flags.

## 4. Validation & repair (`src/services/validate.ts`)
Pure function `normalizePayload(unknown): Result<GamePayload>`; zero-dependency (or zod if Vibe prefers; decide in conventions).
1. Extract JSON: strip ``` fences / leading text; `JSON.parse`.
2. Coerce: trim strings; convert stray LaTeX (`\frac{a}{b}`→`a/b`, `^2`→`²`, strip `$`) as a safety net; ids → sequential numbers / string ids; difficulty → lowercase, unknown → 'medium'.
3. Repair options: dedupe; if correctAnswer not in options but matches case-insensitively → canonicalize; if missing, replace last option; if <4 options → drop level; if >4 → keep correct + first 3 others; shuffle.
4. Drop levels missing question/correctAnswer; clamp to 10 levels, 8 pairs; dedupe pairs.
5. Hard fail (`bad_output`) if <6 levels or <6 pairs after repair → adapter does ONE automatic re-ask (`structure(cachedContext, validationErrors)`), then UI offers "try again" or "use demo".
6. Sanitize: render all text as React text only (no `dangerouslySetInnerHTML`); cap string lengths.
Unit-tested with fixtures (good, fenced, wrong counts, missing correct answer, garbage).

## 5. State (`src/state/`)
- Single `useReducer` app machine: `setup → uploading → parsing{step:'reading'|'building', of:1|2} → ready(payload) → playing(game) → review(results)`; errors as `{phase:'error', error}`.
- `GameResult { game, score, stars, mistakes: {questionId, chosen, correct, hint}[] , timeMs }`.
- Last payload cached in `sessionStorage` (not the file) so a refresh doesn't re-bill the key.
- Demo mode: `src/mock/sampleData.ts` (grade-7 fractions) works with no key.

## 6. Key storage & warning
- `KeySettingsModal`: provider switcher, model shown, key `type=password`, "Remember on this device" checkbox **unchecked by default** [Argon]: unchecked → `sessionStorage` (survives refresh, cleared when the tab closes); checked → `localStorage` `wa.key.<provider>`. "Forget key" button.
- Persistent warning: "Your key is stored only in this browser on this device and sent directly to <provider>. Don't use this on a shared computer. Browser extensions can read saved keys. Use a key with a spending limit."
- Hardening: CSP meta tag [Argon-adjusted]: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; worker-src 'self' blob:; connect-src https://api.mistral.ai https://api.openai.com https://generativelanguage.googleapis.com; object-src 'none'; base-uri 'none'; form-action 'none'` (`'unsafe-inline'` styles only — needed for React style props/animations; canvas-confetti worker needs `blob:`). Verified in S4 by a Playwright test that loads the built site and asserts zero CSP violations, no third-party scripts/analytics/CDNs, no key in URLs or logs, `referrerpolicy=no-referrer`.

## 7. Upload
`WorksheetUploader`: drag-drop + file picker + camera (`capture` on mobile). Accept PNG/JPEG/WEBP/PDF; `accept` attribute lists explicit MIME types so iOS converts photos to JPEG; if a HEIC/HEIF still arrives (or canvas decode fails) show "please export as JPEG/PNG" [Argon]. Client-side downscale images to ≤2000px long edge, JPEG 0.85. **PDF cap 5 MB** [Argon] (base64 +33%; memory on low-end tablets). Base64 via FileReader.

## 8. Games
SpaceBlaster (canvas/rAF or DOM+CSS transforms; tap/click targets, keyboard 1–4), MemoryMatch (12 cards from 6 pairs, 900 ms flip-back, moves+timer, confetti), BossQuest (HP bars, −25% boss / −15% hero, 1–3 stars). Shared: `soundFx.ts` (Web Audio synth, AudioContext created on first user gesture, mute toggle persisted), `VictoryReview` (stars, confetti, mistake list with hint+explanation).

## 9. CI (`.github/workflows/deploy.yml`)
On push to main + workflow_dispatch: checkout@v4, setup-node@v4 (node 20, cache npm), `npm ci`, `npm run check`, configure-pages@v5, upload-pages-artifact@v3 (dist), deploy-pages@v4. permissions contents:read, pages:write, id-token:write; concurrency `pages`, cancel-in-progress false. Pages source = GitHub Actions (`gh api -X POST repos/…/pages -f build_type=workflow`), custom domain set via API after first deploy.

## 10. Segments for Vibe (one vibe-task each, each with --verify)
S0 Forge (no Vibe): docs/spec.md, conventions.md, segments.md, decisions.md; local git init.
S1 Scaffold: Vite+React+TS+Tailwind v4, ESLint, Vitest, **@playwright/test + chromium installed + `npm run e2e` against `vite preview` on a fixed port** [Argon], `npm run check`, tokens, App shell. verify: `npm run check && npm run e2e`.
S2 Types + validate/repair + fixtures + mock data. verify: vitest validate.
S3 Adapter + 3 services + prompt + per-provider schema emitters, fetch mocked in tests (request shape per provider, error mapping, re-ask reuses OCR). verify: vitest services.
S3b Forge (no Vibe): **live-key smoke test** of each provider with a tiny sample worksheet via a Node script reusing the services — catches schema rejections and model-ID typos before UI work [Argon]. Needs keys/OK from Don (Gemini key on box is OK to use for this with his OK; Mistral/OpenAI need his keys or a skip).
S4 KeySettingsModal + key storage + warning + CSP. verify: vitest + build.
S5 WorksheetUploader + app state machine + demo mode end-to-end. verify: vitest + Playwright smoke (demo).
S6 soundFx + MemoryMatch. S7 SpaceBlaster. S8 BossQuest. S9 VictoryReview + game picker. verify each: vitest + Playwright screenshot desktop/mobile.
S10 Forge: art integration (`public/assets`), deploy.yml, CNAME, a11y/perf pass; then ask Don before push. After first deploy: set custom domain via API, wait for cert, then set and **verify `https_enforced: true`** via `gh api` [Argon].
DNS: give Don the record (`CNAME arcade → hanoisolo.github.io`, Squarespace) at S10 prep, right before the first push, so the cert issues promptly; Don adds it himself [Argon: do DNS early; kept Don-owned].

## 11. Art list (Colab, Qwen-Image-2512 + Qwen-Image-Edit-2511, SDXL fallback; per colab-gpu-image-generation skill)
space_ship.png 256 (alpha) · asteroid_target.png 256 (alpha) · card_back.png 512 · boss_idle/boss_hit/boss_defeated.png 512 (alpha; Edit-2511 from idle for consistency) · space_bg.webp 1024 tile · dungeon_bg.webp 1024 tile. Placeholders (CSS/SVG) ship first so code never blocks on art.

## 12. Risks
1. Key exposure on shared/kid devices; XSS would leak localStorage keys → CSP, no innerHTML, no third-party JS.
2. Provider output drift → schema mode + repair + one re-ask + demo fallback.
3. Model IDs churn (2.5-flash restricted, gpt-4o legacy) → model ids in one config file, editable "advanced: model" field.
4. Cost per parse unbounded on huge PDFs → size/page caps, image downscale.
5. Children's data: worksheets may contain kid names → privacy note: file goes only to the chosen provider; nothing stored server-side (no server).
6. OpenAI ToS discourages client-side keys → disclose; it's the user's own key.
7. GLM 5.3 text-only → Mistral path depends on OCR quality for diagrams (math figures lost) — note in UI.
8. Gateway errors (413/504) may lack CORS headers → indistinguishable from offline; mitigated by size caps + friendly copy. [Argon]
9. CSP vs. styling/workers → adjusted CSP + automated violation check. [Argon]

## 13. What Argon changed (summary for Don)
1. Per-provider JSON schemas (OpenAI strict vs. Gemini's restricted dialect) — a single schema would have failed at runtime.
2. Key default = this-tab only (sessionStorage); "remember on this device" is opt-in.
3. Per-step timeouts + progress steps; Mistral re-ask reuses OCR text (no double OCR bill).
4. Math rendered as plain text (3/4, x²), never LaTeX, plus a LaTeX clean-up safety net.
5. Playwright set up in S1; live-key smoke test right after the services segment (S3b), not at launch.
6. CSP loosened just enough (inline styles, blob worker) and auto-checked; PDF cap 5 MB; HEIC handling.
Rejected/kept: no proxy (no CORS blocker); DNS stays Don's step (timed just before first push).

## 14. Decisions for Don
- Default OpenAI model `gpt-6-luna` and Gemini `gemini-3.8-flash` (spec had gpt-4o / gemini-2.5-flash).
- Live smoke test (S3b): OK to spend a few cents on the box Gemini key? Will he supply Mistral/OpenAI test keys or skip those two?
- Approve spec + segment list (PLAYBOOK Phase 1 gate) before repo creation/Vibe.
