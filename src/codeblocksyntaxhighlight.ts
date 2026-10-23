import { CodeBlock, Plugin } from 'ckeditor5';
import hljsCore from 'highlight.js/lib/core';
import type { HLJSApi } from 'highlight.js';

import type { CodeBlockSyntaxHighlightConfig } from './codeblocksyntaxhighlightconfig.js';
import { DEFAULT_GRAMMARS } from './grammars.js';
import { replaceRanges, supportsCustomHighlights } from './highlights.js';
import {
  addTokenRanges,
  readCodeText,
  tokenizeCode,
  type CodeToken,
  type RangesByBucket,
  type TextSegment,
} from './tokens.js';

/**
 * Live syntax highlighting for code blocks in the editing view.
 *
 * CKEditor cannot highlight code blocks natively because the editing engine owns the
 * DOM inside `<pre><code>` (https://github.com/ckeditor/ckeditor5/issues/436). Instead
 * of mutating that DOM, this plugin tokenizes each code block with highlight.js and
 * paints the tokens with the CSS Custom Highlight API (`CSS.highlights` + `::highlight()`
 * rules), which styles plain DOM ranges without touching the tree — safe with the
 * renderer, real-time collaboration, comments, and track changes.
 *
 * The colors come from the package stylesheet, `@simply007org/ckeditor5-code-block-syntax-highlight/index.css`.
 */
export class CodeBlockSyntaxHighlight extends Plugin {
  /** This editor's own highlight.js instance, so its grammars never leak into another editor. */
  private readonly _hljs: HLJSApi = hljsCore.newInstance();

  /**
   * The code block languages with a grammar. Checked instead of `getLanguage()`, which also
   * matches a grammar's aliases and would highlight a language configured as `false`.
   */
  private readonly _languages = new Set<string>();

  /**
   * The last tokenization of each rendered `<code>`, reused while its text and language are unchanged.
   * `null` when `tokenCache` is off. Keyed weakly, so an entry goes away with its element.
   */
  private _tokenCache: WeakMap<Element, { language: string; text: string; tokens: CodeToken[] }> | null = null;

  /** The ranges this editor currently contributes to the shared highlights. */
  private _ranges: RangesByBucket = new Map();

  private _rafHandle: number | null = null;

  static get pluginName() {
    return 'CodeBlockSyntaxHighlight' as const;
  }

  static get requires() {
    return [CodeBlock] as const;
  }

  init() {
    if (!supportsCustomHighlights()) {
      console.warn('CodeBlockSyntaxHighlight: CSS Custom Highlight API not available, skipping.');
      return;
    }

    const config: CodeBlockSyntaxHighlightConfig = this.editor.config.get('codeBlockSyntaxHighlight') ?? {};
    const grammars = { ...DEFAULT_GRAMMARS, ...config.grammars };

    if (config.tokenCache ?? true) {
      this._tokenCache = new WeakMap();
    }

    for (const [language, grammar] of Object.entries(grammars)) {
      if (grammar) {
        this._hljs.registerLanguage(language, grammar);
        this._languages.add(language);
      }
    }

    // Rendering replaces text nodes inside code blocks, which detaches previously
    // registered ranges — rebuild after every render, coalesced to one pass per frame.
    // Note: `render` is fired by the View, not the ViewDocument.
    this.listenTo(this.editor.editing.view, 'render', () => this._scheduleHighlight());
  }

  override destroy() {
    super.destroy();

    if (this._rafHandle !== null) {
      cancelAnimationFrame(this._rafHandle);
    }

    if (supportsCustomHighlights()) {
      replaceRanges(this._ranges, new Map());
      this._ranges = new Map();
    }
  }

  private _scheduleHighlight(): void {
    if (this._rafHandle !== null) {
      return;
    }

    this._rafHandle = requestAnimationFrame(() => {
      this._rafHandle = null;
      this._highlightAllCodeBlocks();
    });
  }

  private _highlightAllCodeBlocks(): void {
    const ranges: RangesByBucket = new Map();

    // Every root, so multi-root editors are covered too.
    for (const domRoot of this.editor.editing.view.domRoots.values()) {
      for (const codeElement of domRoot.querySelectorAll('pre > code')) {
        const language = this._getCodeBlockLanguage(codeElement);

        if (language && this._languages.has(language)) {
          this._addCodeBlockRanges(codeElement, language, ranges);
        }
      }
    }

    replaceRanges(this._ranges, ranges);
    this._ranges = ranges;
  }

  /** Tokenizes one rendered code block, or reuses its cached tokens, and adds a `Range` per token to `ranges`. */
  private _addCodeBlockRanges(codeElement: Element, language: string, ranges: RangesByBucket): void {
    const segments: TextSegment[] = [];
    const text = readCodeText(codeElement, segments);

    if (!text.trim()) {
      return;
    }

    const cached = this._tokenCache?.get(codeElement);
    const tokens =
      cached?.language === language && cached.text === text ? cached.tokens : tokenizeCode(this._hljs, text, language);

    if (!tokens) {
      return;
    }

    this._tokenCache?.set(codeElement, { language, text, tokens });
    addTokenRanges(segments, tokens, ranges);
  }

  /**
   * The `language` attribute of the model code block a rendered `<code>` belongs to. Read from the
   * model rather than the classes, which `codeBlock.languages` can set to anything.
   */
  private _getCodeBlockLanguage(codeElement: Element): string | undefined {
    const { domConverter } = this.editor.editing.view;
    const viewElement = domConverter.mapDomToView(codeElement as HTMLElement);
    const modelElement = viewElement?.is('element')
      ? this.editor.editing.mapper.toModelElement(viewElement)
      : undefined;
    const language = modelElement?.is('element', 'codeBlock') ? modelElement.getAttribute('language') : undefined;

    return typeof language === 'string' ? language : undefined;
  }
}
