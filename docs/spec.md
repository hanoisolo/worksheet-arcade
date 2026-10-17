# Worksheet Arcade — spec (authoritative for coding)
Full design rationale: docs/plan.md (v2). This file lists what to build per module, with acceptance criteria.

## §1 App
Static React 19 SPA (no backend, no router). A parent uploads a worksheet (PNG/JPEG/WEBP/PDF), picks ONE AI provider, pastes ONE API key (BYOK). The app turns it into a `GamePayload` that drives 3 mini-games. Demo mode works with no key (src/mock/sampleData.ts).

## §2 Types — src/types/game.ts
```ts
export interface GameLevel { id: number; difficulty: 'easy'|'medium'|'hard'; question: string; options: string[] /* exactly 4 */; correctAnswer: string; hint: string; explanation: string; }
export interface MatchingPair { id: string; term: string; match: string; }
export interface GamePayload { meta: { title: string; subject: string; targetGrade: string; topicSummary: string }; levels: GameLevel[] /* 6–10 */; matchingPairs: MatchingPair[] /* 6–8 */; }
export type ProviderId = 'mistral'|'gemini'|'openai';
export interface ProviderConfig { id: ProviderId; label: string; model: string; fallbackModel?: string; acceptsPdf: boolean; maxFileMB: number; keyUrl: string }
export interface WorksheetFile { name: string; mime: string; base64: string; bytes: number }
export type ParseErrorKind = 'auth'|'quota'|'network'|'too_large'|'bad_output'|'unsupported'|'cancelled';
export interface ParseError { kind: ParseErrorKind; message: string; status?: number }
export type Result<T> = { ok: true; value: T } | { ok: false; error: ParseError };
export type ParseStep = 'reading'|'building';
```
Provider registry — src/config/providers.ts (the ONLY place model ids appear):
- mistral: OCR `mistral-ocr-latest`; chat `zai-glm-5-3`, fallback `mistral-large-4`; acceptsPdf true; 5 MB.
- gemini: `gemini-3.8-flash`; acceptsPdf true; 5 MB.
- openai: `gpt-6-luna`; acceptsPdf true; 5 MB.

