import PptxGenJS from 'pptxgenjs';
import { THEME } from '../template/theme';
import {
  CONTENT_X, CONTENT_WIDTH, SECTION_HEADER_Y,
  SLIDE_NUMBER_X, SLIDE_NUMBER_Y, getContentYStart,
} from '../template/geometry';
import { addTableToSlide } from './render-table';
import { addDiagramToSlide } from './render-diagram';
import { estimateBlockHeight } from './paginate-content';
import { calloutBgColor, calloutBorderColor, calloutLabelColor, calloutLabelText } from './render-text';
import type { LectureBlock, RichText } from '../schema/lecture-types';
import { listTextRuns, richTextRuns, richTextToPlain } from './rich-text';

function addSectionHeader(slide: PptxGenJS.Slide, sectionTitle: string): void {
  slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
    x: 0, y: SECTION_HEADER_Y, w: THEME.SLIDE_WIDTH, h: THEME.SECTION_HEADER_HEIGHT,
    fill: { color: THEME.SECTION_HEADER_BG }, line: { color: THEME.SECTION_HEADER_BG, width: 0 },
  });
  slide.addText(sectionTitle, {
    x: CONTENT_X, y: SECTION_HEADER_Y, w: CONTENT_WIDTH, h: THEME.SECTION_HEADER_HEIGHT,
    fontFace: THEME.FONT, fontSize: THEME.FONT_SECTION_HEADER,
    color: THEME.SECTION_HEADER_TEXT, align: 'left', valign: 'middle',
  });
}

export interface ContentSlideInfo {
  slideTitle: string;
  slideSubtitle: RichText;
  isFirstPage: boolean;
  sectionTitle: string;
}

