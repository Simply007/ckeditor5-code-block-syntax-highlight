/**
 * Builds the sample once per supported CKEditor 5 major into `site/v<major>/`, plus a landing page at
 * `site/index.html` that links to each build. The Pages workflow deploys `site/`.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';

const majors = ['48', '49'];

rmSync('site', { recursive: true, force: true });

for (const major of majors) {
  execFileSync('pnpm', ['exec', 'vite', 'build'], {
    stdio: 'inherit',
    env: { ...process.env, CKEDITOR_MAJOR: major },
  });
}

mkdirSync('site', { recursive: true });
copyFileSync('sample/landing.html', 'site/index.html');
