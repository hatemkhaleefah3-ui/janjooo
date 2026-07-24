import type PptxGenJS from 'pptxgenjs';
import { THEME } from '../template/theme';
import type { ListItem, RichText, RichTextRun, TextEmphasis } from '../schema/lecture-types';

export interface NormalizedRun {
  text: string;
  emphasis: TextEmphasis;
}

export function normalizeRichText(value: RichText | undefined | null): NormalizedRun[] {
  if (value == null) return [];
  if (typeof value === 'string') return [{ text: value, emphasis: 'none' }];
  return value.map((run) => ({ text: run.text, emphasis: run.emphasis ?? 'none' }));
}

export function richTextToPlain(value: RichText | undefined | null): string {
  return normalizeRichText(value).map((run) => run.text).join('');
}

export function listItemText(item: string | ListItem): RichText {
  return typeof item === 'string' ? item : item.text;
}

export function listItemLevel(item: string | ListItem): number {
  return typeof item === 'string' ? 0 : item.level ?? 0;
}

function runOptions(emphasis: TextEmphasis): PptxGenJS.TextPropsOptions {
  switch (emphasis) {
    case 'bold':
      return { bold: true };
    case 'italic':
      return { italic: true };
    case 'accent':
      return { color: THEME.accentColor };
    case 'highlight':
      return { fill: { color: THEME.highlightColor } };
    default:
      return {};
  }
}

/** Converts structured runs into editable PowerPoint text runs. */
export function richTextRuns(value: RichText): PptxGenJS.TextProps[] {
  const runs = normalizeRichText(value);
  return runs.map((run, index) => ({
    text: run.text,
    options: runOptions(run.emphasis),
  }));
}

/**
 * Creates one native PowerPoint paragraph per list item. The bullet/number
 * property is attached to the paragraph instead of inserting a Unicode glyph.
 */
export function listTextRuns(
  items: Array<string | ListItem>,
  type: 'bullet' | 'number',
  startAt = 1,
): PptxGenJS.TextProps[] {
  const result: PptxGenJS.TextProps[] = [];
  items.forEach((item, itemIndex) => {
    const runs = normalizeRichText(listItemText(item));
    const level = listItemLevel(item);
    runs.forEach((run, runIndex) => {
      result.push({
        text: run.text,
        options: {
          ...runOptions(run.emphasis),
          bullet: runIndex === 0
            ? {
                type,
                indent: 18 + level * 16,
                marginPt: 4,
                ...(type === 'number' ? { numberStartAt: startAt + itemIndex } : {}),
              }
            : undefined,
          breakLine: itemIndex < items.length - 1 && runIndex === runs.length - 1,
        },
      });
    });
  });
  return result;
}

export function splitRichText(value: RichText, maxCharacters: number): RichText[] {
  const plain = richTextToPlain(value);
  if (plain.length <= maxCharacters) return [value];

  const pieces: RichText[] = [];
  let start = 0;
  while (start < plain.length) {
    let end = Math.min(plain.length, start + maxCharacters);
    if (end < plain.length) {
      const sentenceBreak = Math.max(
        plain.lastIndexOf('. ', end),
        plain.lastIndexOf('! ', end),
        plain.lastIndexOf('? ', end),
      );
      const wordBreak = plain.lastIndexOf(' ', end);
      end = Math.max(start + 1, sentenceBreak > start ? sentenceBreak + 1 : wordBreak > start ? wordBreak : end);
    }
    pieces.push(sliceRichText(value, start, end));
    start = end;
    while (plain[start] === ' ') start++;
  }
  return pieces;
}

function sliceRichText(value: RichText, start: number, end: number): RichText {
  const runs = normalizeRichText(value);
  const output: RichTextRun[] = [];
  let offset = 0;
  for (const run of runs) {
    const runStart = offset;
    const runEnd = offset + run.text.length;
    const overlapStart = Math.max(start, runStart);
    const overlapEnd = Math.min(end, runEnd);
    if (overlapEnd > overlapStart) {
      output.push({
        text: run.text.slice(overlapStart - runStart, overlapEnd - runStart),
        emphasis: run.emphasis,
      });
    }
    offset = runEnd;
  }
  return output.length === 1 && output[0].emphasis === 'none' ? output[0].text : output;
}