import { THEME } from '../template/theme';
import { getAvailableHeight, CONTENT_WIDTH, TEXT_WIDTH_WITH_IMAGE } from '../template/geometry';
import { estimateTextHeight } from './render-text';
import type {
  BulletsBlock,
  CalloutBlock,
  DiagramBlock,
  ImageBlock,
  LectureBlock,
  LectureSlide,
  ListItem,
  NumberedBlock,
  ParagraphBlock,
  RichText,
  TableBlock,
} from '../schema/lecture-types';
import {
  listItemLevel,
  listItemText,
  richTextToPlain,
  splitRichText,
} from './rich-text';

export type SlideFragment =
  | { type: 'content'; blocks: LectureBlock[] }
  | { type: 'image'; block: ImageBlock }
  | { type: 'dedicated-table'; block: TableBlock }
  | { type: 'dedicated-diagram'; block: DiagramBlock };

type ContinuedListItem = ListItem & { __continued?: boolean };
type InternalTableBlock = TableBlock & { __continued?: boolean; __rowOffset?: number };

type SplitResult = { head: LectureBlock; tail?: LectureBlock };

/**
 * Returns true for blocks that always get their own dedicated slide.
 *
 * Images are dedicated only when explicitly marked full-slide
 * (`preferredAspect === 'full'`). All other images are eligible to sit in a
 * two-column layout beside their related text (issue #22, requirement 3) —
 * `paginateContent` falls back to a dedicated image slide only when no
 * companion text ends up sharing the same page.
 */
export function isDedicatedBlock(block: LectureBlock): boolean {
  if (block.type === 'image') return block.preferredAspect === 'full';
  if (block.type === 'table') return block.headers.length > THEME.TABLE_LARGE_THRESHOLD;
  if (block.type === 'diagram') {
    const totalNodes = block.diagramRows.reduce((sum, row) => sum + row.length, 0);
    return totalNodes > THEME.DIAGRAM_LARGE_THRESHOLD;
  }
  return false;
}

function blockToFragment(block: LectureBlock): SlideFragment {
  if (block.type === 'image') return { type: 'image', block };
  if (block.type === 'table') return { type: 'dedicated-table', block };
  if (block.type === 'diagram') return { type: 'dedicated-diagram', block };
  throw new Error(`blockToFragment: unsupported dedicated block type: ${block.type}`);
}

export function estimateListItemHeight(item: string | ListItem, fontSize: number, width = CONTENT_WIDTH): number {
  const level = listItemLevel(item);
  const usableWidth = Math.max(1, width - 0.2 - level * 0.25);
  return Math.max(
    fontSize === THEME.FONT_NUMBERED ? THEME.H_NUMBERED_ITEM : THEME.H_BULLET_ITEM,
    estimateTextHeight(listItemText(item), usableWidth, fontSize) + 0.04,
  );
}

/**
 * Estimates how much vertical space a block consumes, including its trailing
 * gap. `width` lets callers estimate against a narrowed text column when the
 * page also carries an inline image (see `TEXT_WIDTH_WITH_IMAGE`); it only
 * affects blocks whose height depends on text wrapping.
 */