## §3 Validation & repair — src/services/validate.ts
`normalizePayload(raw: unknown | string): Result<GamePayload> & { warnings?: string[] }` (pure, no deps).
1. If string: strip ``` fences and text before first `{` / after last `}`; JSON.parse (fail → bad_output).
2. Coerce: trim strings; level ids → 1..n; pair ids → "p1".."pn"; difficulty lowercased, unknown → 'medium'; missing meta fields → defaults ("Worksheet", "General", "Grade 7", "").
3. LaTeX safety net on all text: `\frac{a}{b}`→`a/b`, `^2`→`²`, `^3`→`³`, `\sqrt{x}`→`√x`, `\times`→`×`, `\div`→`÷`, strip `$`.
4. Options: dedupe (case-insensitive); if correctAnswer matches an option case-insensitively → use the option's text; if correctAnswer missing from options and options ≥3 → replace last option with correctAnswer; if fewer than 4 options → drop level; if more than 4 → keep correct + first 3 others; then deterministic shuffle (seeded by level id) so the correct answer isn't always first.
5. Drop levels without question or correctAnswer; drop pairs without term or match; dedupe pairs by term; clamp levels to 10 and pairs to 8.
6. If fewer than 6 levels or fewer than 6 pairs remain → `{ok:false, error:{kind:'bad_output', message:<list of problems>}}`.
7. Cap every string at 300 chars. Never produce HTML; UI renders text nodes only.
Acceptance: vitest fixtures in src/services/__fixtures__/ — valid, fenced+prose, LaTeX, wrong option counts, correct answer missing, too few levels, garbage string.

## §4 Prompt & schemas — src/services/prompt.ts, src/services/schema.ts
- `buildPrompt(feedback?: string): string` — grade-appropriate (default grade 7), kid-friendly hints that guide without giving the answer, explanation 1–2 sentences, exactly 4 options, correctAnswer must equal one option exactly, 6–10 levels with a mix of difficulties, 6–8 term/match pairs, math as plain text/Unicode (3/4, ½, x², √9, ×, ÷) NEVER LaTeX, JSON only. If `feedback` is given, append "Your previous answer had these problems: …; fix them."
- `schema.ts`: canonical schema + emitters `openaiSchema()` (strict: additionalProperties:false on every object, every property in required), `geminiSchema()` (OpenAPI subset: type names uppercase OK or lowercase; NO additionalProperties, NO $schema), `mistralSchema()` (same shape as openai).

## §5 Services — src/services/{mistralService,geminiService,openaiService,adapter,http}.ts
Raw `fetch` only (no SDKs). Each service exports `extract(file, key, signal) → Result<Context>` and `structure(context, key, signal, feedback?) → Result<string /*raw JSON text*/>`.
- mistral.extract: POST https://api.mistral.ai/v1/ocr `Authorization: Bearer <key>`, body `{model:'mistral-ocr-latest', document:{type:'image_url', image_url:'data:<mime>;base64,<b64>'}}` for images or `{type:'document_url', document_url:'data:application/pdf;base64,<b64>'}` for PDF; context = pages[].markdown joined with "\n\n", capped 30000 chars. Timeout 45 s.
- mistral.structure: POST https://api.mistral.ai/v1/chat/completions, model `zai-glm-5-3`, temperature 0.2, `response_format:{type:'json_schema', json_schema:{name:'game_payload', schema:mistralSchema(), strict:true}}`, messages [system: prompt, user: "WORKSHEET TEXT:\n"+context]. On HTTP 400/404/5xx or network error, retry once with `mistral-large-4`. Return `choices[0].message.content`. Timeout 90 s.
- gemini: extract = no network, context = the file itself. structure: POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent, header `x-goog-api-key: <key>` (NEVER ?key=), body `{contents:[{role:'user', parts:[{text: prompt}, {inline_data:{mime_type, data:b64}}]}], generationConfig:{responseMimeType:'application/json', responseSchema: geminiSchema(), temperature:0.2}}`; return candidates[0].content.parts[].text joined. Timeout 120 s.
- openai: extract = no network. structure: POST https://api.openai.com/v1/chat/completions, `Authorization: Bearer`, model `gpt-6-luna`, `reasoning_effort:'low'`, `max_completion_tokens: 8000`, NO temperature, `response_format:{type:'json_schema', json_schema:{name:'game_payload', strict:true, schema:openaiSchema()}}`, messages [system prompt, user content: image → `{type:'image_url', image_url:{url:'data:…', detail:'high'}}`; PDF → `{type:'file', file:{filename, file_data:'data:application/pdf;base64,…'}}`]. Timeout 120 s.
- http.ts: `postJson(url, headers, body, {signal, timeoutMs})` combining user signal + timeout; maps errors: 401/403 → auth, 429 → quota, 413 → too_large, other non-2xx → network with provider error message if present, fetch TypeError → network with message "Couldn't reach <provider>. The file may be too large, the connection dropped, or the request timed out.", abort by user → cancelled. Never include the key in any error message or console log.
- adapter.ts: `parseWorksheet(file, providerId, key, {signal, onProgress}) → Result<GamePayload>`: onProgress('reading') → extract; onProgress('building') → structure → normalizePayload; on bad_output do ONE re-ask `structure(sameContext, …, feedback=error.message)` (reuses OCR text; no second extract); return result.
Acceptance: vitest with mocked fetch asserting URL, headers (key in header only), body shape per provider and MIME, error mapping, Mistral fallback model, re-ask calls extract once and structure twice.

## §6 Key settings — src/components/KeySettingsModal.tsx, src/state/keyStore.ts, index.html CSP
- Modal (accessible dialog, focus trap, Esc closes): provider radio cards (Mistral / Gemini / OpenAI) showing the model id, link "Get a key" (keyUrl), password input with show/hide toggle, "Remember on this device" checkbox UNCHECKED by default, Save, "Forget key".
- keyStore: unchecked → sessionStorage `wa.key.<provider>`; checked → localStorage `wa.key.<provider>` (and remove the sessionStorage copy); selected provider in localStorage `wa.provider`. `getKey(p)` checks sessionStorage then localStorage. `forgetKey(p)` clears both.
- Always-visible warning text in the modal: "Your key stays in this browser and is sent only to <Provider>. Don't use this on a shared computer: browser extensions can read saved keys. Use a key with a spending limit."
- CSP meta in index.html: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; worker-src 'self' blob:; connect-src https://api.mistral.ai https://api.openai.com https://generativelanguage.googleapis.com; object-src 'none'; base-uri 'none'; form-action 'none'`, plus `<meta name="referrer" content="no-referrer">`. No third-party scripts, fonts or CDNs.
Acceptance: vitest for keyStore + modal; Playwright on `vite preview` asserts zero CSP console violations on load.

## §7 Uploader + app state — src/components/WorksheetUploader.tsx, src/state/appMachine.ts, src/App.tsx
- Uploader: drag-and-drop zone + "Choose file" button + mobile camera (`<input accept="image/png,image/jpeg,image/webp,application/pdf">`, a second input with `capture="environment"` for "Take photo"). Rejects other types (HEIC → "Please export the photo as JPEG or PNG"). Images downscaled in canvas to ≤2000 px long edge, JPEG 0.85; PDFs passed as-is, max 5 MB → too_large message. Produces WorksheetFile. Shows file name + thumbnail (image) or PDF icon.
- appMachine (useReducer): phases `setup` → `parsing{step}` → `ready{payload, source:'ai'|'demo'}` → `playing{game}` → `review`; plus `error{error}`. Actions: FILE_SELECTED, START_PARSE, PROGRESS, PARSE_OK, PARSE_FAIL, USE_DEMO, PICK_GAME, FINISH_GAME, RESET.
- App: header (logo text "Worksheet Arcade", key button showing provider + ✓/needs key). Setup screen: uploader, "Make my games" button (disabled without file; without key opens KeySettingsModal), "Try the demo" button (no key needed). Parsing screen: progress "Reading worksheet (1/2)…" / "Building games (2/2)…" + Cancel. Ready screen: payload title/subject/grade/topic, counts, and 3 game cards (Space Blaster, Memory Match, Boss Quest) — in S5 the cards open a placeholder "Coming soon" game panel with Back. Error screen: friendly message per kind + Try again + Use demo.
- Last payload cached in sessionStorage `wa.payload` (not the file).
Acceptance: vitest for reducer; Playwright e2e: load → Try the demo → ready screen shows sample title and 3 game cards → open a card → back; uploader rejects a .txt; key modal opens and saves to sessionStorage by default.

## §8 Games (S6–S9, later)
Space Blaster, Memory Match, Boss Quest, VictoryReview as in docs/plan.md §8.
