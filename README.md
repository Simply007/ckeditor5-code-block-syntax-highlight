# CKEditor 5 code block syntax highlighting

Live syntax highlighting for [CKEditor 5](https://ckeditor.com/ckeditor-5/) code blocks, as you type.

CKEditor cannot colour code blocks natively, because its editing engine owns the DOM inside `<pre><code>`
([ckeditor5#436](https://github.com/ckeditor/ckeditor5/issues/436)). This plugin leaves that DOM alone. It tokenizes
each code block with [highlight.js](https://highlightjs.org/) and paints the tokens with the
[CSS Custom Highlight API](https://developer.mozilla.org/docs/Web/API/CSS_Custom_Highlight_API), which styles DOM
ranges without changing the tree. That keeps it safe alongside the renderer, real-time collaboration, comments, and
track changes.

Highlighting is a view-only effect. The editor data, `getData()` output, and exported documents are unchanged.

## Installation

The package is not on npm. Install it from GitHub, pinned to a release tag:

```shell
pnpm add github:Simply007/ckeditor5-code-block-syntax-highlight#v0.1.0
```

Installing from GitHub runs the package's `prepare` script, which compiles it. pnpm 10 skips dependency build scripts
unless they are allowed, so list the package in your `pnpm-workspace.yaml`:

```yaml
onlyBuiltDependencies:
  - ckeditor5-code-block-syntax-highlight
```

The plugin needs `ckeditor5` 48.x as a peer dependency.

## Usage

Add the plugin next to `CodeBlock` and import the token colours once:

```ts
import { ClassicEditor, CodeBlock, Essentials, Paragraph } from 'ckeditor5';
import { CodeBlockSyntaxHighlight } from 'ckeditor5-code-block-syntax-highlight';

import 'ckeditor5/ckeditor5.css';
import 'ckeditor5-code-block-syntax-highlight/index.css';

ClassicEditor.create(document.querySelector('#editor'), {
  licenseKey: '<YOUR_LICENSE_KEY>',
  plugins: [Essentials, Paragraph, CodeBlock, CodeBlockSyntaxHighlight],
  toolbar: ['codeBlock'],
});
```

Every language in the code block feature's default `codeBlock.languages` list is highlighted out of the box:
C, C#, C++, CSS, Diff, Go, HTML, Java, JavaScript, PHP, Python, Ruby, TypeScript and XML. Plain text stays plain.

## Configuration

### `codeBlockSyntaxHighlight.grammars`

A map of highlight.js grammars keyed by code block language identifier, the `language` field of a
`codeBlock.languages` entry. It is merged over the built-in grammars:

- **A new key** adds a language.
- **An existing key** replaces that language's grammar.
- **`false`** leaves that language unhighlighted.

```ts
import rust from 'highlight.js/lib/languages/rust';

ClassicEditor.create(element, {
  // …
  codeBlock: {
    languages: [
      { language: 'javascript', label: 'JavaScript' },
      { language: 'rust', label: 'Rust' },
      { language: 'diff', label: 'Diff' },
    ],
  },
  codeBlockSyntaxHighlight: {
    grammars: { rust, diff: false },
  },
});
```

Import grammars statically, as above, so your bundler includes them. The built-in map is exported as
`DEFAULT_GRAMMARS`.

### Theming

Colours live in CSS custom properties, so a theme is a stylesheet rather than an editor option. The defaults follow the
GitHub Light palette. Override any of them after importing `index.css`:

```css
:root {
  --ck-code-highlight-keyword: #ff7b72;
  --ck-code-highlight-string: #a5d6ff;
  --ck-code-highlight-comment: #8b949e;
  --ck-code-highlight-number: #79c0ff;
  --ck-code-highlight-title: #d2a8ff;
  --ck-code-highlight-attr: #ffa657;
  --ck-code-highlight-tag: #7ee787;
  --ck-code-highlight-addition: #aff5b4;
  --ck-code-highlight-addition-background: #033a16;
  --ck-code-highlight-deletion: #ffdcd7;
  --ck-code-highlight-deletion-background: #67060c;
}
```

`::highlight()` rules accept only colour, background and text-decoration properties, so tokens cannot change weight or
style.

## Browser support

The CSS Custom Highlight API ships in every evergreen browser: Chrome and Edge 105, Safari 17.2, and Firefox 140. In a
browser without it, the plugin logs a warning and the editor works normally without colours.

## Behaviour worth knowing

- **Several editors on one page** share the page-wide highlight registry safely. Each editor adds and removes only its
  own ranges, and keeps its own highlight.js instance, so one editor's `grammars` never reach another.
- **Multi-root editors** are highlighted in every root.
- **Performance**: each render schedules one highlight pass per animation frame, covering every code block. A typical
  document takes well under a millisecond per pass. Very large code blocks cost more, because the whole document is
  re-tokenized on each change.

## Development

```shell
pnpm install   # also builds dist/ through the prepare script
pnpm dev       # sample page with live reload, running the plugin from src/
pnpm check     # format, lint, typecheck and tests, as CI runs them
pnpm build     # compile to dist/
```

See [CLAUDE.md](CLAUDE.md) for architecture notes and conventions.

## License

GPL-2.0-or-later.
