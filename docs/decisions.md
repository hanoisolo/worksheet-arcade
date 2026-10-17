# Decisions
- 2026-10-17 No backend: all 3 providers pass CORS preflight from arcade.inguyen.ca (plan §0).
- 2026-10-17 Models (Don approved): gemini-3.8-flash, gpt-6-luna, zai-glm-5-3 (fallback mistral-large-4), mistral-ocr-latest.
- 2026-10-17 Key default sessionStorage; localStorage only on opt-in (Argon review).
- 2026-10-17 Per-provider schema emitters (OpenAI strict vs Gemini OpenAPI subset).
- 2026-10-17 Playwright uses system Chrome (channel 'chrome') — no browser download.
- 2026-10-17 Placeholder art committed (S0); real Qwen art in S10.
- 2026-10-17 S1 BLOCKER: GLM 5.3 and ML4 both killed by 300 s idle watchdog. Root cause: each model spent one giant reasoning turn planning every file before its first write (GLM 557k chars of reasoning, ML4 65k); Vibe streams entries only when complete, so the watchdog saw silence. No files written. Fix proposal: split S1 into 4 micro-tasks and tell the model to write one file per tool call immediately.
- 2026-10-17 S3b live Gemini (standalone script, spec §5 shape): gemini-3.8-flash accepted responseSchema incl. enum/minItems/maxItems; HTTP 200 in 14 s; 8 levels, 7 pairs, all levels valid, no LaTeX; ~$0.008.
- 2026-10-17 S1 re-plan: split into S1a package+install, S1b tooling config, S1c app shell, S1d Playwright; prompts require writing one file per tool call from turn 1. All four passed on GLM 5.3 first try. Vite 7.3, Vitest 3.2, Tailwind 4. Added public/favicon.svg (Forge) and removed the favicon 404 stub from the smoke test.
