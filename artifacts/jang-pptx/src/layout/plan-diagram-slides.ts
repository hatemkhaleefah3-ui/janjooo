import { THEME } from '../template/theme';
import { CONTENT_WIDTH, CONTENT_X, CONTENT_Y_AFTER_HEADER, SAFE_BOTTOM } from '../template/geometry';
import type { DiagramBlock, RichText, RichTextRun } from '../schema/lecture-types';
import type { LayoutBox } from './slide-render-plan';

type DiagramNode = string | RichTextRun[];

export interface PlannedDiagramNode {
  text: DiagramNode;
  box: LayoutBox;
  emphasized: boolean;
}

export interface PlannedDiagramConnector {
  box: LayoutBox;
  orientation: 'horizontal' | 'vertical';
}

export interface DedicatedDiagramSlideRenderPlan {
  kind: 'dedicated-diagram';
  sectionTitle: string;
  pageIndex: number;
  pageCount: number;
  block: DiagramBlock;
  label: RichText;
  labelBox: LayoutBox;
  nodes: PlannedDiagramNode[];
  connectors: PlannedDiagramConnector[];
}

export function normalizeDiagramRowsForPlan(
  rows: DiagramNode[][],
  maxNodesPerRow = THEME.DIAGRAM_MAX_NODES_PER_ROW,
): DiagramNode[][] {
  const max = Math.max(1, Math.floor(maxNodesPerRow));
  const normalized: DiagramNode[][] = [];
  for (const row of rows) {
    for (let offset = 0; offset < row.length; offset += max) {
      normalized.push(row.slice(offset, offset + max));
    }
  }
  return normalized;
}

function continuationLabel(block: DiagramBlock, pageIndex: number, pageCount: number): RichText {
  if (pageIndex === 0) return block.label;
  const suffix = ` (continued ${pageIndex + 1}/${pageCount})`;
  return typeof block.label === 'string'
    ? `${block.label}${suffix}`
    : [...block.label, { text: suffix, emphasis: 'italic' }];
}

/** Plans exact editable node and connector boxes for every dedicated diagram page. */
export function planDedicatedDiagramSlides(
  block: DiagramBlock,
  sectionTitle: string,
): DedicatedDiagramSlideRenderPlan[] {
  const labelBox: LayoutBox = {
    x: CONTENT_X,
    y: CONTENT_Y_AFTER_HEADER,
    w: Math.min(CONTENT_WIDTH, 9.5),
    h: 0.54,
  };
  const areaY = CONTENT_Y_AFTER_HEADER + 0.72;
  const availableHeight = SAFE_BOTTOM - areaY;
  const rowStride = THEME.DIAGRAM_NODE_HEIGHT + THEME.DIAGRAM_ROW_V_GAP;
  const rowsPerPage = Math.max(
    1,
    Math.floor((availableHeight + THEME.DIAGRAM_ROW_V_GAP) / rowStride),
  );
  const normalized = normalizeDiagramRowsForPlan(block.diagramRows);
  const pages: DiagramNode[][][] = [];
  if (normalized.length === 0) pages.push([]);
  for (let offset = 0; offset < normalized.length; offset += rowsPerPage) {
    pages.push(normalized.slice(offset, offset + rowsPerPage));
  }

  return pages.map((rows, pageIndex) => {
    const nodes: PlannedDiagramNode[] = [];
    const connectors: PlannedDiagramConnector[] = [];
    let currentY = areaY;

    rows.forEach((row, rowIndex) => {
      if (!row.length) return;
      const nodeWidth = Math.min(
        THEME.DIAGRAM_NODE_WIDTH,
        Math.max(0.82, (CONTENT_WIDTH - (row.length - 1) * THEME.DIAGRAM_NODE_H_GAP) / row.length),
      );
      const totalWidth = row.length * nodeWidth + (row.length - 1) * THEME.DIAGRAM_NODE_H_GAP;
      const rowStartX = CONTENT_X + Math.max(0, (CONTENT_WIDTH - totalWidth) / 2);

      row.forEach((node, nodeIndex) => {
        const nodeX = rowStartX + nodeIndex * (nodeWidth + THEME.DIAGRAM_NODE_H_GAP);
        nodes.push({
          text: node,
          box: { x: nodeX, y: currentY, w: nodeWidth, h: THEME.DIAGRAM_NODE_HEIGHT },
          emphasized: nodeIndex === row.length - 1 && rowIndex === rows.length - 1,
        });
        if (nodeIndex < row.length - 1) {
          connectors.push({
            orientation: 'horizontal',
            box: {
              x: nodeX + nodeWidth + 0.04,
              y: currentY + THEME.DIAGRAM_NODE_HEIGHT / 2,
              w: THEME.DIAGRAM_NODE_H_GAP - 0.08,
              h: 0,
            },
          });
        }
      });

      currentY += THEME.DIAGRAM_NODE_HEIGHT;
      if (rowIndex < rows.length - 1) {
        connectors.push({
          orientation: 'vertical',
          box: {
            x: CONTENT_X + CONTENT_WIDTH / 2,
            y: currentY + 0.04,
            w: 0,
            h: THEME.DIAGRAM_ROW_V_GAP - 0.08,
          },
        });
        currentY += THEME.DIAGRAM_ROW_V_GAP;
      }
    });

    return {
      kind: 'dedicated-diagram' as const,
      sectionTitle,
      pageIndex,
      pageCount: pages.length,
      block,
      label: continuationLabel(block, pageIndex, pages.length),
      labelBox,
      nodes,
      connectors,
    };
  });
}
