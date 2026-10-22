import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    // Undo `vi.stubGlobal` between tests, so suites need no teardown hook for their stubs.
    unstubGlobals: true,
  },
});
