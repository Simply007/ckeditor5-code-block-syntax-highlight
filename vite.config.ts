import { defineConfig, type Alias } from 'vite';

/** The CKEditor 5 majors the plugin supports. Each one is installed, the newer under an npm alias. */
export const CKEDITOR_MAJORS = ['48', '49'] as const;

const ckeditorMajor = process.env.CKEDITOR_MAJOR ?? CKEDITOR_MAJORS[0];

if (!(CKEDITOR_MAJORS as readonly string[]).includes(ckeditorMajor)) {
  throw new Error(`CKEDITOR_MAJOR must be one of ${CKEDITOR_MAJORS.join(', ')}, got "${ckeditorMajor}".`);
}

/**
 * Points every `ckeditor5` import, the plugin's own included, at the major chosen by `CKEDITOR_MAJOR`.
 * The oldest major is the plain `ckeditor5` dev dependency and needs no alias. The others are installed as
 * `ckeditor5-v<major>`, and the lookahead keeps the alias from matching those names themselves.
 */
export function ckeditorAliases(): Alias[] {
  return ckeditorMajor === CKEDITOR_MAJORS[0]
    ? []
    : [{ find: /^ckeditor5(?=\/|$)/, replacement: `ckeditor5-v${ckeditorMajor}` }];
}

/**
 * `pnpm dev` serves the sample page, which runs the plugin straight from `src/`. `pnpm build:pages` builds
 * it once per supported major into `site/v<major>/`, which the Pages workflow deploys.
 */
export default defineConfig({
  root: 'sample',
  // Relative asset URLs, so the build works under the Pages project path.
  base: './',
  resolve: { alias: ckeditorAliases() },
  server: { open: true },
  build: {
    outDir: `../site/v${ckeditorMajor}`,
    emptyOutDir: true,
    // The sample uses top-level `await`.
    target: 'es2022',
  },
});
