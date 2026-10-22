import type { LanguageFn } from 'highlight.js';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import php from 'highlight.js/lib/languages/php';
import python from 'highlight.js/lib/languages/python';
import ruby from 'highlight.js/lib/languages/ruby';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';

/**
 * A highlight.js grammar for every language in the code block feature's default
 * `codeBlock.languages`, keyed by that list's `language` identifier (`cs` and `html` map onto
 * the C# and XML grammars). `plaintext` is intentionally absent. A test keeps this map in sync
 * with the default list.
 */
export const DEFAULT_GRAMMARS: Readonly<Record<string, LanguageFn>> = {
  c,
  cpp,
  cs: csharp,
  css,
  diff,
  go,
  html: xml,
  java,
  javascript,
  php,
  python,
  ruby,
  typescript,
  xml,
};
