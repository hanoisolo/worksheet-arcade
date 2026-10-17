import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { Plugin } from 'vite';

// Content-Security-Policy, injected only into the production build (Vite dev needs inline scripts).
// Keep connect-src in sync with the provider hosts in src/config/providers.ts.
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "worker-src 'self' blob:",
  'connect-src https://api.mistral.ai https://api.openai.com https://generativelanguage.googleapis.com',
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'worksheet-arcade-csp',
    apply: 'build',
    transformIndexHtml() {
      return [
        { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
        { tag: 'meta', attrs: { name: 'referrer', content: 'no-referrer' }, injectTo: 'head-prepend' },
      ];
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss(), cspPlugin()],
  build: {
    target: 'es2022',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
    globals: false,
  },
});
