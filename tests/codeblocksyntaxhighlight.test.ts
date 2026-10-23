import { ClassicEditor, Essentials, Paragraph, type EditorConfig } from 'ckeditor5';
import type { HLJSApi } from 'highlight.js';
import hljsCore from 'highlight.js/lib/core';
import rust from 'highlight.js/lib/languages/rust';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CodeBlockSyntaxHighlight, DEFAULT_GRAMMARS } from '../src/index.js';

/**
 * These tests mount a real `ClassicEditor`: the plugin reads the rendered editing-view DOM and
 * reacts to real `render` events, so a hand-made DOM would only test itself. jsdom has no CSS
 * Custom Highlight API, so `Highlight` is stubbed with a `Set` of ranges (which is what the
 * browser's `Highlight` is) and `CSS.highlights` with a plain `Map` — together they capture
 * exactly what the browser would paint.
 */
class HighlightStub extends Set<Range> {
  constructor(...ranges: Range[]) {
    super(ranges);
  }
}

const editors = new Set<ClassicEditor>();
let registry: Map<string, HighlightStub>;

async function createEditor(initialData: string, config: EditorConfig = {}) {
  const editor = await ClassicEditor.create({
    licenseKey: 'GPL',
    plugins: [Essentials, Paragraph, CodeBlockSyntaxHighlight],
    root: { initialData },
    ...config,
  });

  editors.add(editor);

  return editor;
}

async function destroyEditor(editor: ClassicEditor) {
  editors.delete(editor);
  await editor.destroy();
}

/** The plugin coalesces work into one `requestAnimationFrame` pass; resolves after it ran. */
function afterHighlightPass() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

/** The text each range of a bucket's highlight covers, e.g. `['const', 'let']` for `keyword`. */
function paintedTokens(bucket: string): string[] {
  return [...(registry.get(`ck-code-${bucket}`) ?? [])].map((range) => range.toString());
}

beforeEach(() => {
  registry = new Map();

  // jsdom defines no `CSS` global at all; `unstubGlobals` removes both stubs again.
  vi.stubGlobal('Highlight', HighlightStub);
  vi.stubGlobal('CSS', { highlights: registry });
});

afterEach(async () => {
  // Destroy while the stubs are still in place — `destroy()` cleans `CSS.highlights` up itself.
  await Promise.all([...editors].map(destroyEditor));
});