export function estimateBlockHeight(block: LectureBlock, width = CONTENT_WIDTH): number {
  const gap = THEME.BLOCK_GAP;
  switch (block.type) {
    case 'subtitle':
      return Math.max(THEME.H_SUBTITLE_BLOCK, estimateTextHeight(block.text, width, THEME.FONT_SUBTITLE_BLOCK)) + gap;
    case 'paragraph':
      return Math.max(0.3, estimateTextHeight(block.text, width, THEME.FONT_PARAGRAPH) + 0.08) + gap;
    case 'bullets':
      return block.items.reduce((sum, item) => sum + estimateListItemHeight(item, THEME.FONT_BULLET, width), 0) + 0.08 + gap;
    case 'numbered':
      return block.items.reduce((sum, item) => sum + estimateListItemHeight(item, THEME.FONT_NUMBERED, width), 0) + 0.08 + gap;
    case 'callout':
      return Math.max(
        THEME.H_CALLOUT_MIN,
        estimateTextHeight(block.text, Math.max(1, width - 0.3), THEME.FONT_CALLOUT_TEXT) + 0.36,
      ) + gap;
    case 'table':
      return THEME.H_TABLE_LABEL + 0.04 + THEME.H_TABLE_HEADER_ROW + block.rows.length * THEME.H_TABLE_BODY_ROW + gap;
    case 'diagram':
      return THEME.H_DIAGRAM_LABEL + 0.06 +
        block.diagramRows.length * THEME.DIAGRAM_NODE_HEIGHT +
        Math.max(0, block.diagramRows.length - 1) * THEME.DIAGRAM_ROW_V_GAP + gap;
    case 'image':
      // Images never contribute to the stacked text height: a mixed page
      // renders them in their own column (see render-content-slide.ts), and
      // a lone image collapses to a dedicated full-slide fragment instead.
      return 0;
  }
}

/**
 * Paginates a source slide without dropping content. Oversized paragraphs,
 * lists, callouts, and inline tables are split into deterministic continuation
 * blocks. Dedicated tables and diagrams paginate in their own renderers.
 *
 * At most one non-dedicated image is kept per output page so the mixed
 * two-column layout stays legible; a second image on the same source slide
 * forces a page break rather than being dropped or forced full-slide.
 * A content page that ends up holding only an image remains a content
 * fragment; the renderer uses the image label and description as compact
 * companion copy rather than creating a blank dedicated placeholder slide.
 */
export function paginateContent(slide: LectureSlide): SlideFragment[] {
  const fragments: SlideFragment[] = [];
  const queue: LectureBlock[] = [...slide.blocks];
  let currentPage: LectureBlock[] = [];
  let currentHeight = 0;
  let firstContentPage = true;
  let continuationSerial = 1;

  const availableForPage = (first: boolean): number => {
    const hasTitle = first && slide.slideTitle.trim().length > 0;
    const hasSubtitle = first && richTextToPlain(slide.slideSubtitle).trim().length > 0;
    // Reserve additional visual breathing room above the editorial footer.
    return Math.max(0.25, getAvailableHeight(hasTitle, hasSubtitle) - 0.55);
  };

  const measurePage = (blocks: LectureBlock[]): number => {
    const width = blocks.some((existing) => existing.type === 'image')
      ? TEXT_WIDTH_WITH_IMAGE
      : CONTENT_WIDTH;
    return blocks.reduce((sum, existing) => sum + estimateBlockHeight(existing, width), 0);
  };

  const flush = (): void => {
    if (currentPage.length === 0) return;
    // Non-full images always remain content fragments. If a page contains
    // only an image, render-content-slide supplies its label/description in
    // the text column, which avoids a blank dedicated placeholder slide.
    fragments.push({ type: 'content', blocks: currentPage });
    currentPage = [];
    currentHeight = 0;
    firstContentPage = false;
  };

  while (queue.length > 0) {
    const block = queue.shift()!;
    if (isDedicatedBlock(block)) {
      flush();
      fragments.push(blockToFragment(block));
      continue;
    }

    if (block.type === 'image') {
      const alreadyHasImage = currentPage.some((existing) => existing.type === 'image');
      if (alreadyHasImage) {
        // Keep the two-column layout to a single image; break the page.
        flush();
      }

      const mixedCandidate = [...currentPage, block];
      const mixedHeight = measurePage(mixedCandidate);
      if (
        currentPage.some((existing) => existing.type !== 'image')
        && mixedHeight > availableForPage(firstContentPage) + 0.001
      ) {
        // Text added before the image was measured at full width. Once the
        // image is present, rendering narrows the text column and may increase
        // wrapping. Do not retain a page that no longer fits after that reflow.
        flush();
      }

      currentPage.push(block);
      currentHeight = measurePage(currentPage);
      continue;
    }

    // The first content page always renders its title/subtitle, regardless of
    // how many blocks are already on that page. Keep that reserve for every
    // fit decision rather than only for the first block.
    const available = availableForPage(firstContentPage);
    const remaining = available - currentHeight;
    const pageHasImage = currentPage.some((existing) => existing.type === 'image');
    const textWidth = pageHasImage ? TEXT_WIDTH_WITH_IMAGE : CONTENT_WIDTH;
    const blockHeight = estimateBlockHeight(block, textWidth);

    if (blockHeight <= remaining + 0.001) {
      currentPage.push(block);
      currentHeight += blockHeight;
      continue;
    }

    if (currentPage.length > 0) {
      flush();
      queue.unshift(block);
      continue;
    }

    const split = splitBlockToFit(block, available, continuationSerial++, textWidth);
    currentPage.push(split.head);
    currentHeight += estimateBlockHeight(split.head, textWidth);
    flush();
    if (split.tail) queue.unshift(split.tail);
  }

  flush();
  return fragments;
}

