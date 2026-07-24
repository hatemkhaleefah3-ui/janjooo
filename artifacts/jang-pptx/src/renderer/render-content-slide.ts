import PptxGenJS from 'pptxgenjs';
import { THEME } from '../template/theme';
import {
  CONTENT_X, CONTENT_WIDTH, SECTION_HEADER_Y,
  SLIDE_NUMBER_X, SLIDE_NUMBER_Y,
  getContentYStart, SAFE_BOTTOM,
} from '../template/geometry';
import { addTableToSlide } from './render-table';
import { addDiagramToSlide } from './render-diagram';
import {
  calloutBgColor, calloutBorderColor, calloutLabelColor, calloutLabelText,
} from './render-text';
import type { LectureBlock, TableBlock, DiagramBlock } from '../schema/lecture-types';
import { listTextRuns, richTextRuns, richTextToPlain } from './rich-text';

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

export interface ContentSlideInfo {
  slideTitle: string;
  slideSubtitle: import('../schema/lecture-types').RichText;
  isFirstPage: boolean;
  sectionTitle: string;
}

export function renderContentSlide(
  pptx: PptxGenJS,
  blocks: LectureBlock[],
  info: ContentSlideInfo,
): void {
  const slide = pptx.addSlide();
  slide.background = { color: THEME.SLIDE_BG };
  addSectionHeader(slide, info.sectionTitle);

  const hasTitle = info.isFirstPage && !!info.slideTitle.trim();
  const hasSubtitle = info.isFirstPage && !!richTextToPlain(info.slideSubtitle).trim();

  // ─── Slide title ──────────────────────────────────────────────────────────
  if (hasTitle) {
    const titleY = getContentYStart(false, false);
    slide.addText(info.slideTitle, {
      x: CONTENT_X, y: titleY, w: CONTENT_WIDTH, h: THEME.TITLE_HEIGHT,
      fontFace: THEME.FONT, fontSize: THEME.FONT_SLIDE_TITLE,
      bold: true, color: THEME.NAVY, align: 'left', valign: 'middle',
    });

    // Divider
    const divY = titleY + THEME.TITLE_HEIGHT + 0.02;
    slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
      x: CONTENT_X, y: divY, w: CONTENT_WIDTH, h: THEME.DIVIDER_HEIGHT,
      fill: { color: THEME.DIVIDER_COLOR },
      line: { color: THEME.DIVIDER_COLOR, width: 0 },
    });
  }

  // ─── Slide subtitle ───────────────────────────────────────────────────────
  if (hasSubtitle) {
    const subY = getContentYStart(hasTitle, false);
    slide.addText(richTextRuns(info.slideSubtitle), {
      x: CONTENT_X, y: subY, w: CONTENT_WIDTH, h: THEME.SUBTITLE_HEIGHT,
      fontFace: THEME.FONT, fontSize: THEME.FONT_SLIDE_SUBTITLE,
      bold: true, color: THEME.BODY_TEXT, align: 'left', valign: 'top',
    });
  }

  // ─── Content blocks ───────────────────────────────────────────────────────
  let currentY = getContentYStart(hasTitle, hasSubtitle);
  const maxY = SAFE_BOTTOM - 0.05;

  for (const block of blocks) {
    if (currentY >= maxY) break;
    const remainH = maxY - currentY;

    switch (block.type) {
      case 'subtitle': {
        slide.addText(richTextRuns(block.text), {
          x: CONTENT_X, y: currentY, w: CONTENT_WIDTH, h: THEME.H_SUBTITLE_BLOCK,
          fontFace: THEME.FONT, fontSize: THEME.FONT_SUBTITLE_BLOCK,
          bold: true, color: THEME.NAVY, align: 'left', valign: 'top', wrap: true,
        });
        currentY += THEME.H_SUBTITLE_BLOCK + THEME.BLOCK_GAP;
        break;
      }

      case 'paragraph': {
        const estimatedLines = Math.max(1, Math.ceil(richTextToPlain(block.text).length / (CONTENT_WIDTH * 8.5)));
        const ph = Math.min(remainH - 0.05, Math.max(0.28, estimatedLines * 0.22 + 0.1));
        slide.addText(richTextRuns(block.text), {
          x: CONTENT_X, y: currentY, w: CONTENT_WIDTH, h: ph,
          fontFace: THEME.FONT, fontSize: THEME.FONT_PARAGRAPH,
          color: THEME.BODY_TEXT, align: 'left', valign: 'top', wrap: true, paraSpaceAfter: 4,
        });
        currentY += ph + THEME.BLOCK_GAP;
        break;
      }

      case 'bullets': {
        const bulletText = listTextRuns(block.items, 'bullet');
        const bh = Math.min(remainH - 0.05, block.items.length * THEME.H_BULLET_ITEM + 0.08);
        slide.addText(bulletText, {
          x: CONTENT_X + 0.1, y: currentY, w: CONTENT_WIDTH - 0.1, h: bh,
          fontFace: THEME.FONT, fontSize: THEME.FONT_BULLET,
          color: THEME.BODY_TEXT, align: 'left', valign: 'top', wrap: true, paraSpaceAfter: 3,
        });
        currentY += bh + THEME.BLOCK_GAP;
        break;
      }

      case 'numbered': {
        const numText = listTextRuns(block.items, 'number');
        const nh = Math.min(remainH - 0.05, block.items.length * THEME.H_NUMBERED_ITEM + 0.08);
        slide.addText(numText, {
          x: CONTENT_X + 0.1, y: currentY, w: CONTENT_WIDTH - 0.1, h: nh,
          fontFace: THEME.FONT, fontSize: THEME.FONT_NUMBERED,
          color: THEME.BODY_TEXT, align: 'left', valign: 'top', wrap: true, paraSpaceAfter: 3,
        });
        currentY += nh + THEME.BLOCK_GAP;
        break;
      }

      case 'callout': {
        const textLines = Math.max(1, Math.ceil(richTextToPlain(block.text).length / 120));
        const callH = Math.min(remainH - 0.05, Math.max(THEME.H_CALLOUT_MIN, textLines * 0.22 + 0.28));
        const bgCol = calloutBgColor(block.tone);
        const borderCol = calloutBorderColor(block.tone);
        const labelCol = calloutLabelColor(block.tone);
        const labelStr = calloutLabelText(block.tone);

        // Background
        slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
          x: CONTENT_X, y: currentY, w: CONTENT_WIDTH, h: callH,
          fill: { color: bgCol },
          line: { color: borderCol, width: 1.5 },
        });
        // Left accent bar
        slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
          x: CONTENT_X, y: currentY, w: 0.06, h: callH,
          fill: { color: borderCol },
          line: { color: borderCol, width: 0 },
        });
        // Label
        slide.addText([
          { text: `${labelStr}: `, options: { bold: true, color: labelCol } },
          ...richTextRuns(block.label),
        ], {
          x: CONTENT_X + 0.14, y: currentY + 0.06, w: CONTENT_WIDTH - 0.2, h: 0.22,
          fontFace: THEME.FONT, fontSize: THEME.FONT_CALLOUT_LABEL,
          bold: true, color: labelCol, align: 'left', valign: 'top',
        });
        // Text
        slide.addText(richTextRuns(block.text), {
          x: CONTENT_X + 0.14, y: currentY + 0.28, w: CONTENT_WIDTH - 0.2, h: callH - 0.34,
          fontFace: THEME.FONT, fontSize: THEME.FONT_CALLOUT_TEXT,
          color: THEME.BODY_TEXT, align: 'left', valign: 'top', wrap: true,
        });
        currentY += callH + THEME.BLOCK_GAP;
        break;
      }

      case 'table': {
        const tbl = block as TableBlock;
        const isSmall = tbl.headers.length <= THEME.TABLE_LARGE_THRESHOLD;
        const tableW = isSmall ? Math.min(CONTENT_WIDTH, CONTENT_WIDTH * 0.75) : CONTENT_WIDTH;
        const tableX = isSmall ? CONTENT_X : CONTENT_X;
        const used = addTableToSlide(slide, tbl, tableX, currentY, tableW, remainH - 0.1);
        currentY += used + THEME.BLOCK_GAP;
        break;
      }

      case 'diagram': {
        const dia = block as DiagramBlock;
        const totalNodes = dia.diagramRows.reduce((s, r) => s + r.length, 0);
        const isSmall = totalNodes <= THEME.DIAGRAM_LARGE_THRESHOLD;
        const diaW = isSmall ? CONTENT_WIDTH * 0.72 : CONTENT_WIDTH;
        const diaX = CONTENT_X + (CONTENT_WIDTH - diaW) / 2;
        const rowCount = dia.diagramRows.length;
        const diaH = Math.min(
          remainH - 0.1,
          THEME.H_DIAGRAM_LABEL + 0.06 +
          rowCount * (THEME.DIAGRAM_NODE_HEIGHT + THEME.DIAGRAM_ROW_V_GAP),
        );
        addDiagramToSlide(slide, dia, diaX, currentY, diaW, diaH);
        currentY += diaH + THEME.BLOCK_GAP;
        break;
      }

      case 'image':
        // Image blocks are intercepted by the paginator — should not appear here
        break;
    }
  }

  slide.slideNumber = {
    x: SLIDE_NUMBER_X, y: SLIDE_NUMBER_Y,
    fontFace: THEME.FONT,
    fontSize: THEME.FONT_SLIDE_NUMBER,
    color: THEME.SLIDE_NUMBER_COLOR,
  };
}
