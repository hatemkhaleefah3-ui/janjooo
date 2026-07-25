import PptxGenJS from 'pptxgenjs';
import { THEME } from '../template/theme';
import {
  CONTENT_X, CONTENT_WIDTH, SECTION_HEADER_Y,
  SLIDE_NUMBER_X, SLIDE_NUMBER_Y, CONTENT_Y_AFTER_HEADER, SAFE_BOTTOM,
} from '../template/geometry';
import type { RichText, TableBlock } from '../schema/lecture-types';
import { richTextRuns, richTextToPlain } from './rich-text';

function addSectionHeader(slide: PptxGenJS.Slide, sectionTitle: string): void {
  slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
    x: 0, y: SECTION_HEADER_Y, w: THEME.SLIDE_WIDTH, h: THEME.SECTION_HEADER_HEIGHT,
    fill: { color: THEME.SECTION_HEADER_BG }, line: { color: THEME.SECTION_HEADER_BG, width: 0 },
  });
  slide.addText(sectionTitle, {
    x: CONTENT_X, y: SECTION_HEADER_Y, w: CONTENT_WIDTH, h: THEME.SECTION_HEADER_HEIGHT,
    fontFace: THEME.FONT, fontSize: THEME.FONT_SECTION_HEADER, color: THEME.SECTION_HEADER_TEXT,
    align: 'left', valign: 'middle',
  });
}

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}
function rgbToHex(rgb: [number, number, number]): string {
  return rgb.map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('').toUpperCase();
}
function mixColor(a: string, b: string, ratio: number): string {
  const ar = hexToRgb(a); const br = hexToRgb(b); const t = Math.max(0, Math.min(1, ratio));
  return rgbToHex([ar[0] + (br[0] - ar[0]) * t, ar[1] + (br[1] - ar[1]) * t, ar[2] + (br[2] - ar[2]) * t]);
}

function cellFill(block: TableBlock, sourceRowIndex: number, columnIndex: number, visibleRowIndex: number): string {
  if (block.tableType === 'heatmap' && block.heatmap) {
    const value = block.heatmap.values[sourceRowIndex]?.[columnIndex];
    if (typeof value === 'number') {
      const span = block.heatmap.max - block.heatmap.min;
      const ratio = span > 0 ? (value - block.heatmap.min) / span : 0;
      return mixColor('EFF6FF', 'F59E0B', ratio);
    }
  }
  if (block.tableType === 'highlight') return visibleRowIndex % 2 === 0 ? 'FFF8E8' : THEME.TABLE_ROW_EVEN_BG;
  return visibleRowIndex % 2 === 0 ? THEME.TABLE_ROW_ODD_BG : THEME.TABLE_ROW_EVEN_BG;
}

function richCell(value: RichText): PptxGenJS.TextProps[] | string {
  return typeof value === 'string' ? value : richTextRuns(value);
}

function buildTableRows(block: TableBlock, rowSlice: RichText[][], fontSize: number, rowOffset = 0): PptxGenJS.TableRow[] {
  const headerRow = block.headers.map((header) => ({
    text: richCell(header),
    options: {
      bold: true, color: THEME.TABLE_HEADER_TEXT, fill: { color: THEME.TABLE_HEADER_BG },
      valign: 'middle' as const, align: 'left' as const, fontSize,
    },
  })) as unknown as PptxGenJS.TableRow;

  const bodyRows = rowSlice.map((row, visibleRowIndex) => row.map((cell, columnIndex) => ({
    text: richCell(cell),
    options: {
      fill: { color: cellFill(block, rowOffset + visibleRowIndex, columnIndex, visibleRowIndex) },
      valign: 'middle' as const, align: 'left' as const, color: THEME.BODY_TEXT, fontSize,
    },
  })) as unknown as PptxGenJS.TableRow);
  return [headerRow, ...bodyRows];
}

export function tableRowsPerSlide(availableHeight: number, includeLabel = true): number {
  const fixed = (includeLabel ? THEME.H_TABLE_LABEL + 0.04 : 0) + THEME.H_TABLE_HEADER_ROW + 0.05;
  return Math.max(1, Math.floor((availableHeight - fixed) / THEME.H_TABLE_BODY_ROW));
}

export function paginateTableRows(rows: RichText[][], rowsPerSlide: number): RichText[][][] {
  const pageSize = Math.max(1, Math.floor(rowsPerSlide));
  if (!rows.length) return [[]];
  const pages: RichText[][][] = [];
  for (let offset = 0; offset < rows.length; offset += pageSize) pages.push(rows.slice(offset, offset + pageSize));
  return pages;
}

