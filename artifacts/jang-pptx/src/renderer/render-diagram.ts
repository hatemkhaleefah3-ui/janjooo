import PptxGenJS from 'pptxgenjs';
import { THEME } from '../template/theme';
import {
  CONTENT_X, CONTENT_WIDTH, SECTION_HEADER_Y,
  SLIDE_NUMBER_X, SLIDE_NUMBER_Y, CONTENT_Y_AFTER_HEADER, SAFE_BOTTOM,
} from '../template/geometry';
import type { DiagramBlock } from '../schema/lecture-types';

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

/**
 * Renders diagram nodes and connectors at the given area.
 * Returns the approximate height used.
 */
export function addDiagramToSlide(
  slide: PptxGenJS.Slide,
  block: DiagramBlock,
  areaX: number, areaY: number,
  areaW: number,
  _areaH: number,
): number {
  let currentY = areaY;

  // Label
  slide.addText(block.label, {
    x: areaX, y: currentY, w: areaW, h: THEME.H_DIAGRAM_LABEL,
    fontFace: THEME.FONT, fontSize: 11, bold: true,
    color: THEME.NAVY, align: 'left', valign: 'top',
  });
  currentY += THEME.H_DIAGRAM_LABEL + 0.06;

  const nH = THEME.DIAGRAM_NODE_HEIGHT;
  const nW = THEME.DIAGRAM_NODE_WIDTH;
  const hGap = THEME.DIAGRAM_NODE_H_GAP;
  const vGap = THEME.DIAGRAM_ROW_V_GAP;

  for (let ri = 0; ri < block.diagramRows.length; ri++) {
    const row = block.diagramRows[ri];
    if (row.length === 0) continue;

    // Scale node width down if many nodes per row
    const maxNodesPerRow = Math.max(...block.diagramRows.map((r) => r.length));
    const scaledNW = maxNodesPerRow > 4
      ? Math.min(nW, (areaW - (maxNodesPerRow - 1) * hGap) / maxNodesPerRow)
      : nW;

    const totalRowW = row.length * scaledNW + (row.length - 1) * hGap;
    const rowStartX = areaX + Math.max(0, (areaW - totalRowW) / 2);
    const rowY = currentY;

    for (let ni = 0; ni < row.length; ni++) {
      const nodeX = rowStartX + ni * (scaledNW + hGap);
      const nodeLabel = row[ni];

      // Node rectangle
      slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
        x: nodeX, y: rowY, w: scaledNW, h: nH,
        fill: { color: THEME.DIAGRAM_NODE_BG },
        line: { color: THEME.DIAGRAM_NODE_BORDER, width: 1 },
      });

      // Node text
      slide.addText(nodeLabel, {
        x: nodeX + 0.06, y: rowY + 0.03,
        w: scaledNW - 0.12, h: nH - 0.06,
        fontFace: THEME.FONT,
        fontSize: THEME.FONT_DIAGRAM_NODE,
        bold: true,
        color: THEME.DIAGRAM_NODE_TEXT,
        align: 'center',
        valign: 'middle',
        wrap: true,
      });

      // Horizontal connector to next node
      if (ni < row.length - 1) {
        const connX = nodeX + scaledNW;
        const connY = rowY + nH / 2;
        // Connector line
        slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
          x: connX, y: connY - 0.008,
          w: hGap - 0.05, h: 0.016,
          fill: { color: THEME.DIAGRAM_CONNECTOR },
          line: { color: THEME.DIAGRAM_CONNECTOR, width: 0 },
        });
        // Arrowhead triangle (approximated as small rect)
        slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
          x: connX + hGap - 0.08, y: connY - 0.055,
          w: 0.055, h: 0.11,
          fill: { color: THEME.DIAGRAM_CONNECTOR },
          line: { color: THEME.DIAGRAM_CONNECTOR, width: 0 },
        });
      }
    }

    currentY += nH;

    // Vertical connector to next row
    if (ri < block.diagramRows.length - 1) {
      const connX = areaX + areaW / 2 - 0.008;
      slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
        x: connX, y: currentY, w: 0.016, h: vGap - 0.05,
        fill: { color: THEME.DIAGRAM_CONNECTOR },
        line: { color: THEME.DIAGRAM_CONNECTOR, width: 0 },
      });
      // Arrowhead
      slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
        x: connX - 0.05, y: currentY + vGap - 0.1,
        w: 0.116, h: 0.08,
        fill: { color: THEME.DIAGRAM_CONNECTOR },
        line: { color: THEME.DIAGRAM_CONNECTOR, width: 0 },
      });
      currentY += vGap;
    }
  }

  return currentY - areaY;
}

/**
 * Renders a large diagram (> 4 total nodes) on a dedicated slide.
 */
export function renderDedicatedDiagramSlide(
  pptx: PptxGenJS,
  block: DiagramBlock,
  sectionTitle: string,
): void {
  const slide = pptx.addSlide();
  slide.background = { color: THEME.SLIDE_BG };
  addSectionHeader(slide, sectionTitle);

  const areaX = CONTENT_X;
  const areaY = CONTENT_Y_AFTER_HEADER + 0.1;
  const areaW = CONTENT_WIDTH;
  const areaH = SAFE_BOTTOM - areaY - 0.1;

  addDiagramToSlide(slide, block, areaX, areaY, areaW, areaH);

  slide.slideNumber = {
    x: SLIDE_NUMBER_X, y: SLIDE_NUMBER_Y,
    fontFace: THEME.FONT,
    fontSize: THEME.FONT_SLIDE_NUMBER,
    color: THEME.SLIDE_NUMBER_COLOR,
  };
}
