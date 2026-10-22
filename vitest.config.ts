import { defineConfig } from 'vitest/config';

import { ckeditorAliases } from './vite.config';

export default defineConfig({
  // `CKEDITOR_MAJOR=49 pnpm test` runs the suite against CKEditor 49.
  resolve: { alias: ckeditorAliases() },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    // Undo `vi.stubGlobal` between tests, so suites need no teardown hook for their stubs.
    unstubGlobals: true,
  },
});
