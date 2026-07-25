import PptxGenJS from 'pptxgenjs';
import { THEME } from '../template/theme';
import {
  CONTENT_X, CONTENT_WIDTH, CONTENT_Y_AFTER_HEADER, SAFE_BOTTOM,
} from '../template/geometry';
import { addEditorialFooter, addEditorialHeader } from '../template/editorial';
import type { DiagramBlock, RichText, RichTextRun } from '../schema/lecture-types';
import { richTextRuns } from './rich-text';

type DiagramNode = string | RichTextRun[];

export function normalizeDiagramRows(rows: DiagramNode[][], maxNodesPerRow = THEME.DIAGRAM_MAX_NODES_PER_ROW): DiagramNode[][] {
  const max = Math.max(1, Math.floor(maxNodesPerRow));
  const normalized: DiagramNode[][] = [];
  for (const row of rows) {
    for (let offset = 0; offset < row.length; offset += max) normalized.push(row.slice(offset, offset + max));
  }
  return normalized;
}

export function diagramRowsPerSlide(availableHeight: number): number {
  const fixed = THEME.H_DIAGRAM_LABEL + 0.12;
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
    line: { color: THEME.DIAGRAM_CONNECTOR, width: 1.15, endArrowType: 'triangle' },
  });
}

export function addDiagramToSlide(
  slide: PptxGenJS.Slide,
  block: DiagramBlock,
  areaX: number, areaY: number, areaW: number, _areaH: number,
): number {
  let currentY = areaY;
  slide.addText(richTextRuns(block.label), {
    x: areaX, y: currentY, w: areaW, h: THEME.H_DIAGRAM_LABEL,
    fontFace: THEME.headingFont, fontSize: THEME.FONT_DIAGRAM_NODE + 2,
    bold: true, color: THEME.DARK_TEXT, margin: 0,
    align: 'left', valign: 'top', fit: 'shrink',
  });
  currentY += THEME.H_DIAGRAM_LABEL + 0.12;

  const rows = normalizeDiagramRows(block.diagramRows);
  const nH = THEME.DIAGRAM_NODE_HEIGHT;
  const hGap = THEME.DIAGRAM_NODE_H_GAP;
  const vGap = THEME.DIAGRAM_ROW_V_GAP;

  rows.forEach((row, rowIndex) => {
    if (!row.length) return;
    const nodeWidth = Math.min(
      THEME.DIAGRAM_NODE_WIDTH,
      Math.max(0.82, (areaW - (row.length - 1) * hGap) / row.length),
    );
    const totalWidth = row.length * nodeWidth + (row.length - 1) * hGap;
    const rowStartX = areaX + Math.max(0, (areaW - totalWidth) / 2);

    row.forEach((node, nodeIndex) => {
      const nodeX = rowStartX + nodeIndex * (nodeWidth + hGap);
      const emphasized = nodeIndex === row.length - 1 && rowIndex === rows.length - 1;
      slide.addShape('roundRect' as PptxGenJS.SHAPE_NAME, {
        x: nodeX, y: currentY, w: nodeWidth, h: nH,
        rectRadius: 0.06,
        fill: { color: emphasized ? THEME.NAVY : THEME.DIAGRAM_NODE_BG },
        line: { color: THEME.DIAGRAM_NODE_BORDER, width: 0.8 },
      } as never);
      slide.addText(richTextRuns(node), {
        x: nodeX + 0.08, y: currentY + 0.05, w: nodeWidth - 0.16, h: nH - 0.1,
        fontFace: THEME.bodyFont, fontSize: THEME.FONT_DIAGRAM_NODE,
        bold: true, color: emphasized ? THEME.WHITE : THEME.DIAGRAM_NODE_TEXT,
        margin: 0, align: 'center', valign: 'middle', wrap: true, fit: 'shrink',
      });
      if (nodeIndex < row.length - 1) {
        addArrowLine(slide, nodeX + nodeWidth + 0.04, currentY + nH / 2, hGap - 0.08, 0);
      }
    });

    currentY += nH;
    if (rowIndex < rows.length - 1) {
      addArrowLine(slide, areaX + areaW / 2, currentY + 0.04, 0, vGap - 0.08);
      currentY += vGap;
    }
  });
  return currentY - areaY;
}

export function renderDedicatedDiagramSlides(pptx: PptxGenJS, block: DiagramBlock, sectionTitle: string): void {
  const titleY = CONTENT_Y_AFTER_HEADER;
  const areaY = CONTENT_Y_AFTER_HEADER + 0.72;
  const areaH = SAFE_BOTTOM - areaY - 0.08;
  const pages = paginateDiagramRows(block.diagramRows, diagramRowsPerSlide(areaH));
  pages.forEach((rows, pageIndex) => {
    const slide = pptx.addSlide();
    slide.background = { color: THEME.SLIDE_BG };
    addEditorialHeader(slide, 'Editable diagram', sectionTitle);
    const label: RichText = pageIndex === 0
      ? block.label
      : typeof block.label === 'string'
        ? `${block.label} (continued ${pageIndex + 1}/${pages.length})`
        : [...block.label, { text: ` (continued ${pageIndex + 1}/${pages.length})`, emphasis: 'italic' }];
    slide.addText(richTextRuns(label), {
      x: CONTENT_X, y: titleY, w: Math.min(CONTENT_WIDTH, 9.5), h: 0.54,
      fontFace: THEME.headingFont, fontSize: 22,
      bold: pageIndex === 0, italic: pageIndex > 0,
      color: pageIndex === 0 ? THEME.DARK_TEXT : THEME.MUTED_TEXT,
      margin: 0, align: 'left', valign: 'top', fit: 'shrink',
    });
    addDiagramToSlide(slide, { ...block, label: '', diagramRows: rows }, CONTENT_X, areaY, CONTENT_WIDTH, areaH);
    addEditorialFooter(slide, sectionTitle);
  });
}

export function renderDedicatedDiagramSlide(pptx: PptxGenJS, block: DiagramBlock, sectionTitle: string): void {
  renderDedicatedDiagramSlides(pptx, block, sectionTitle);
}
