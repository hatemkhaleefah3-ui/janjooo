import { THEME } from '../template/theme';
import type {
  BulletsBlock,
  CalloutBlock,
  LectureBlock,
  ListItem,
  NumberedBlock,
  ParagraphBlock,
  RichText,
  TableBlock,
} from '../schema/lecture-types';
import { estimateListItemHeight } from '../renderer/paginate-content';
import { estimateTextHeight } from '../renderer/render-text';
import {
  listItemLevel,
  listItemText,
  richTextToPlain,
  splitRichText,
} from '../renderer/rich-text';

export interface ContentBlockSplit {
  head: LectureBlock;
  tail?: LectureBlock;
}

type ContinuedListItem = ListItem & { __continued?: boolean };
type InternalTableBlock = TableBlock & { __continued?: boolean; __rowOffset?: number };

/**
 * Splits only at semantic boundaries: paragraph text runs, list items, callout
 * text, or table rows. The slide planner—not this helper—owns page boundaries.
 */
export function splitContentBlock(
  block: LectureBlock,
  maxHeight: number,
  serial: number,
  width: number,
): ContentBlockSplit {
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
      return { head: block };
  }
}

function splitParagraph(
  block: ParagraphBlock,
  maxHeight: number,
  serial: number,
  width: number,
): ContentBlockSplit {
  const bodyHeight = Math.max(0.2, maxHeight - THEME.BLOCK_GAP - 0.08);
  const fullHeight = estimateTextHeight(block.text, width, THEME.FONT_PARAGRAPH);
  const length = richTextToPlain(block.text).length;
  const maxCharacters = Math.max(
    24,
    Math.floor(length * Math.min(0.9, bodyHeight / Math.max(fullHeight, 0.01))),
  );
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

function splitCallout(
  block: CalloutBlock,
  maxHeight: number,
  serial: number,
  width: number,
): ContentBlockSplit {
  const bodyHeight = Math.max(0.2, maxHeight - THEME.BLOCK_GAP - 0.36);
  const fullHeight = estimateTextHeight(
    block.text,
    Math.max(1, width - 0.3),
    THEME.FONT_CALLOUT_TEXT,
  );
  const length = richTextToPlain(block.text).length;
  const maxCharacters = Math.max(
    24,
    Math.floor(length * Math.min(0.9, bodyHeight / Math.max(fullHeight, 0.01))),
  );
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

function splitList(
  block: BulletsBlock | NumberedBlock,
  maxHeight: number,
  serial: number,
  width: number,
): ContentBlockSplit {
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
    tail: {
      ...block,
      blockId: continuationId(block.blockId, serial),
      items: tailItems,
    },
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
    const length = richTextToPlain(text).length;
    const maxCharacters = Math.max(
      20,
      Math.floor(length * Math.min(0.85, maxHeight / Math.max(estimated, 0.01))),
    );
    const pieces = splitRichText(text, maxCharacters);
    const level = listItemLevel(item);
    pieces.forEach((piece, index) => {
      if (index === 0 && typeof item === 'string' && level === 0) {
        output.push(piece as string);
      } else {
        output.push({
          text: piece,
          level,
          ...(index > 0 ? { __continued: true } : {}),
        } as ContinuedListItem);
      }
    });
  }
  return output;
}

function splitTable(block: TableBlock, maxHeight: number, serial: number): ContentBlockSplit {
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
    typeof value === 'string'
      ? [{ text: value, emphasis: 'none' as const }]
      : value,
  );
  return runs.length === 1 && runs[0].emphasis === 'none' ? runs[0].text : runs;
}

function isContinuedListItem(item: string | ListItem): boolean {
  return typeof item !== 'string' && (item as ContinuedListItem).__continued === true;
}
