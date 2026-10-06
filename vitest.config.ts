import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'expo-sqlite': fileURLToPath(new URL('./test/native/expo-sqlite-shim.ts', import.meta.url)),
    },
  },
  test: {
    setupFiles: ['fake-indexeddb/auto'],
    testTimeout: 120_000,
  },
});