describe('CodeBlockSyntaxHighlight', () => {
  it('bundles a grammar for exactly the languages the code block feature offers by default', async () => {
    const editor = await createEditor('');

    const codeBlockLanguages = editor.config
      .get('codeBlock.languages')!
      .map(({ language }) => language)
      .filter((language) => language !== 'plaintext');

    expect(Object.keys(DEFAULT_GRAMMARS).sort()).toEqual(codeBlockLanguages.sort());
  });

  it('paints each token kind over exactly its source text', async () => {
    await createEditor('<pre><code class="language-javascript">const greeting = "hi"; // wave</code></pre>');
    await afterHighlightPass();

    expect(paintedTokens('keyword')).toEqual(['const']);
    expect(paintedTokens('string')).toEqual(['"hi"']);
    expect(paintedTokens('comment')).toEqual(['// wave']);
  });

  it('maps tokens behind a soft break into the following text node', async () => {
    // The two lines render as sibling text nodes separated by a `<br>`, so the second `const`
    // only lands correctly when the `\n` offset bookkeeping is right.
    await createEditor('<pre><code class="language-javascript">const a = 1;\nconst b = 2;</code></pre>');
    await afterHighlightPass();

    expect(paintedTokens('keyword')).toEqual(['const', 'const']);
    expect(paintedTokens('number')).toEqual(['1', '2']);

    const [first, second] = registry.get('ck-code-keyword')!;

    expect(second.startContainer).not.toBe(first.startContainer);
    expect(second.startContainer.textContent).toBe('const b = 2;');
  });

  it('keeps offsets aligned when the code contains carriage returns', async () => {
    // Typing and pasting never produce `\r` (CKEditor normalizes those paths), but programmatic
    // model text can carry it. The HTML parser collapses `\r\n` to `\n` while re-parsing the
    // highlight.js output, which would shift every token after the first `\r` one character off.
    const editor = await createEditor('');
    const model = editor.model;

    model.change((writer) => {
      const root = model.document.getRoot()!;

      writer.remove(writer.createRangeIn(root));

      const codeBlock = writer.createElement('codeBlock', { language: 'javascript' });

      writer.append(codeBlock, root);
      writer.appendText('const a = 1;\r\nlet b = 2;', codeBlock);
    });

    await afterHighlightPass();

    expect(paintedTokens('keyword')).toEqual(['const', 'let']);
  });

  it('lets an inner highlight.js scope win over the enclosing one', async () => {
    // highlight.js nests the attribute and value spans inside one `hljs-tag` span; the
    // enclosing bucket must only paint the text the inner scopes leave uncovered.
    await createEditor('<pre><code class="language-html">&lt;div class="a"&gt;&lt;/div&gt;</code></pre>');
    await afterHighlightPass();

    expect(paintedTokens('tag')).toContain('div');
    expect(paintedTokens('attr')).toEqual(['class']);
    expect(paintedTokens('string')).toEqual(['"a"']);
    expect(paintedTokens('tag')).not.toContain('class');
  });

  it('registers no highlights for a plaintext code block', async () => {
    await createEditor('<pre><code class="language-plaintext">const looksLikeCode = true;</code></pre>');
    await afterHighlightPass();

    expect(registry.size).toBe(0);
  });

  it.each([
    ['empty', '<pre><code class="language-javascript"></code></pre>'],
    ['whitespace-only', '<pre><code class="language-javascript">   </code></pre>'],
  ])('registers no highlights for an %s code block', async (_label, initialData) => {
    await createEditor(initialData);
    await afterHighlightPass();

    expect(registry.size).toBe(0);
  });

  it('rebuilds the highlights when the code changes', async () => {
    const editor = await createEditor('<pre><code class="language-javascript">const s = "x";</code></pre>');
    await afterHighlightPass();

    expect(paintedTokens('string')).toEqual(['"x"']);

    editor.setData('<pre><code class="language-javascript">let n = 42;</code></pre>');
    await afterHighlightPass();

    expect(paintedTokens('keyword')).toEqual(['let']);
    expect(paintedTokens('number')).toEqual(['42']);
    // A bucket that lost all its tokens must be unregistered, not left painting stale ranges.
    expect(registry.has('ck-code-string')).toBe(false);
  });

  it('unregisters every highlight on destroy', async () => {
    const editor = await createEditor('<pre><code class="language-javascript">const a = 1;</code></pre>');
    await afterHighlightPass();

    expect(registry.size).toBeGreaterThan(0);

    await destroyEditor(editor);

    expect(registry.size).toBe(0);
  });

  it('starts without highlighting when the CSS Custom Highlight API is missing', async () => {
    vi.stubGlobal('CSS', undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const editor = await createEditor('<pre><code class="language-javascript">const a = 1;</code></pre>');
    await afterHighlightPass();

    expect(editor.getData()).toContain('const a = 1;');
    expect(warn).toHaveBeenCalledOnce();

    // `afterEach` destroys the editor with the stubs restored, which must not throw either.
    vi.stubGlobal('CSS', { highlights: registry });
  });

  describe('reading the code block language', () => {
    /** Replaces the document with one code block, so the test controls its model `language` directly. */
    function setCodeBlock(editor: ClassicEditor, language: string, code: string) {
      editor.model.change((writer) => {
        const root = editor.model.document.getRoot()!;

        writer.remove(writer.createRangeIn(root));

        const codeBlock = writer.createElement('codeBlock', { language });

        writer.append(codeBlock, root);
        writer.appendText(code, codeBlock);
      });
    }

    it('highlights a language configured with custom classes instead of `language-*`', async () => {
      const editor = await createEditor('', {
        codeBlock: { languages: [{ language: 'javascript', label: 'JavaScript', class: 'js javascript js-code' }] },
      });

      setCodeBlock(editor, 'javascript', 'const a = 1;');
      await afterHighlightPass();

      expect(paintedTokens('keyword')).toEqual(['const']);
    });

    it('ignores a class that merely contains `language-`', async () => {
      // The block is plain text; only its unrelated class mentions a highlightable language.
      const editor = await createEditor('', {
        codeBlock: { languages: [{ language: 'plaintext', label: 'Plain text', class: 'my-language-javascript' }] },
      });

      setCodeBlock(editor, 'plaintext', 'const looksLikeCode = true;');
      await afterHighlightPass();

      expect(registry.size).toBe(0);
    });
  });

  describe('the token cache', () => {
    /**
     * Each editor tokenizes through its own highlight.js instance, created when the plugin is.
     * Call before creating the editor; the returned function spies on that instance's `highlight()`.
     */
    function watchTokenizer() {
      const newInstance = vi.spyOn(hljsCore, 'newInstance');

      return () => vi.spyOn(newInstance.mock.results.at(-1)!.value as HLJSApi, 'highlight');
    }

    /** Re-renders the editing view without changing the document, as a caret move or remote cursor does. */
    async function renderWithoutChanges(editor: ClassicEditor) {
      editor.editing.view.forceRender();
      await afterHighlightPass();
    }

    it('repaints unchanged code without tokenizing it again', async () => {
      const spyOnHighlight = watchTokenizer();
      const editor = await createEditor('<pre><code class="language-javascript">const a = 1;</code></pre>');
      await afterHighlightPass();
      const highlight = spyOnHighlight();

      await renderWithoutChanges(editor);

      expect(highlight).not.toHaveBeenCalled();
      expect(paintedTokens('keyword')).toEqual(['const']);
    });

    it('tokenizes again only the code block whose text changed', async () => {
      const spyOnHighlight = watchTokenizer();
      const editor = await createEditor(
        '<pre><code class="language-javascript">const a = 1;</code></pre>' +
          '<pre><code class="language-python">def b(): pass</code></pre>',
      );
      await afterHighlightPass();
      const highlight = spyOnHighlight();

      editor.model.change((writer) => {
        const firstCodeBlock = editor.model.document.getRoot()!.getChild(0)!;

        writer.insertText(' let', writer.createPositionAt(firstCodeBlock, 'end'));
      });
      await afterHighlightPass();

      expect(highlight).toHaveBeenCalledOnce();
      expect(highlight.mock.calls[0][0]).toBe('const a = 1; let');
      expect(paintedTokens('keyword').sort()).toEqual(['const', 'def', 'let', 'pass']);
    });

    it('tokenizes again when only the language changes', async () => {
      const editor = await createEditor('<pre><code class="language-javascript">def f(): pass</code></pre>');
      await afterHighlightPass();

      expect(paintedTokens('keyword')).not.toContain('def');

      editor.model.change((writer) => {
        writer.setAttribute('language', 'python', editor.model.document.getRoot()!.getChild(0)!);
      });
      await afterHighlightPass();

      expect(paintedTokens('keyword')).toEqual(['def', 'pass']);
    });

    it('tokenizes every code block on every pass when `tokenCache` is `false`', async () => {
      const spyOnHighlight = watchTokenizer();
      const editor = await createEditor('<pre><code class="language-javascript">const a = 1;</code></pre>', {
        codeBlockSyntaxHighlight: { tokenCache: false },
      });
      await afterHighlightPass();
      const highlight = spyOnHighlight();

      await renderWithoutChanges(editor);

      expect(highlight).toHaveBeenCalledOnce();
      expect(paintedTokens('keyword')).toEqual(['const']);
    });
  });

  describe('with several editors on the page', () => {
    it('paints the tokens of every editor at once', async () => {
      await createEditor('<pre><code class="language-javascript">const a = 1;</code></pre>');
      await createEditor('<pre><code class="language-python">def b(): pass</code></pre>');
      await afterHighlightPass();

      expect(paintedTokens('keyword').sort()).toEqual(['const', 'def', 'pass']);
    });

    it('keeps the other editors painted when one changes or is destroyed', async () => {
      const first = await createEditor('<pre><code class="language-javascript">const a = 1;</code></pre>');
      await createEditor('<pre><code class="language-python">def b(): pass</code></pre>');
      await afterHighlightPass();

      first.setData('<pre><code class="language-javascript">let c = 2;</code></pre>');
      await afterHighlightPass();

      expect(paintedTokens('keyword').sort()).toEqual(['def', 'let', 'pass']);

      await destroyEditor(first);

      expect(paintedTokens('keyword').sort()).toEqual(['def', 'pass']);
    });
  });

  describe('the `grammars` option', () => {
    it('adds a language the defaults do not cover', async () => {
      await createEditor('<pre><code class="language-rust">fn main() {}</code></pre>', {
        codeBlock: { languages: [{ language: 'rust', label: 'Rust' }] },
        codeBlockSyntaxHighlight: { grammars: { rust } },
      });
      await afterHighlightPass();

      expect(paintedTokens('keyword')).toEqual(['fn']);
    });

    it('replaces the grammar of a default language', async () => {
      // `def` is a Python keyword but means nothing to the JavaScript grammar.
      await createEditor('<pre><code class="language-javascript">def f(): pass</code></pre>', {
        codeBlockSyntaxHighlight: { grammars: { javascript: DEFAULT_GRAMMARS.python } },
      });
      await afterHighlightPass();

      expect(paintedTokens('keyword')).toContain('def');
    });

    it('leaves a language set to `false` unhighlighted, even when another grammar aliases it', async () => {
      // The XML grammar, still registered for `xml`, declares `html` as one of its aliases.
      await createEditor('<pre><code class="language-html">&lt;div class="a"&gt;&lt;/div&gt;</code></pre>', {
        codeBlockSyntaxHighlight: { grammars: { html: false } },
      });
      await afterHighlightPass();

      expect(registry.size).toBe(0);
    });

    it('keeps one editor’s grammars out of another editor', async () => {
      await createEditor('', {
        codeBlock: { languages: [{ language: 'rust', label: 'Rust' }] },
        codeBlockSyntaxHighlight: { grammars: { rust } },
      });
      await createEditor('<pre><code class="language-rust">fn main() {}</code></pre>', {
        codeBlock: { languages: [{ language: 'rust', label: 'Rust' }] },
      });
      await afterHighlightPass();

      expect(registry.size).toBe(0);
    });
  });
});
