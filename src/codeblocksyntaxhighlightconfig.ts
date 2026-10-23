import type { LanguageFn } from 'highlight.js';

/**
 * The `codeBlockSyntaxHighlight` editor configuration.
 *
 * ```ts
 * import rust from 'highlight.js/lib/languages/rust';
 *
 * ClassicEditor.create( {
 *   plugins: [ CodeBlock, CodeBlockSyntaxHighlight ],
 *   codeBlock: {
 *     languages: [ { language: 'rust', label: 'Rust' }, { language: 'diff', label: 'Diff' } ]
 *   },
 *   codeBlockSyntaxHighlight: {
 *     grammars: { rust, diff: false }
 *   }
 * } );
 * ```
 */
export interface CodeBlockSyntaxHighlightConfig {
  /**
   * highlight.js grammars keyed by code block language identifier (the `language` field of a
   * `codeBlock.languages` entry). The map is merged over {@link DEFAULT_GRAMMARS}: a new key adds a
   * language, an existing key replaces its grammar, and `false` leaves that language unhighlighted.
   *
   * Code blocks whose language has no grammar are left as plain text.
   */
  grammars?: Record<string, LanguageFn | false>;

  /**
   * Whether to reuse a code block's tokens while its text and language are unchanged. Defaults to `true`.
   *
   * Every editing-view render triggers a highlight pass over all code blocks: typing anywhere in the
   * document, a caret move, a remote user's change. With the cache, a pass re-runs highlight.js only
   * for the code blocks whose text changed. Without it, every pass re-tokenizes every code block.
   *
   * The cache holds one token list per rendered code block and is released with the block, so its
   * memory cost is proportional to the code on screen. Set it to `false` to trade that memory for
   * re-tokenizing on every pass.
   */
  tokenCache?: boolean;
}