/** Renders an already-paginated table without truncating rows. */
export function addTableToSlide(
  slide: PptxGenJS.Slide,
  block: TableBlock,
  x: number, y: number, w: number,
  _maxH: number,
): number {
  let currentY = y;
  slide.addText(richTextRuns(block.label), {
    x, y: currentY, w, h: THEME.H_TABLE_LABEL,
    fontFace: THEME.FONT, fontSize: THEME.FONT_TABLE_BODY + 1,
    bold: true, color: THEME.NAVY, align: 'left', valign: 'top',
  });
  currentY += THEME.H_TABLE_LABEL + 0.04;

  const rowOffset = (block as TableBlock & { __rowOffset?: number }).__rowOffset ?? 0;
  const rows = buildTableRows(block, block.rows, THEME.FONT_TABLE_BODY, rowOffset);
  const colW = Array(block.headers.length).fill(w / block.headers.length);
  slide.addTable(rows, {
    x, y: currentY, w,
    rowH: [THEME.H_TABLE_HEADER_ROW, ...Array(block.rows.length).fill(THEME.H_TABLE_BODY_ROW)],
    fontFace: THEME.FONT, fontSize: THEME.FONT_TABLE_BODY,
    border: { type: 'solid', color: THEME.TABLE_BORDER, pt: 0.5 }, colW,
    margin: 0.05,
  });
  currentY += THEME.H_TABLE_HEADER_ROW + block.rows.length * THEME.H_TABLE_BODY_ROW;
  return currentY - y;
}

/** Renders a wide or tall table on true continuation slides with repeated headers. */
export function renderDedicatedTableSlides(pptx: PptxGenJS, block: TableBlock, sectionTitle: string): void {
  const startY = CONTENT_Y_AFTER_HEADER + 0.1;
  const availableH = SAFE_BOTTOM - startY - 0.1;
  const fontSize = Math.max(THEME.FONT_MIN_TABLE, block.headers.length > 6 ? THEME.FONT_TABLE_BODY - 1 : THEME.FONT_TABLE_BODY);
  const pageRows = tableRowsPerSlide(availableH, true);
  const pages = paginateTableRows(block.rows, pageRows);
  const colW = Array(block.headers.length).fill(CONTENT_WIDTH / block.headers.length);

  pages.forEach((rowsThisSlide, pageIndex) => {
    const slide = pptx.addSlide();
    slide.background = { color: THEME.SLIDE_BG };
    addSectionHeader(slide, sectionTitle);
    const label: RichText = pageIndex === 0
      ? block.label
      : typeof block.label === 'string'
        ? `${block.label} (continued ${pageIndex + 1}/${pages.length})`
        : [...block.label, { text: ` (continued ${pageIndex + 1}/${pages.length})`, emphasis: 'italic' }];
    slide.addText(richTextRuns(label), {
      x: CONTENT_X, y: startY, w: CONTENT_WIDTH, h: THEME.H_TABLE_LABEL,
      fontFace: THEME.FONT, fontSize: fontSize + (pageIndex === 0 ? 1 : 0),
      bold: pageIndex === 0, italic: pageIndex > 0,
      color: pageIndex === 0 ? THEME.NAVY : THEME.MUTED_TEXT,
      align: 'center', valign: 'top',
    });
    const tableY = startY + THEME.H_TABLE_LABEL + 0.04;
    const baseOffset = (block as TableBlock & { __rowOffset?: number }).__rowOffset ?? 0;
    const rowOffset = baseOffset + pageIndex * pageRows;
    slide.addTable(buildTableRows(block, rowsThisSlide, fontSize, rowOffset), {
      x: CONTENT_X, y: tableY, w: CONTENT_WIDTH,
      rowH: [THEME.H_TABLE_HEADER_ROW, ...Array(rowsThisSlide.length).fill(THEME.H_TABLE_BODY_ROW)],
      fontFace: THEME.FONT, fontSize,
      border: { type: 'solid', color: THEME.TABLE_BORDER, pt: 0.5 }, colW, margin: 0.04,
    });
    slide.slideNumber = {
      x: SLIDE_NUMBER_X, y: SLIDE_NUMBER_Y, fontFace: THEME.FONT,
      fontSize: THEME.FONT_SLIDE_NUMBER, color: THEME.SLIDE_NUMBER_COLOR,
    };
  });
}

export function tablePlainText(block: TableBlock): string {
  return [richTextToPlain(block.label), ...block.headers.map(richTextToPlain), ...block.rows.flat().map(richTextToPlain)].join('\n');
}