function splitBlockToFit(block: LectureBlock, maxHeight: number, serial: number, width: number): SplitResult {
  switch (block.type) {
    case 'paragraph':
      return splitParagraph(block, maxHeight, serial, width);
    case 'bullets':
    case 'numbered':
      return splitList(block, maxHeight, serial, width);
    case 'callout':
      return splitCallout(block, maxHeight, serial, width);
    case 'table':
      return splitTable(block, maxHeight, serial);
    default:
      // Subtitles and small diagrams have bounded geometry. Keep the source
      // block intact rather than losing content; the renderer uses shrink fit.
      return { head: block };
  }
}

function splitParagraph(block: ParagraphBlock, maxHeight: number, serial: number, width: number): SplitResult {
  const bodyHeight = Math.max(0.2, maxHeight - THEME.BLOCK_GAP - 0.08);
  const fullHeight = estimateTextHeight(block.text, width, THEME.FONT_PARAGRAPH);
  const length = richTextToPlain(block.text).length;
  const maxCharacters = Math.max(24, Math.floor(length * Math.min(0.9, bodyHeight / Math.max(fullHeight, 0.01))));
  const [headText, ...rest] = splitRichText(block.text, maxCharacters);
  if (rest.length === 0) return { head: block };
  return {
    head: { ...block, text: headText },
    tail: {
      ...block,
      blockId: continuationId(block.blockId, serial),
      text: joinRichText(rest),
    },
  };
}

function splitCallout(block: CalloutBlock, maxHeight: number, serial: number, width: number): SplitResult {
  const bodyHeight = Math.max(0.2, maxHeight - THEME.BLOCK_GAP - 0.36);
  const fullHeight = estimateTextHeight(block.text, Math.max(1, width - 0.3), THEME.FONT_CALLOUT_TEXT);
  const length = richTextToPlain(block.text).length;
  const maxCharacters = Math.max(24, Math.floor(length * Math.min(0.9, bodyHeight / Math.max(fullHeight, 0.01))));
  const [headText, ...rest] = splitRichText(block.text, maxCharacters);
  if (rest.length === 0) return { head: block };
  return {
    head: { ...block, text: headText },
    tail: {
      ...block,
      blockId: continuationId(block.blockId, serial),
      label: appendRichText(block.label, ' (continued)'),
      text: joinRichText(rest),
    },
  };
}

