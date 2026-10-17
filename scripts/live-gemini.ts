// S3b: live test through the real geminiService + normalizePayload (via parseWorksheet). Key from env; never printed.
import { readFileSync, writeFileSync } from 'node:fs';
import { parseWorksheet } from '../src/services/adapter';
const key = process.env.GEMINI_API_KEY ?? '';
const buf = readFileSync('/workspace/wa-tasks/live/water-cycle.png');
const file = { name: 'water-cycle.png', mime: 'image/png', base64: buf.toString('base64'), bytes: buf.length };
// count calls + capture usage without logging the request
const realFetch = globalThis.fetch; let calls = 0; const usage: unknown[] = [];
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  calls++; const res = await realFetch(input, init);
  try { const j = await res.clone().json(); usage.push({ status: res.status, usage: j.usageMetadata, model: j.modelVersion }); } catch { usage.push({ status: res.status }); }
  return res;
}) as typeof fetch;
const steps: string[] = []; const t0 = Date.now();
const r = await parseWorksheet(file, 'gemini', key, { onProgress: (s) => steps.push(s) });
console.log('ms', Date.now() - t0, 'steps', steps.join('>'), 'fetch calls', calls);
console.log('usage', JSON.stringify(usage));
if (!r.ok) { console.log('ERROR', r.error.kind, r.error.status, r.error.message.includes(key) && key ? 'KEY LEAK' : r.error.message); process.exit(2); }
const p = r.value; writeFileSync('/workspace/wa-tasks/live/live-payload.json', JSON.stringify(p, null, 2));
console.log('meta', JSON.stringify(p.meta));
console.log('levels', p.levels.length, 'pairs', p.matchingPairs.length,
  'all4+correct', p.levels.every(l => l.options.length === 4 && l.options.includes(l.correctAnswer)),
  'correctIdx', p.levels.map(l => l.options.indexOf(l.correctAnswer)).join(','));
console.log('L1', JSON.stringify(p.levels[0]));
console.log('pair1', JSON.stringify(p.matchingPairs[0]));
