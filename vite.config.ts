import { defineConfig } from 'vite';

/** `pnpm dev` serves the sample page, which runs the plugin straight from `src/`. */
export default defineConfig({
  root: 'sample',
  server: { open: true },
});
