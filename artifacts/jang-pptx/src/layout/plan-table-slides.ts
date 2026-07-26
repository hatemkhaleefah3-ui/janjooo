import { THEME } from '../template/theme';
import { CONTENT_WIDTH, CONTENT_X, CONTENT_Y_AFTER_HEADER, SAFE_BOTTOM } from '../template/geometry';
import type { RichText, TableBlock } from '../schema/lecture-types';
import { estimateTextHeight } from '../renderer/render-text';
import type { LayoutBox } from './slide-render-plan';

export interface DedicatedTableSlideRenderPlan {
  kind: 'dedicated-table';
  sectionTitle: string;
  pageIndex: number;
  pageCount: number;
  block: TableBlock;
  label: RichText;
  labelBox: LayoutBox;
  tableBox: LayoutBox;
  rows: RichText[][];
  rowOffset: number;
  headerHeight: number;
  rowHeights: number[];
  colWidths: number[];
  fontSize: number;
}

function continuationLabel(block: TableBlock, pageIndex: number, pageCount: number): RichText {
  if (pageIndex === 0) return block.label;
  const suffix = ` (continued ${pageIndex + 1}/${pageCount})`;
  return typeof block.label === 'string'
    ? `${block.label}${suffix}`
    : [...block.label, { text: suffix, emphasis: 'italic' }];
}

function cellHeight(value: RichText, columnWidth: number, fontSize: number, minimum: number): number {
  const textWidth = Math.max(0.35, columnWidth - 0.18);
  return Math.max(minimum, estimateTextHeight(value, textWidth, fontSize) + 0.14);
}

function rowHeight(row: RichText[], colWidths: number[], fontSize: number, minimum: number): number {
  return row.reduce(
    (height, cell, index) => Math.max(height, cellHeight(cell, colWidths[index] ?? colWidths[0], fontSize, minimum)),
    minimum,
  );
}

/**
 * Plans dedicated table pages by measured wrapped cell height. This follows the
 * same principle as PptxGenJS table pagination: calculate line-dependent row
 * height first, then move complete rows to the next slide when the physical
 * table area is exhausted.
 */
export function planDedicatedTableSlides(
  block: TableBlock,
  sectionTitle: string,
): DedicatedTableSlideRenderPlan[] {
  const labelBox: LayoutBox = {
    x: CONTENT_X,
    y: CONTENT_Y_AFTER_HEADER,
    w: Math.min(CONTENT_WIDTH, 9.5),
    h: THEME.H_TABLE_LABEL + 0.25,
  };
  const tableY = CONTENT_Y_AFTER_HEADER + 0.62;
  const availableHeight = SAFE_BOTTOM - tableY;
  const fontSize = Math.max(
    THEME.FONT_MIN_TABLE,
    block.headers.length > 6 ? THEME.FONT_TABLE_BODY - 1 : THEME.FONT_TABLE_BODY,
  );
  const colWidths = Array(Math.max(1, block.headers.length)).fill(
    CONTENT_WIDTH / Math.max(1, block.headers.length),
  );
  const headerHeight = rowHeight(
    block.headers,
    colWidths,
    fontSize,
    THEME.H_TABLE_HEADER_ROW,
  );
  const measuredRows = block.rows.map((row) => rowHeight(
    row,
    colWidths,
    fontSize,
    THEME.H_TABLE_BODY_ROW,
  ));

  const pageSlices: Array<{ start: number; end: number; heights: number[] }> = [];
  let start = 0;
  while (start < block.rows.length || (block.rows.length === 0 && pageSlices.length === 0)) {
    let used = headerHeight;
    let end = start;
    const heights: number[] = [];

    while (end < block.rows.length) {
      const remainingForRow = Math.max(0.25, availableHeight - used);
      const measured = measuredRows[end];
      const plannedHeight = Math.min(measured, Math.max(THEME.H_TABLE_BODY_ROW, remainingForRow));
      if (heights.length > 0 && used + measured > availableHeight + 0.001) break;
      heights.push(plannedHeight);
      used += plannedHeight;
      end += 1;
      if (used >= availableHeight - 0.001) break;
    }

    if (block.rows.length === 0) {
      pageSlices.push({ start: 0, end: 0, heights: [] });
      break;
    }
    if (end === start) {
      heights.push(Math.max(THEME.H_TABLE_BODY_ROW, availableHeight - headerHeight));
      end += 1;
    }
    pageSlices.push({ start, end, heights });
    start = end;
  }

  const pageCount = pageSlices.length;
  const baseOffset = (block as TableBlock & { __rowOffset?: number }).__rowOffset ?? 0;
  return pageSlices.map((slice, pageIndex) => {
    const rows = block.rows.slice(slice.start, slice.end);
    const tableHeight = headerHeight + slice.heights.reduce((sum, height) => sum + height, 0);
    return {
      kind: 'dedicated-table' as const,
      sectionTitle,
      pageIndex,
      pageCount,
      block,
      label: continuationLabel(block, pageIndex, pageCount),
      labelBox,
      tableBox: { x: CONTENT_X, y: tableY, w: CONTENT_WIDTH, h: tableHeight },
      rows,
      rowOffset: baseOffset + slice.start,
      headerHeight,
      rowHeights: slice.heights,
      colWidths,
      fontSize,
    };
  });
}
