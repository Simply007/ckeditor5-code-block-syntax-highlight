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
}
