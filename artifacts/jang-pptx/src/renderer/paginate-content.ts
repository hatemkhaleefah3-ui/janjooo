import { THEME } from '../template/theme';
import { getAvailableHeight, CONTENT_WIDTH } from '../template/geometry';
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

/** Returns true for blocks that always get their own dedicated slide. */
export function isDedicatedBlock(block: LectureBlock): boolean {
  if (block.type === 'image') return true;
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

export function estimateListItemHeight(item: string | ListItem, fontSize: number): number {
  const level = listItemLevel(item);
  const usableWidth = Math.max(1, CONTENT_WIDTH - 0.2 - level * 0.25);
  return Math.max(
    fontSize === THEME.FONT_NUMBERED ? THEME.H_NUMBERED_ITEM : THEME.H_BULLET_ITEM,
    estimateTextHeight(listItemText(item), usableWidth, fontSize) + 0.04,
  );
}

/** Estimates how much vertical space a block consumes, including its trailing gap. */
export function estimateBlockHeight(block: LectureBlock): number {
  const gap = THEME.BLOCK_GAP;
  switch (block.type) {
    case 'subtitle':
      return Math.max(THEME.H_SUBTITLE_BLOCK, estimateTextHeight(block.text, CONTENT_WIDTH, THEME.FONT_SUBTITLE_BLOCK)) + gap;
    case 'paragraph':
      return Math.max(0.3, estimateTextHeight(block.text, CONTENT_WIDTH, THEME.FONT_PARAGRAPH) + 0.08) + gap;
    case 'bullets':
      return block.items.reduce((sum, item) => sum + estimateListItemHeight(item, THEME.FONT_BULLET), 0) + 0.08 + gap;
    case 'numbered':
      return block.items.reduce((sum, item) => sum + estimateListItemHeight(item, THEME.FONT_NUMBERED), 0) + 0.08 + gap;
    case 'callout':
      return Math.max(
        THEME.H_CALLOUT_MIN,
        estimateTextHeight(block.text, CONTENT_WIDTH - 0.3, THEME.FONT_CALLOUT_TEXT) + 0.36,
      ) + gap;
    case 'table':
      return THEME.H_TABLE_LABEL + 0.04 + THEME.H_TABLE_HEADER_ROW + block.rows.length * THEME.H_TABLE_BODY_ROW + gap;
    case 'diagram':
      return THEME.H_DIAGRAM_LABEL + 0.06 +
        block.diagramRows.length * THEME.DIAGRAM_NODE_HEIGHT +
        Math.max(0, block.diagramRows.length - 1) * THEME.DIAGRAM_ROW_V_GAP + gap;
    case 'image':
      return 0;
  }
}

/**
 * Paginates a source slide without dropping content. Oversized paragraphs,
 * lists, callouts, and inline tables are split into deterministic continuation
 * blocks. Dedicated tables and diagrams paginate in their own renderers.
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
    return Math.max(0.25, getAvailableHeight(hasTitle, hasSubtitle) - 0.1);
  };

  const flush = (): void => {
    if (currentPage.length === 0) return;
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

    const available = availableForPage(firstContentPage && currentPage.length === 0);
    const remaining = available - currentHeight;
    const blockHeight = estimateBlockHeight(block);

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

    const split = splitBlockToFit(block, available, continuationSerial++);
    currentPage.push(split.head);
    currentHeight += estimateBlockHeight(split.head);
    flush();
    if (split.tail) queue.unshift(split.tail);
  }

  flush();
  return fragments;
}

function splitBlockToFit(block: LectureBlock, maxHeight: number, serial: number): SplitResult {
  switch (block.type) {
    case 'paragraph':
      return splitParagraph(block, maxHeight, serial);
    case 'bullets':
    case 'numbered':
      return splitList(block, maxHeight, serial);
    case 'callout':
      return splitCallout(block, maxHeight, serial);
    case 'table':
      return splitTable(block, maxHeight, serial);
    default:
      // Subtitles and small diagrams have bounded geometry. Keep the source
      // block intact rather than losing content; the renderer uses shrink fit.
      return { head: block };
  }
}

function splitParagraph(block: ParagraphBlock, maxHeight: number, serial: number): SplitResult {
  const bodyHeight = Math.max(0.2, maxHeight - THEME.BLOCK_GAP - 0.08);
  const fullHeight = estimateTextHeight(block.text, CONTENT_WIDTH, THEME.FONT_PARAGRAPH);
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

function splitCallout(block: CalloutBlock, maxHeight: number, serial: number): SplitResult {
  const bodyHeight = Math.max(0.2, maxHeight - THEME.BLOCK_GAP - 0.36);
  const fullHeight = estimateTextHeight(block.text, CONTENT_WIDTH - 0.3, THEME.FONT_CALLOUT_TEXT);
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

function splitList(block: BulletsBlock | NumberedBlock, maxHeight: number, serial: number): SplitResult {
  const fontSize = block.type === 'bullets' ? THEME.FONT_BULLET : THEME.FONT_NUMBERED;
  const availableItemsHeight = Math.max(0.15, maxHeight - THEME.BLOCK_GAP - 0.08);
  const expanded = expandOversizedListItems(block.items, availableItemsHeight, fontSize);
  const headItems: Array<string | ListItem> = [];
  let used = 0;
  for (const item of expanded) {
    const itemHeight = estimateListItemHeight(item, fontSize);
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
): Array<string | ListItem> {
  const output: Array<string | ListItem> = [];
  for (const item of items) {
    const estimated = estimateListItemHeight(item, fontSize);
    if (estimated <= maxHeight) {
      output.push(item);
      continue;
    }
    const text = listItemText(item);
    const length = richTextToPlain(text).length;
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