function splitList(block: BulletsBlock | NumberedBlock, maxHeight: number, serial: number, width: number): SplitResult {
  const fontSize = block.type === 'bullets' ? THEME.FONT_BULLET : THEME.FONT_NUMBERED;
  const availableItemsHeight = Math.max(0.15, maxHeight - THEME.BLOCK_GAP - 0.08);
  const expanded = expandOversizedListItems(block.items, availableItemsHeight, fontSize, width);
  const headItems: Array<string | ListItem> = [];
  let used = 0;
  for (const item of expanded) {
    const itemHeight = estimateListItemHeight(item, fontSize, width);
    if (headItems.length > 0 && used + itemHeight > availableItemsHeight) break;
    headItems.push(item);
    used += itemHeight;
  }
  if (headItems.length === expanded.length) return { head: { ...block, items: expanded } };

  const tailItems = expanded.slice(headItems.length);
  if (block.type === 'numbered') {
    const startAt = block.startAt ?? 1;
    const consumedNumbers = headItems.filter((item) => !isContinuedListItem(item)).length;
    return {
      head: { ...block, items: headItems, startAt },
      tail: {
        ...block,
        blockId: continuationId(block.blockId, serial),
        items: tailItems,
        startAt: startAt + consumedNumbers,
      },
    };
  }
  return {
    head: { ...block, items: headItems },
    tail: { ...block, blockId: continuationId(block.blockId, serial), items: tailItems },
  };
}

function expandOversizedListItems(
  items: Array<string | ListItem>,
  maxHeight: number,
  fontSize: number,
  width: number,
): Array<string | ListItem> {
  const output: Array<string | ListItem> = [];
  for (const item of items) {
    const estimated = estimateListItemHeight(item, fontSize, width);
    if (estimated <= maxHeight) {
      output.push(item);
      continue;
    }
    const text = listItemText(item);
    const length = richTextToPlain((text)).length;
    const maxCharacters = Math.max(20, Math.floor(length * Math.min(0.85, maxHeight / Math.max(estimated, 0.01))));
    const pieces = splitRichText(text, maxCharacters);
    const level = listItemLevel(item);
    pieces.forEach((piece, index) => {
      if (index === 0 && typeof item === 'string' && level === 0) output.push(piece as string);
      else output.push({ text: piece, level, ...(index > 0 ? { __continued: true } : {}) } as ContinuedListItem);
    });
  }
  return output;
}

function splitTable(block: TableBlock, maxHeight: number, serial: number): SplitResult {
  const fixedHeight = THEME.H_TABLE_LABEL + 0.04 + THEME.H_TABLE_HEADER_ROW + THEME.BLOCK_GAP;
  const maxRows = Math.max(1, Math.floor((maxHeight - fixedHeight) / THEME.H_TABLE_BODY_ROW));
  if (block.rows.length <= maxRows) return { head: block };
  const headRows = block.rows.slice(0, maxRows);
  const tailRows = block.rows.slice(maxRows);
  const internal = block as InternalTableBlock;
  const alreadyContinued = internal.__continued === true;
  const rowOffset = internal.__rowOffset ?? 0;
  return {
    head: { ...block, rows: headRows, __rowOffset: rowOffset } as InternalTableBlock,
    tail: {
      ...block,
      blockId: continuationId(block.blockId, serial),
      label: alreadyContinued ? block.label : appendRichText(block.label, ' (continued)'),
      rows: tailRows,
      __continued: true,
      __rowOffset: rowOffset + headRows.length,
    } as InternalTableBlock,
  };
}

function continuationId(blockId: string, serial: number): string {
  return `${blockId}--continuation-${serial}`;
}

function appendRichText(value: RichText, suffix: string): RichText {
  if (typeof value === 'string') return `${value}${suffix}`;
  return [...value, { text: suffix, emphasis: 'italic' }];
}

function joinRichText(values: RichText[]): RichText {
  const runs = values.flatMap((value) =>
    typeof value === 'string' ? [{ text: value, emphasis: 'none' as const }] : value,
  );
  return runs.length === 1 && runs[0].emphasis === 'none' ? runs[0].text : runs;
}

export function isContinuedListItem(item: string | ListItem): boolean {
  return typeof item !== 'string' && (item as ContinuedListItem).__continued === true;
}
