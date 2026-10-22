import { TOKEN_BUCKETS, type RangesByBucket } from './tokens.js';

/**
 * The page-wide `CSS.highlights` registry is shared by every editor on the page, so each
 * editor contributes its ranges to one `Highlight` per bucket instead of owning the entry.
 * Replacing the entry outright would wipe the tokens of every other editor.
 */

/** Feature-detects the CSS Custom Highlight API (available in all evergreen browsers). */
export function supportsCustomHighlights(): boolean {
  return typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined';
}

/** The `CSS.highlights` name a bucket is registered under, and the `::highlight()` the theme targets. */
export function highlightName(bucket: string): string {
  return `ck-code-${bucket}`;
}

/**
 * Swaps one editor's previous ranges for its next ones, bucket by bucket. A bucket's shared
 * `Highlight` is registered when its first range arrives and unregistered when its last one leaves.
 */
export function replaceRanges(previous: RangesByBucket, next: RangesByBucket): void {
  for (const bucket of TOKEN_BUCKETS) {
    const name = highlightName(bucket);
    let highlight = CSS.highlights.get(name);

    for (const range of previous.get(bucket) ?? []) {
      highlight?.delete(range);
    }

    const ranges = next.get(bucket) ?? [];

    if (ranges.length && !highlight) {
      highlight = new Highlight();
      CSS.highlights.set(name, highlight);
    }

    for (const range of ranges) {
      highlight!.add(range);
    }

    if (highlight?.size === 0) {
      CSS.highlights.delete(name);
    }
  }
}
