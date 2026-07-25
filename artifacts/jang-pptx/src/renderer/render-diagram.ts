import PptxGenJS from 'pptxgenjs';
import { THEME } from '../template/theme';
import {
  CONTENT_X, CONTENT_WIDTH, SECTION_HEADER_Y,
  SLIDE_NUMBER_X, SLIDE_NUMBER_Y, CONTENT_Y_AFTER_HEADER, SAFE_BOTTOM,
} from '../template/geometry';
import type { DiagramBlock, RichText, RichTextRun } from '../schema/lecture-types';
import { richTextRuns } from './rich-text';

type DiagramNode = string | RichTextRun[];

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

/** Splits over-wide semantic rows while preserving every node in order. */
export function normalizeDiagramRows(rows: DiagramNode[][], maxNodesPerRow = THEME.DIAGRAM_MAX_NODES_PER_ROW): DiagramNode[][] {
  const max = Math.max(1, Math.floor(maxNodesPerRow));
  const normalized: DiagramNode[][] = [];
  for (const row of rows) {
    for (let offset = 0; offset < row.length; offset += max) normalized.push(row.slice(offset, offset + max));
  }
  return normalized;
}

export function diagramRowsPerSlide(availableHeight: number): number {
  const fixed = THEME.H_DIAGRAM_LABEL + 0.06;
  const perRow = THEME.DIAGRAM_NODE_HEIGHT + THEME.DIAGRAM_ROW_V_GAP;
  return Math.max(1, Math.floor((availableHeight - fixed + THEME.DIAGRAM_ROW_V_GAP) / perRow));
}

export function paginateDiagramRows(rows: DiagramNode[][], rowsPerSlide: number): DiagramNode[][][] {
  const normalized = normalizeDiagramRows(rows);
  const pageSize = Math.max(1, Math.floor(rowsPerSlide));
  if (!normalized.length) return [[]];
  const pages: DiagramNode[][][] = [];
  for (let offset = 0; offset < normalized.length; offset += pageSize) pages.push(normalized.slice(offset, offset + pageSize));
  return pages;
}

function addArrowLine(slide: PptxGenJS.Slide, x: number, y: number, w: number, h: number): void {
  slide.addShape('line' as PptxGenJS.SHAPE_NAME, {
    x, y, w, h,
    line: { color: THEME.DIAGRAM_CONNECTOR, width: 1.25, endArrowType: 'triangle' },
  });
}

/** Renders diagram rows as native editable nodes connected by real line shapes. */
export function addDiagramToSlide(
  slide: PptxGenJS.Slide,
  block: DiagramBlock,
  areaX: number, areaY: number, areaW: number, _areaH: number,
): number {
  let currentY = areaY;
  slide.addText(richTextRuns(block.label), {
    x: areaX, y: currentY, w: areaW, h: THEME.H_DIAGRAM_LABEL,
    fontFace: THEME.FONT, fontSize: 11, bold: true,
    color: THEME.NAVY, align: 'left', valign: 'top',
  });
  currentY += THEME.H_DIAGRAM_LABEL + 0.06;

  const rows = normalizeDiagramRows(block.diagramRows);
  const nH = THEME.DIAGRAM_NODE_HEIGHT;
  const hGap = THEME.DIAGRAM_NODE_H_GAP;
  const vGap = THEME.DIAGRAM_ROW_V_GAP;

  rows.forEach((row, rowIndex) => {
    if (!row.length) return;
    const nodeWidth = Math.min(
      THEME.DIAGRAM_NODE_WIDTH,
      Math.max(0.75, (areaW - (row.length - 1) * hGap) / row.length),
    );
    const totalWidth = row.length * nodeWidth + (row.length - 1) * hGap;
    const rowStartX = areaX + Math.max(0, (areaW - totalWidth) / 2);

    row.forEach((node, nodeIndex) => {
      const nodeX = rowStartX + nodeIndex * (nodeWidth + hGap);
      slide.addShape('roundRect' as PptxGenJS.SHAPE_NAME, {
        x: nodeX, y: currentY, w: nodeWidth, h: nH,
        rectRadius: 0.05,
        fill: { color: THEME.DIAGRAM_NODE_BG },
        line: { color: THEME.DIAGRAM_NODE_BORDER, width: 1 },
      } as never);
      slide.addText(richTextRuns(node), {
        x: nodeX + 0.06, y: currentY + 0.03, w: nodeWidth - 0.12, h: nH - 0.06,
        fontFace: THEME.FONT, fontSize: THEME.FONT_DIAGRAM_NODE, bold: true,
        color: THEME.DIAGRAM_NODE_TEXT, align: 'center', valign: 'middle', wrap: true,
      });
      if (nodeIndex < row.length - 1) {
        addArrowLine(slide, nodeX + nodeWidth + 0.02, currentY + nH / 2, hGap - 0.04, 0);
      }
    });

    currentY += nH;
    if (rowIndex < rows.length - 1) {
      addArrowLine(slide, areaX + areaW / 2, currentY + 0.02, 0, vGap - 0.04);
      currentY += vGap;
    }
  });
  return currentY - areaY;
}

export function renderDedicatedDiagramSlides(pptx: PptxGenJS, block: DiagramBlock, sectionTitle: string): void {
  const areaY = CONTENT_Y_AFTER_HEADER + 0.1;
  const areaH = SAFE_BOTTOM - areaY - 0.1;
  const pages = paginateDiagramRows(block.diagramRows, diagramRowsPerSlide(areaH));
  pages.forEach((rows, pageIndex) => {
    const slide = pptx.addSlide();
    slide.background = { color: THEME.SLIDE_BG };
    addSectionHeader(slide, sectionTitle);
    const label: RichText = pageIndex === 0
      ? block.label
      : typeof block.label === 'string'
        ? `${block.label} (continued ${pageIndex + 1}/${pages.length})`
        : [...block.label, { text: ` (continued ${pageIndex + 1}/${pages.length})`, emphasis: 'italic' }];
    addDiagramToSlide(slide, { ...block, label, diagramRows: rows }, CONTENT_X, areaY, CONTENT_WIDTH, areaH);
    slide.slideNumber = {
      x: SLIDE_NUMBER_X, y: SLIDE_NUMBER_Y, fontFace: THEME.FONT,
      fontSize: THEME.FONT_SLIDE_NUMBER, color: THEME.SLIDE_NUMBER_COLOR,
    };
  });
}

/** Backward-compatible name retained for existing integrations. */
export function renderDedicatedDiagramSlide(pptx: PptxGenJS, block: DiagramBlock, sectionTitle: string): void {
  renderDedicatedDiagramSlides(pptx, block, sectionTitle);
}
