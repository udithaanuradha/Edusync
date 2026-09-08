import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Separate from vite.config.js (the dev/build config) so the test runner's
// settings never have to be reconciled with the dev server's — Vitest reads
// this file automatically because it's named vitest.config.*.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    css: true,
    include: ['src/tests/**/*.test.{ts,tsx}'],
  },
});
