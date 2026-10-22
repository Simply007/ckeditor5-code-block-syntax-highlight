import type { HLJSApi } from 'highlight.js';

/** The color buckets highlight.js scopes collapse into; each has a `::highlight(ck-code-*)` rule. */
export const TOKEN_BUCKETS = [
  'keyword',
  'string',
  'comment',
  'number',
  'title',
  'attr',
  'tag',
  'addition',
  'deletion',
] as const;

export type TokenBucket = (typeof TOKEN_BUCKETS)[number];

/** Every bucket's ranges for one highlight pass. */
export type RangesByBucket = Map<TokenBucket, Range[]>;

const HLJS_SCOPE_TO_BUCKET: Record<string, TokenBucket | undefined> = {
  keyword: 'keyword',
  literal: 'keyword',
  built_in: 'keyword',
  type: 'keyword',
  operator: 'keyword',
  string: 'string',
  regexp: 'string',
  char: 'string',
  subst: 'string',
  comment: 'comment',
  quote: 'comment',
  doctag: 'comment',
  number: 'number',
  symbol: 'number',
  title: 'title',
  function_: 'title',
  class_: 'title',
  section: 'title',
  attr: 'attr',
  attribute: 'attr',
  property: 'attr',
  variable: 'attr',
  params: 'attr',
  'template-variable': 'attr',
  tag: 'tag',
  name: 'tag',
  meta: 'tag',
  'selector-tag': 'tag',
  'selector-id': 'tag',
  'selector-class': 'tag',
  'selector-attr': 'tag',
  'selector-pseudo': 'tag',
  bullet: 'tag',
  addition: 'addition',
  deletion: 'deletion',
};

/** A DOM text node's slice of the code block's full text, by global character offset. */
interface TextSegment {
  node: Text;
  start: number;
  end: number;
}

/**
 * Tokenizes one rendered code block and appends a DOM `Range` per token to `rangesByBucket`.
 */
export function collectTokenRanges(
  codeElement: Element,
  hljs: HLJSApi,
  language: string,
  rangesByBucket: RangesByBucket,
): void {
  const segments: TextSegment[] = [];
  const text = readCodeText(codeElement, segments);

  if (!text.trim()) {
    return;
  }

  const highlightedHtml = highlightCode(hljs, text, language);

  if (highlightedHtml === null) {
    return;
  }

  // highlight.js emits HTML with the exact source text inside scope spans — parse it detached
  // and walk it to recover (offset, length, scope) triplets.
  const template = document.createElement('template');
  template.innerHTML = highlightedHtml;

  let offset = 0;

  const walk = (node: Node, bucket: TokenBucket | undefined): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.nodeValue?.length ?? 0;

      if (bucket && length > 0) {
        const range = createRangeForSpan(segments, offset, offset + length);

        if (range) {
          let ranges = rangesByBucket.get(bucket);

          if (!ranges) {
            ranges = [];
            rangesByBucket.set(bucket, ranges);
          }

          ranges.push(range);
        }
      }

      offset += length;
      return;
    }

    let childBucket = bucket;

    if (node instanceof Element) {
      const scope = Array.from(node.classList)
        .find((cls) => cls.startsWith('hljs-'))
        ?.slice('hljs-'.length);

      // Inner scopes win over outer ones (e.g. `hljs-title function_` inside `hljs-function`).
      childBucket = (scope && HLJS_SCOPE_TO_BUCKET[scope]) || bucket;
    }

    for (const child of node.childNodes) {
      walk(child, childBucket);
    }
  };

  walk(template.content, undefined);
}

/**
 * Runs highlight.js over the code and returns its HTML output, or `null` when the grammar
 * rejects the input. The HTML parser normalizes `\r` and `\r\n` to `\n` when that output is
 * re-parsed, which would desync the offsets from the DOM text — replacing each `\r` with `\n`
 * beforehand is one-to-one, so every offset keeps pointing at the same DOM character.
 */
function highlightCode(hljs: HLJSApi, text: string, language: string): string | null {
  try {
    return hljs.highlight(text.replace(/\r/g, '\n'), { language, ignoreIllegals: true }).value;
  } catch {
    return null;
  }
}

/**
 * Flattens the code block's rendered DOM to the source string highlight.js sees, recording
 * which text node covers which character span. `<br>` elements (CKEditor soft breaks) count
 * as newlines; block fillers are skipped.
 */
function readCodeText(root: Element, segments: TextSegment[]): string {
  let text = '';

  const visit = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const data = node.nodeValue ?? '';

      segments.push({ node: node as Text, start: text.length, end: text.length + data.length });
      text += data;
      return;
    }

    if (node instanceof Element) {
      if (node.hasAttribute('data-cke-filler')) {
        return;
      }

      if (node.tagName === 'BR') {
        text += '\n';
        return;
      }
    }

    for (const child of node.childNodes) {
      visit(child);
    }
  };

  visit(root);

  return text;
}

/**
 * Builds a DOM range covering `[start, end)` in global text offsets, or `null` when the
 * span falls entirely on soft breaks.
 */
function createRangeForSpan(segments: TextSegment[], start: number, end: number): Range | null {
  let startSegment: TextSegment | undefined;
  let endSegment: TextSegment | undefined;

  for (const segment of segments) {
    if (segment.start < end && segment.end > start) {
      startSegment ??= segment;
      endSegment = segment;
    }
  }

  if (!startSegment || !endSegment) {
    return null;
  }

  const range = new Range();

  range.setStart(startSegment.node, Math.max(0, start - startSegment.start));
  range.setEnd(endSegment.node, Math.min(endSegment.end, end) - endSegment.start);

  return range;
}
