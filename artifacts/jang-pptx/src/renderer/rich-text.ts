import type PptxGenJS from 'pptxgenjs';
import { THEME } from '../template/theme';
import type { ListItem, RichText, RichTextRun, TextEmphasis } from '../schema/lecture-types';

export interface NormalizedRun { text: string; emphasis: TextEmphasis; }

export function normalizeRichText(value: RichText | undefined | null): NormalizedRun[] {
  if (value == null) return [];
  if (typeof value === 'string') return value ? [{ text: value, emphasis: 'none' }] : [];
  return value.filter((run) => run.text.length > 0).map((run) => ({ text: run.text, emphasis: run.emphasis ?? 'none' }));
}

export function richTextToPlain(value: RichText | undefined | null): string {
  return normalizeRichText(value).map((run) => run.text).join('');
}
export function listItemText(item: string | ListItem): RichText { return typeof item === 'string' ? item : item.text; }
export function listItemLevel(item: string | ListItem): number { return typeof item === 'string' ? 0 : item.level ?? 0; }

function runOptions(emphasis: TextEmphasis): PptxGenJS.TextPropsOptions {
  switch (emphasis) {
    case 'bold': return { bold: true };
    case 'italic': return { italic: true };
    case 'accent': return { color: THEME.accentColor };
    case 'highlight': return { highlight: THEME.highlightColor } as PptxGenJS.TextPropsOptions;
    default: return {};
  }
}

/** Converts structured rich text into native editable PowerPoint text runs. */
export function richTextRuns(value: RichText): PptxGenJS.TextProps[] {
  return normalizeRichText(value).map((run) => ({ text: run.text, options: runOptions(run.emphasis) }));
}

/** Creates one native PowerPoint paragraph per list item. */
export function listTextRuns(items: Array<string | ListItem>, type: 'bullet' | 'number', startAt = 1): PptxGenJS.TextProps[] {
  const result: PptxGenJS.TextProps[] = [];
  items.forEach((item, itemIndex) => {
    const runs = normalizeRichText(listItemText(item));
    const level = Math.max(0, listItemLevel(item));
    const continued = typeof item !== 'string' &&
      (item as ListItem & { __continued?: boolean }).__continued === true;
    const numberOffset = items.slice(0, itemIndex).filter((candidate) =>
      !(typeof candidate !== 'string' &&
        (candidate as ListItem & { __continued?: boolean }).__continued === true),
    ).length;
    const safeRuns = runs.length ? runs : [{ text: ' ', emphasis: 'none' as const }];
    safeRuns.forEach((run, runIndex) => {
      const options: PptxGenJS.TextPropsOptions = {
        ...runOptions(run.emphasis),
        breakLine: itemIndex < items.length - 1 && runIndex === safeRuns.length - 1,
        indentLevel: runIndex === 0 ? level : undefined,
      };
      if (runIndex === 0 && !continued) {
        options.bullet = type === 'bullet'
          ? true
          : (({
              type: 'number',
              indent: 18 + level * 16,
              hanging: 4,
              numberStartAt: startAt + numberOffset,
            } as unknown) as PptxGenJS.TextPropsOptions['bullet']);
      }
      result.push({ text: run.text, options });
    });
  });
  return result;
}

/** Returns a rich-text slice while retaining emphasis boundaries exactly. */
export function sliceRichText(value: RichText, start: number, end = Number.POSITIVE_INFINITY): RichText {
  const limit = Math.max(start, end);
  let cursor = 0;
  const output: RichTextRun[] = [];
  for (const run of normalizeRichText(value)) {
    const runStart = cursor;
    const runEnd = cursor + run.text.length;
    cursor = runEnd;
    if (runEnd <= start || runStart >= limit) continue;
    const localStart = Math.max(0, start - runStart);
    const localEnd = Math.min(run.text.length, limit - runStart);
    const text = run.text.slice(localStart, localEnd);
    if (text) output.push({ text, ...(run.emphasis !== 'none' ? { emphasis: run.emphasis } : {}) });
  }
  if (typeof value === 'string') return output.map((run) => run.text).join('');
  return output;
}

function chooseBreak(plain: string, start: number, idealEnd: number): number {
  if (idealEnd >= plain.length) return plain.length;
  const floor = Math.max(start + 1, start + Math.floor((idealEnd - start) * 0.55));
  const candidates = ['\n\n', '. ', '! ', '? ', '; ', ', ', ' ', '\n'];
  for (const token of candidates) {
    const found = plain.lastIndexOf(token, idealEnd);
    if (found >= floor) return found + token.length;
  }
  return idealEnd;
}

/** Splits rich text without deleting or inserting any source characters. */
export function splitRichText(value: RichText, maxCharacters: number): RichText[] {
  const plain = richTextToPlain(value);
  if (!plain || plain.length <= maxCharacters) return [value];
  const max = Math.max(1, Math.floor(maxCharacters));
  const pieces: RichText[] = [];
  let start = 0;
  while (start < plain.length) {
    const end = chooseBreak(plain, start, Math.min(plain.length, start + max));
    pieces.push(sliceRichText(value, start, end));
    start = end;
  }
  return pieces;
}
