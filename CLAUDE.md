# CLAUDE.md

Guidance for AI coding agents working in this repository. `AGENTS.md` is a symlink to this file, so every agent reads
the same instructions.

## Project overview

A CKEditor 5 plugin, `CodeBlockSyntaxHighlight`, that colours code blocks live in the editing view. It tokenizes each
rendered `<pre><code>` with highlight.js and paints the tokens with the CSS Custom Highlight API (`CSS.highlights` plus
`::highlight()` rules). It never mutates the editing DOM. That is the whole point of the design: CKEditor's renderer
owns that DOM, and any node the plugin inserted would be removed on the next render or break collaboration.

The package is published to npm as `@simply007org/ckeditor5-code-block-syntax-highlight`. It can also be installed from a GitHub tag, in which case `prepare` builds
`dist/` on install.

## Layout

- `src/index.ts`: the public API — the plugin, its config type, and `DEFAULT_GRAMMARS`. Anything not exported here is
  internal.
- `src/codeblocksyntaxhighlight.ts`: the `Plugin`. Reads config, registers grammars on its own highlight.js instance,
  and runs one highlight pass per animation frame after each view `render`.
- `src/tokens.ts`: the DOM tokenizer. `readCodeText()` flattens a code block to text, `tokenizeCode()` runs highlight.js
  into text-offset tokens, and `addTokenRanges()` maps tokens back to DOM `Range`s. Also holds the token buckets and the highlight.js scope-to-bucket map.
- `src/highlights.ts`: the shared `CSS.highlights` layer. Feature detection, and `replaceRanges()`, which swaps one
  editor's ranges in the page-wide registry without touching other editors' ranges.
- `src/grammars.ts`: `DEFAULT_GRAMMARS`, one grammar per default `codeBlock.languages` entry.
- `src/codeblocksyntaxhighlightconfig.ts`: the `codeBlockSyntaxHighlight` config interface.
- `src/augmentation.ts`: adds the config key to `EditorConfig` and the plugin to `PluginsMap`.
- `theme/codeblocksyntaxhighlight.css`: token colours as `--ck-code-highlight-*` custom properties. The build copies it
  to `dist/index.css`, exported as `@simply007org/ckeditor5-code-block-syntax-highlight/index.css`.
- `tests/`: Vitest suites in jsdom. `tests/setup.ts` installs the no-op `ResizeObserver` a real editor needs.
- `sample/`: the `pnpm dev` page, running the plugin from `src/` with a custom Rust grammar. `sample/landing.html` is the
  Pages landing page that links to each CKEditor build.
- `scripts/build-pages.js`: builds the sample once per supported CKEditor major into `site/v<major>/` and copies the
  landing page to `site/index.html`. `.github/workflows/pages.yml` deploys `site/` on every push to `main`.
- `scripts/build.js`: `tsc -p tsconfig.build.json` plus the CSS copy.

## Invariants

- **Never touch the editing DOM.** Read it, build `Range`s over it, register those ranges. Nothing else.
- **Listen to `editor.editing.view`'s `render`, not `view.document`.** `render` fires on the `View`. Each render
  replaces code block text nodes and detaches old ranges, so every pass rebuilds all ranges from scratch.
- **The registry is page-wide.** Several editors can run on one page. Use `replaceRanges()` so each editor adds and
  removes only its own ranges. Never `CSS.highlights.set()` a name another editor may share.
- **Each editor owns a highlight.js instance** (`hljs.newInstance()`), so one editor's `grammars` config cannot leak
  into another. Do not register grammars on the global `highlight.js` singleton.
- **Read the language from the model, not the classes.** Each rendered `<code>` maps back through the editing
  mapper to its `codeBlock` and that element's `language` attribute. `codeBlock.languages` lets integrators set any
  `class`, so parsing `language-*` classes misses custom classes and misreads unrelated ones.
- **Gate on configured keys, not `getLanguage()`.** highlight.js resolves aliases, so `getLanguage('html')` finds the
  XML grammar even when `html` is configured as `false`.
- **Tokens are cached, ranges are not.** `tokenizeCode()` is the expensive step, so the plugin keeps each rendered
  `<code>` element's tokens in a `WeakMap` and reuses them while the text and language match. `addTokenRanges()` still
  rebuilds every `Range` on every pass, because a render can replace the text nodes. The `tokenCache: false` option
  turns the cache off.
