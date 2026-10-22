/**
 * Compiles `src/` to `dist/` with tsc and ships the token colors as `dist/index.css`.
 * Runs as `prepare` too, which is what builds the package when it is installed from GitHub.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

rmSync('dist', { recursive: true, force: true });
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.build.json'], {
  stdio: 'inherit',
});
copyFileSync('theme/codeblocksyntaxhighlight.css', 'dist/index.css');
