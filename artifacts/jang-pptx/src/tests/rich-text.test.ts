import { describe, expect, it } from 'vitest';
import { richTextToPlain, splitRichText } from '../renderer/rich-text';
import type { RichText } from '../schema/lecture-types';

describe('rich text splitting', () => {
  it('preserves characters and emphasis boundaries', () => {
    const source: RichText = [
      { text: 'Bold sentence. ', emphasis: 'bold' },
      { text: 'Italic sentence with more words. ', emphasis: 'italic' },
      { text: 'Plain ending.', emphasis: 'none' },
    ];
    const pieces = splitRichText(source, 18);
    expect(pieces.length).toBeGreaterThan(1);
    expect(pieces.map(richTextToPlain).join('')).toBe(richTextToPlain(source));
  });
});