- **Offsets must survive the HTML re-parse.** highlight.js output is parsed back to recover token offsets, and the HTML
  parser collapses `\r\n`. `highlightCode()` replaces each `\r` with `\n` first, which keeps offsets one-to-one.
- **Grammars are static imports**, so bundlers include them. `DEFAULT_GRAMMARS` must match the code block feature's
  default `codeBlock.languages`. A test enforces this, and it will fail when a CKEditor upgrade changes that list.

## Testing

Tests mount a real `ClassicEditor` with `licenseKey: 'GPL'`, so the plugin runs against the real view and real `render`
events. jsdom has no CSS Custom Highlight API. The suite stubs `Highlight` as a `Set` of ranges, which is what the
browser's `Highlight` is, and `CSS.highlights` as a `Map`. Assertions read the painted text back from those stubs.

A test earns its place when a failure would be silent: a token painted at the wrong offset, a stale bucket left
registered, or one editor wiping another's highlights. Visual output, meaning the colours themselves, is checked by
running `pnpm dev`.

## Commands

```shell
pnpm install       # installs and builds dist/ through prepare
pnpm dev           # Vite sample page
pnpm test          # Vitest once, on CKEditor 48
pnpm test:v49      # Vitest once, on CKEditor 49
pnpm test:watch    # Vitest in watch mode
pnpm typecheck     # tsc --noEmit
pnpm lint          # ESLint
pnpm format        # Prettier write
pnpm check         # format:check, lint, typecheck, test, test:v49, as CI runs them
pnpm build         # compile to dist/
pnpm build:pages   # build the sample for every supported major into site/
```

`pnpm-workspace.yaml` marks this folder as its own pnpm root. Without it, pnpm can adopt a workspace file from a parent
directory and install somewhere else.

`@ckeditor/ckeditor5-core` is a dev dependency only so that `augmentation.ts` resolves in this repo. pnpm does not hoist
it to the root. Keep its version equal to `ckeditor5`'s. Consumers resolve it through `ckeditor5`'s own dependency.

## Supported CKEditor versions

The plugin supports CKEditor 5 majors 48 and 49, declared as the `ckeditor5` peer range. Both are installed: 48 as the
plain `ckeditor5` dev dependency, and 49 under the npm alias `ckeditor5-v49`. Setting `CKEDITOR_MAJOR=49` makes Vite and
Vitest resolve every `ckeditor5` import to the alias, the plugin's own imports included, so each run loads exactly one
CKEditor. `ckeditorAliases()` in `vite.config.ts` does this, and `vitest.config.ts` reuses it. Typechecking runs against
48 only, the lowest supported major.

To add a major, or drop one, update all of these together:

1. The `ckeditor5` peer range in `package.json`, and the aliased `ckeditor5-v<major>` dev dependency.
2. `CKEDITOR_MAJORS` in `vite.config.ts`.
3. The `majors` list in `scripts/build-pages.js`.
4. The version links in `sample/main.ts` and the cards in `sample/landing.html`.
5. The `test:v<major>` script and `check` in `package.json`.

When the lowest major changes, also move the plain `ckeditor5` and `@ckeditor/ckeditor5-core` dev dependencies to it.

## Releasing

Releases publish to npm from GitHub Actions, through npm trusted publishing, so no npm token is stored anywhere.

1. Bump `version` in `package.json` and commit.
2. Tag `v<version>` and push the tag.
3. `.github/workflows/release.yml` checks that the tag matches `package.json`, runs `pnpm check`, and runs
   `npm publish`, which attaches a provenance statement.

`prepublishOnly` runs `pnpm check`, and `prepare` builds `dist/`, so a manual `npm publish` is gated the same way.
`dist/` is not committed. The tarball ships `dist/` and `src/`, so the source maps resolve.

## Agent skills

`.agents/skills/` holds the CKEditor skills from [`ckeditor/skills`](https://github.com/ckeditor/skills), installed with
the `skills` CLI and pinned in `skills-lock.json`. `.claude/skills/` symlinks to them for Claude Code.

- `ckeditor`: setting up and configuring CKEditor 5, including the sample page.
- `ckeditor-update`: upgrading CKEditor 5. A new major also needs the steps under "Supported CKEditor versions", and
  the `DEFAULT_GRAMMARS` test checked on it.

Refresh them with `npx skills update -p`, and restore them from the lock file with `npx skills experimental_install`.
