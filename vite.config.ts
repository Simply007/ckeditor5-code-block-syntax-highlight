import { defineConfig } from 'vite';

/**
 * `pnpm dev` serves the sample page, which runs the plugin straight from `src/`. `pnpm build:sample`
 * builds it to `site/`, which the Pages workflow deploys.
 */
export default defineConfig({
  root: 'sample',
  // Relative asset URLs, so the build works under the Pages project path.
  base: './',
  server: { open: true },
  build: {
    outDir: '../site',
    emptyOutDir: true,
    // The sample uses top-level `await`.
    target: 'es2022',
  },
});