export function renderContentSlide(pptx: PptxGenJS, blocks: LectureBlock[], info: ContentSlideInfo): void {
  const slide = pptx.addSlide();
  slide.background = { color: THEME.SLIDE_BG };
  addSectionHeader(slide, info.sectionTitle);
  const hasTitle = info.isFirstPage && Boolean(info.slideTitle.trim());
  const hasSubtitle = info.isFirstPage && Boolean(richTextToPlain(info.slideSubtitle).trim());

  if (hasTitle) {
    const titleY = getContentYStart(false, false);
    slide.addText(info.slideTitle, {
      x: CONTENT_X, y: titleY, w: CONTENT_WIDTH, h: THEME.TITLE_HEIGHT,
      fontFace: THEME.headingFont, fontSize: THEME.FONT_SLIDE_TITLE,
      bold: true, color: THEME.NAVY, align: 'left', valign: 'middle',
    });
    const dividerY = titleY + THEME.TITLE_HEIGHT + 0.02;
    slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
      x: CONTENT_X, y: dividerY, w: CONTENT_WIDTH, h: THEME.DIVIDER_HEIGHT,
      fill: { color: THEME.DIVIDER_COLOR }, line: { color: THEME.DIVIDER_COLOR, width: 0 },
    });
  }
  if (hasSubtitle) {
    slide.addText(richTextRuns(info.slideSubtitle), {
      x: CONTENT_X, y: getContentYStart(hasTitle, false), w: CONTENT_WIDTH, h: THEME.SUBTITLE_HEIGHT,
      fontFace: THEME.bodyFont, fontSize: THEME.FONT_SLIDE_SUBTITLE,
      bold: true, color: THEME.BODY_TEXT, align: 'left', valign: 'top', wrap: true,
    });
  }

  let currentY = getContentYStart(hasTitle, hasSubtitle);
  for (const block of blocks) {
    const height = Math.max(0.1, estimateBlockHeight(block) - THEME.BLOCK_GAP);
    switch (block.type) {
      case 'subtitle':
        slide.addText(richTextRuns(block.text), {
          x: CONTENT_X, y: currentY, w: CONTENT_WIDTH, h: height,
          fontFace: THEME.headingFont, fontSize: THEME.FONT_SUBTITLE_BLOCK,
          bold: true, color: THEME.NAVY, align: 'left', valign: 'top', wrap: true, fit: 'shrink',
        });
        break;
      case 'paragraph':
        slide.addText(richTextRuns(block.text), {
          x: CONTENT_X, y: currentY, w: CONTENT_WIDTH, h: height,
          fontFace: THEME.bodyFont, fontSize: THEME.FONT_PARAGRAPH,
          color: THEME.BODY_TEXT, align: 'left', valign: 'top', wrap: true, paraSpaceAfter: 4, fit: 'shrink',
        } as PptxGenJS.TextPropsOptions);
        break;
      case 'bullets':
        slide.addText(listTextRuns(block.items, 'bullet'), {
          x: CONTENT_X + 0.1, y: currentY, w: CONTENT_WIDTH - 0.1, h: height,
          fontFace: THEME.bodyFont, fontSize: THEME.FONT_BULLET,
          color: THEME.BODY_TEXT, align: 'left', valign: 'top', wrap: true, paraSpaceAfter: 3, fit: 'shrink',
        } as PptxGenJS.TextPropsOptions);
        break;
      case 'numbered':
        slide.addText(listTextRuns(block.items, 'number', block.startAt ?? 1), {
          x: CONTENT_X + 0.1, y: currentY, w: CONTENT_WIDTH - 0.1, h: height,
          fontFace: THEME.bodyFont, fontSize: THEME.FONT_NUMBERED,
          color: THEME.BODY_TEXT, align: 'left', valign: 'top', wrap: true, paraSpaceAfter: 3, fit: 'shrink',
        } as PptxGenJS.TextPropsOptions);
        break;
      case 'callout': {
        const background = calloutBgColor(block.tone);
        const border = calloutBorderColor(block.tone);
        const labelColor = calloutLabelColor(block.tone);
        slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
          x: CONTENT_X, y: currentY, w: CONTENT_WIDTH, h: height,
          fill: { color: background }, line: { color: border, width: 1.5 },
        });
        slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
          x: CONTENT_X, y: currentY, w: 0.06, h: height,
          fill: { color: border }, line: { color: border, width: 0 },
        });
        slide.addText([
          { text: `${calloutLabelText(block.tone)}: `, options: { bold: true, color: labelColor } },
          ...richTextRuns(block.label),
        ], {
          x: CONTENT_X + 0.14, y: currentY + 0.06, w: CONTENT_WIDTH - 0.2, h: 0.22,
          fontFace: THEME.labelFont, fontSize: THEME.FONT_CALLOUT_LABEL,
          bold: true, color: labelColor, align: 'left', valign: 'top',
        });
        slide.addText(richTextRuns(block.text), {
          x: CONTENT_X + 0.14, y: currentY + 0.28, w: CONTENT_WIDTH - 0.2, h: Math.max(0.12, height - 0.34),
          fontFace: THEME.bodyFont, fontSize: THEME.FONT_CALLOUT_TEXT,
          color: THEME.BODY_TEXT, align: 'left', valign: 'top', wrap: true, fit: 'shrink',
        });
        break;
      }
      case 'table': {
        const width = block.headers.length <= THEME.TABLE_LARGE_THRESHOLD ? CONTENT_WIDTH * 0.75 : CONTENT_WIDTH;
        addTableToSlide(slide, block, CONTENT_X + (CONTENT_WIDTH - width) / 2, currentY, width, height);
        break;
      }
      case 'diagram': {
        const totalNodes = block.diagramRows.reduce((sum, row) => sum + row.length, 0);
        const width = totalNodes <= THEME.DIAGRAM_LARGE_THRESHOLD ? CONTENT_WIDTH * 0.72 : CONTENT_WIDTH;
        addDiagramToSlide(slide, block, CONTENT_X + (CONTENT_WIDTH - width) / 2, currentY, width, height);
        break;
      }
      case 'image':
        break;
    }
    currentY += height + THEME.BLOCK_GAP;
  }
  slide.slideNumber = {
    x: SLIDE_NUMBER_X, y: SLIDE_NUMBER_Y, fontFace: THEME.FONT,
    fontSize: THEME.FONT_SLIDE_NUMBER, color: THEME.SLIDE_NUMBER_COLOR,
  };
}
