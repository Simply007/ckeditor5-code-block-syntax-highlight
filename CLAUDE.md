# CLAUDE.md

Guidance for AI coding agents working in this repository. `AGENTS.md` is a symlink to this file, so every agent reads
the same instructions.

## Project overview

A CKEditor 5 plugin, `CodeBlockSyntaxHighlight`, that colours code blocks live in the editing view. It tokenizes each
rendered `<pre><code>` with highlight.js and paints the tokens with the CSS Custom Highlight API (`CSS.highlights` plus
`::highlight()` rules). It never mutates the editing DOM. That is the whole point of the design: CKEditor's renderer
owns that DOM, and any node the plugin inserted would be removed on the next render or break collaboration.

The package is distributed from GitHub, not npm. Consumers install a tag, and `prepare` builds `dist/` on install.

## Layout

- `src/index.ts`: the public API — the plugin, its config type, and `DEFAULT_GRAMMARS`. Anything not exported here is
  internal.
- `src/codeblocksyntaxhighlight.ts`: the `Plugin`. Reads config, registers grammars on its own highlight.js instance,
  and runs one highlight pass per animation frame after each view `render`.
- `src/tokens.ts`: the DOM tokenizer. Flattens a code block to text, runs highlight.js, and maps each token back to a
  DOM `Range`. Also holds the token buckets and the highlight.js scope-to-bucket map.
- `src/highlights.ts`: the shared `CSS.highlights` layer. Feature detection, and `replaceRanges()`, which swaps one
  editor's ranges in the page-wide registry without touching other editors' ranges.
- `src/grammars.ts`: `DEFAULT_GRAMMARS`, one grammar per default `codeBlock.languages` entry.
- `src/codeblocksyntaxhighlightconfig.ts`: the `codeBlockSyntaxHighlight` config interface.
- `src/augmentation.ts`: adds the config key to `EditorConfig` and the plugin to `PluginsMap`.
- `theme/codeblocksyntaxhighlight.css`: token colours as `--ck-code-highlight-*` custom properties. The build copies it
  to `dist/index.css`, exported as `ckeditor5-code-block-syntax-highlight/index.css`.
- `tests/`: Vitest suites in jsdom. `tests/setup.ts` installs the no-op `ResizeObserver` a real editor needs.
- `sample/`: the `pnpm dev` page, running the plugin from `src/` with a custom Rust grammar.
- `scripts/build.js`: `tsc -p tsconfig.build.json` plus the CSS copy.

## Invariants

- **Never touch the editing DOM.** Read it, build `Range`s over it, register those ranges. Nothing else.
- **Listen to `editor.editing.view`'s `render`, not `view.document`.** `render` fires on the `View`. Each render
  replaces code block text nodes and detaches old ranges, so every pass rebuilds all ranges from scratch.
- **The registry is page-wide.** Several editors can run on one page. Use `replaceRanges()` so each editor adds and
  removes only its own ranges. Never `CSS.highlights.set()` a name another editor may share.
- **Each editor owns a highlight.js instance** (`hljs.newInstance()`), so one editor's `grammars` config cannot leak
  into another. Do not register grammars on the global `highlight.js` singleton.
- **Gate on configured keys, not `getLanguage()`.** highlight.js resolves aliases, so `getLanguage('html')` finds the
  XML grammar even when `html` is configured as `false`.
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
pnpm test          # Vitest once
pnpm test:watch    # Vitest in watch mode
pnpm typecheck     # tsc --noEmit
pnpm lint          # ESLint
pnpm format        # Prettier write
pnpm check         # format:check, lint, typecheck, test, as CI runs them
pnpm build         # compile to dist/
```

`pnpm-workspace.yaml` marks this folder as its own pnpm root. Without it, pnpm can adopt a workspace file from a parent
directory and install somewhere else.

`@ckeditor/ckeditor5-core` is a dev dependency only so that `augmentation.ts` resolves in this repo. pnpm does not hoist
it to the root. Keep its version equal to `ckeditor5`'s. Consumers resolve it through `ckeditor5`'s own dependency.

## Releasing

1. Bump `version` in `package.json`.
2. Commit, then tag `v<version>` and push the tag.
3. Consumers move their `github:Simply007/ckeditor5-code-block-syntax-highlight#v<version>` dependency to the new tag.

`dist/` is not committed. It is built on install.

## Agent skills

`.agents/skills/` holds the CKEditor skills from [`ckeditor/skills`](https://github.com/ckeditor/skills), installed with
the `skills` CLI and pinned in `skills-lock.json`. `.claude/skills/` symlinks to them for Claude Code.

- `ckeditor`: setting up and configuring CKEditor 5, including the sample page.
- `ckeditor-update`: upgrading CKEditor 5. After an upgrade, also bump `@ckeditor/ckeditor5-core` and the
  `ckeditor5` peer range, and check the `DEFAULT_GRAMMARS` test.

Refresh them with `npx skills update -p`, and restore them from the lock file with `npx skills experimental_install`.
