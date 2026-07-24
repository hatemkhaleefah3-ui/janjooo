import PptxGenJS from 'pptxgenjs';
import { THEME } from '../template/theme';
import {
  CONTENT_X, CONTENT_WIDTH, SECTION_HEADER_Y,
  SLIDE_NUMBER_X, SLIDE_NUMBER_Y, CONTENT_Y_AFTER_HEADER, SAFE_BOTTOM,
} from '../template/geometry';
import type { TableBlock } from '../schema/lecture-types';

function addSectionHeader(slide: PptxGenJS.Slide, sectionTitle: string): void {
  slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
    x: 0, y: SECTION_HEADER_Y,
    w: THEME.SLIDE_WIDTH, h: THEME.SECTION_HEADER_HEIGHT,
    fill: { color: THEME.SECTION_HEADER_BG },
    line: { color: THEME.SECTION_HEADER_BG, width: 0 },
  });
  slide.addText(sectionTitle, {
    x: CONTENT_X, y: SECTION_HEADER_Y,
    w: CONTENT_WIDTH, h: THEME.SECTION_HEADER_HEIGHT,
    fontFace: THEME.FONT,
    fontSize: THEME.FONT_SECTION_HEADER,
    color: THEME.SECTION_HEADER_TEXT,
    align: 'left',
    valign: 'middle',
  });
}

function buildTableRows(
  block: TableBlock,
  rowSlice: string[][],
  fontSize: number,
): PptxGenJS.TableRow[] {
  const headerRow: PptxGenJS.TableRow = block.headers.map((h) => ({
    text: h,
    options: {
      bold: true,
      color: THEME.TABLE_HEADER_TEXT,
      fill: { color: THEME.TABLE_HEADER_BG },
      valign: 'middle' as const,
      align: 'left' as const,
      fontSize,
    },
  }));

  const bodyRows: PptxGenJS.TableRow[] = rowSlice.map((row, ri) =>
    row.map((cell) => ({
      text: cell,
      options: {
        fill: { color: ri % 2 === 0 ? THEME.TABLE_ROW_ODD_BG : THEME.TABLE_ROW_EVEN_BG },
        valign: 'middle' as const,
        align: 'left' as const,
        color: THEME.BODY_TEXT,
        fontSize,
      },
    })),
  );

  return [headerRow, ...bodyRows];
}

/**
 * Renders a table (label + data) at a given position.
 * Returns the approximate height consumed.
 */
export function addTableToSlide(
  slide: PptxGenJS.Slide,
  block: TableBlock,
  x: number, y: number,
  w: number,
  maxH: number,
): number {
  let currentY = y;

  // Label
  slide.addText(block.label, {
    x, y: currentY, w, h: THEME.H_TABLE_LABEL,
    fontFace: THEME.FONT, fontSize: THEME.FONT_TABLE_BODY + 1,
    bold: true, color: THEME.NAVY, align: 'left', valign: 'top',
  });
  currentY += THEME.H_TABLE_LABEL + 0.04;

  const hH = THEME.H_TABLE_HEADER_ROW;
  const rH = THEME.H_TABLE_BODY_ROW;
  const fontSize = THEME.FONT_TABLE_BODY;
  const remaining = maxH - (currentY - y) - 0.05;
  const maxRows = Math.max(1, Math.floor((remaining - hH) / rH));
  const visibleRows = block.rows.slice(0, maxRows);

  const colW = w / block.headers.length;
  const rows = buildTableRows(block, visibleRows, fontSize);

  slide.addTable(rows, {
    x, y: currentY, w,
    rowH: [hH, ...Array(visibleRows.length).fill(rH)],
    fontFace: THEME.FONT,
    fontSize,
    border: { type: 'solid', color: THEME.TABLE_BORDER, pt: 0.5 },
    colW: Array(block.headers.length).fill(colW),
  });

  currentY += hH + visibleRows.length * rH;

  if (visibleRows.length < block.rows.length) {
    currentY += 0.06;
    slide.addText(`(continued on next slide — ${block.rows.length - visibleRows.length} more rows)`, {
      x, y: currentY, w, h: 0.2,
      fontFace: THEME.FONT, fontSize: 9, italic: true,
      color: THEME.MUTED_TEXT, align: 'left',
    });
    currentY += 0.2;
  }

  return currentY - y;
}

/**
 * Renders a large table (> 3 columns) on one or more dedicated slides.
 */
export function renderDedicatedTableSlides(
  pptx: PptxGenJS,
  block: TableBlock,
  sectionTitle: string,
): void {
  const startY = CONTENT_Y_AFTER_HEADER + 0.1;
  const maxY = SAFE_BOTTOM - 0.1;
  const availableH = maxY - startY;
  const labelH = 0.32;
  const hH = THEME.H_TABLE_HEADER_ROW;
  const rH = THEME.H_TABLE_BODY_ROW;
  const fontSize = Math.max(
    THEME.FONT_MIN,
    block.headers.length > 6 ? THEME.FONT_TABLE_BODY - 1 : THEME.FONT_TABLE_BODY,
  );
  const rowsPerSlide = Math.max(1, Math.floor((availableH - labelH - hH - 0.1) / rH));
  const colW = CONTENT_WIDTH / block.headers.length;

  let rowOffset = 0;
  let slideNum = 0;

  while (rowOffset < block.rows.length || slideNum === 0) {
    const slide = pptx.addSlide();
    slide.background = { color: THEME.SLIDE_BG };
    addSectionHeader(slide, sectionTitle);

    let currentY = startY;

    // Label / continued label
    const labelText = slideNum === 0 ? block.label : `${block.label} (continued)`;
    slide.addText(labelText, {
      x: CONTENT_X, y: currentY, w: CONTENT_WIDTH, h: labelH,
      fontFace: THEME.FONT,
      fontSize: slideNum === 0 ? fontSize + 1 : fontSize,
      bold: slideNum === 0,
      italic: slideNum > 0,
      color: slideNum === 0 ? THEME.NAVY : THEME.MUTED_TEXT,
      align: 'center', valign: 'top',
    });
    currentY += labelH + 0.04;

    const rowsThisSlide = block.rows.slice(rowOffset, rowOffset + rowsPerSlide);
    if (rowsThisSlide.length === 0) break;

    const rows = buildTableRows(block, rowsThisSlide, fontSize);

    slide.addTable(rows, {
      x: CONTENT_X, y: currentY, w: CONTENT_WIDTH,
      rowH: [hH, ...Array(rowsThisSlide.length).fill(rH)],
      fontFace: THEME.FONT, fontSize,
      border: { type: 'solid', color: THEME.TABLE_BORDER, pt: 0.5 },
      colW: Array(block.headers.length).fill(colW),
    });

    slide.slideNumber = {
      x: SLIDE_NUMBER_X, y: SLIDE_NUMBER_Y,
      fontFace: THEME.FONT,
      fontSize: THEME.FONT_SLIDE_NUMBER,
      color: THEME.SLIDE_NUMBER_COLOR,
    };

    rowOffset += rowsThisSlide.length;
    slideNum++;
  }
}
