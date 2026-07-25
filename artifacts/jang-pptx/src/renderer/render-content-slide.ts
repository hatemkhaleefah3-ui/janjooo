import PptxGenJS from 'pptxgenjs';
import { THEME } from '../template/theme';
import {
  CONTENT_X, CONTENT_WIDTH, getContentYStart,
  IMAGE_COLUMN_X, IMAGE_COLUMN_WIDTH, TEXT_WIDTH_WITH_IMAGE,
} from '../template/geometry';
import { addEditorialFooter, addEditorialHeader } from '../template/editorial';
import { addTableToSlide } from './render-table';
import { addDiagramToSlide } from './render-diagram';
import { estimateBlockHeight } from './paginate-content';
import { paintImageIntoArea } from './render-image';
import { calloutBorderColor, calloutLabelColor, calloutLabelText } from './render-text';
import type { ImageBlock, ImportedImage, LectureBlock, RichText } from '../schema/lecture-types';
import { listTextRuns, richTextRuns, richTextToPlain } from './rich-text';

export interface ContentSlideInfo {
  slideTitle: string;
  slideSubtitle: RichText;
  isFirstPage: boolean;
  sectionTitle: string;
}

/**
 * Renders one content page. When `blocks` carries an image (issue #22,
 * requirement 3), the page uses a two-column layout: text renders in a
 * narrowed left column and the image renders in a fixed right-hand column,
 * instead of the image consuming its own dedicated slide. `paginateContent`
 * guarantees at most one image reaches this function per page.
 */
export function renderContentSlide(
  pptx: PptxGenJS,
  blocks: LectureBlock[],
  info: ContentSlideInfo,
  importedImages: Record<string, ImportedImage> = {},
  warnings: string[] = [],
): void {
  const slide = pptx.addSlide();
  slide.background = { color: THEME.SLIDE_BG };
  addEditorialHeader(slide, 'Lecture content', info.sectionTitle);

  const imageBlock = blocks.find((block): block is ImageBlock => block.type === 'image');
  const textWidth = imageBlock ? TEXT_WIDTH_WITH_IMAGE : CONTENT_WIDTH;

  const hasTitle = info.isFirstPage && Boolean(info.slideTitle.trim());
  const hasSubtitle = info.isFirstPage && Boolean(richTextToPlain(info.slideSubtitle).trim());

  if (hasTitle) {
    const titleY = getContentYStart(false, false);
    slide.addText(info.slideTitle, {
      x: CONTENT_X, y: titleY, w: Math.min(CONTENT_WIDTH, 8.5), h: THEME.TITLE_HEIGHT,
      fontFace: THEME.headingFont, fontSize: THEME.FONT_SLIDE_TITLE,
      bold: true, color: THEME.DARK_TEXT, margin: 0,
      align: 'left', valign: 'top', wrap: true, fit: 'shrink',
    });
    slide.addShape('line' as PptxGenJS.SHAPE_NAME, {
      x: CONTENT_X, y: titleY + THEME.TITLE_HEIGHT + 0.03, w: 1.12, h: 0,
      line: { color: THEME.DARK_TEXT, width: 1.4 },
    });
  }
  if (hasSubtitle) {
    slide.addText(richTextRuns(info.slideSubtitle), {
      x: CONTENT_X, y: getContentYStart(hasTitle, false), w: Math.min(textWidth, 8.4), h: THEME.SUBTITLE_HEIGHT,
      fontFace: THEME.bodyFont, fontSize: THEME.FONT_SLIDE_SUBTITLE,
      color: THEME.MUTED_TEXT, margin: 0,
      align: 'left', valign: 'top', wrap: true, fit: 'shrink',
    });
  }

  if (imageBlock) {
    const imageAreaY = getContentYStart(hasTitle, hasSubtitle);
    const imageAreaH = Math.max(1.2, THEME.SLIDE_HEIGHT - 0.7 - imageAreaY);
    const result = paintImageIntoArea(slide, imageBlock, importedImages, IMAGE_COLUMN_X, imageAreaY, IMAGE_COLUMN_WIDTH, imageAreaH);
    warnings.push(...result.warnings);
    if (imageBlock.sourceReference.trim()) {
      slide.addText(`Source: ${imageBlock.sourceReference}`, {
        x: IMAGE_COLUMN_X, y: imageAreaY + imageAreaH + 0.06, w: IMAGE_COLUMN_WIDTH, h: 0.2,
        fontFace: THEME.bodyFont, fontSize: THEME.FONT_CAPTION,
        italic: true, color: THEME.CAPTION_COLOR, margin: 0,
        align: 'left', valign: 'top', fit: 'shrink',
      });
    }
  }

  let currentY = getContentYStart(hasTitle, hasSubtitle);
  const nonImageBlocks = blocks.filter((block) => block.type !== 'image');
  if (imageBlock && nonImageBlocks.length === 0) {
    const label = richTextToPlain(imageBlock.label).trim();
    const description = richTextToPlain(imageBlock.description).trim();
    if (label) {
      slide.addText(richTextRuns(imageBlock.label), {
        x: CONTENT_X, y: currentY, w: textWidth, h: 0.72,
        fontFace: THEME.headingFont, fontSize: THEME.FONT_SUBTITLE_BLOCK,
        bold: true, color: THEME.DARK_TEXT, margin: 0,
        align: 'left', valign: 'top', wrap: true, fit: 'shrink',
      });
      currentY += 0.9;
    }
    if (description) {
      slide.addText(richTextRuns(imageBlock.description), {
        x: CONTENT_X, y: currentY, w: textWidth, h: 1.5,
        fontFace: THEME.bodyFont, fontSize: THEME.FONT_PARAGRAPH,
        color: THEME.BODY_TEXT, margin: 0,
        align: 'left', valign: 'top', wrap: true, fit: 'shrink',
      });
    }
  }
  for (const block of blocks) {
    if (block.type === 'image') continue; // rendered once in the image column above
    const height = Math.max(0.1, estimateBlockHeight(block, textWidth) - THEME.BLOCK_GAP);
    switch (block.type) {
      case 'subtitle':
        slide.addText(richTextRuns(block.text), {
          x: CONTENT_X, y: currentY, w: Math.min(textWidth, 8.8), h: height,
          fontFace: THEME.headingFont, fontSize: THEME.FONT_SUBTITLE_BLOCK,
          bold: true, color: THEME.DARK_TEXT, margin: 0,
          align: 'left', valign: 'top', wrap: true, fit: 'shrink',
        });
        break;
      case 'paragraph':
        slide.addText(richTextRuns(block.text), {
          x: CONTENT_X, y: currentY, w: Math.min(textWidth, 9.05), h: height,
          fontFace: THEME.bodyFont, fontSize: THEME.FONT_PARAGRAPH,
          color: THEME.BODY_TEXT, margin: 0,
          align: 'left', valign: 'top', wrap: true, paraSpaceAfter: 7, breakLine: false, fit: 'shrink',
        } as PptxGenJS.TextPropsOptions);
        break;
      case 'bullets':
        slide.addText(listTextRuns(block.items, 'bullet'), {
          x: CONTENT_X + 0.02, y: currentY, w: Math.min(textWidth - 0.02, 9.5), h: height,
          fontFace: THEME.bodyFont, fontSize: THEME.FONT_BULLET,
          color: THEME.BODY_TEXT, margin: 0.01,
          align: 'left', valign: 'top', wrap: true, paraSpaceAfter: 8, fit: 'shrink',
        } as PptxGenJS.TextPropsOptions);
        break;
      case 'numbered':
        slide.addText(listTextRuns(block.items, 'number', block.startAt ?? 1), {
          x: CONTENT_X + 0.02, y: currentY, w: Math.min(textWidth - 0.02, 9.5), h: height,
          fontFace: THEME.bodyFont, fontSize: THEME.FONT_NUMBERED,
          color: THEME.BODY_TEXT, margin: 0.01,
          align: 'left', valign: 'top', wrap: true, paraSpaceAfter: 8, fit: 'shrink',
        } as PptxGenJS.TextPropsOptions);
        break;
      case 'callout': {
        const border = calloutBorderColor(block.tone);
        const labelColor = calloutLabelColor(block.tone);
        const calloutW = Math.min(textWidth, 9.35);
        slide.addShape('line' as PptxGenJS.SHAPE_NAME, {
          x: CONTENT_X, y: currentY, w: 0, h: height,
          line: { color: border, width: 1.6 },
        });
        slide.addText([
          { text: `${calloutLabelText(block.tone)} / `, options: { bold: true, color: labelColor } },
          ...richTextRuns(block.label),
        ], {
          x: CONTENT_X + 0.2, y: currentY + 0.02, w: calloutW - 0.2, h: 0.22,
          fontFace: THEME.labelFont, fontSize: THEME.FONT_CALLOUT_LABEL,
          bold: true, charSpacing: 1.1, color: labelColor, margin: 0,
          align: 'left', valign: 'top', fit: 'shrink',
        });
        slide.addText(richTextRuns(block.text), {
          x: CONTENT_X + 0.2, y: currentY + 0.3, w: calloutW - 0.2, h: Math.max(0.18, height - 0.32),
          fontFace: THEME.bodyFont, fontSize: THEME.FONT_CALLOUT_TEXT,
          color: THEME.BODY_TEXT, margin: 0,
          align: 'left', valign: 'top', wrap: true, fit: 'shrink',
        });
        break;
      }
      case 'table': {
        const width = block.headers.length <= THEME.TABLE_LARGE_THRESHOLD ? textWidth * 0.82 : textWidth;
        addTableToSlide(slide, block, CONTENT_X, currentY, width, height);
        break;
      }
      case 'diagram': {
        const totalNodes = block.diagramRows.reduce((sum, row) => sum + row.length, 0);
        const width = totalNodes <= THEME.DIAGRAM_LARGE_THRESHOLD ? textWidth * 0.82 : textWidth;
        addDiagramToSlide(slide, block, CONTENT_X, currentY, width, height);
        break;
      }
    }
    currentY += height + THEME.BLOCK_GAP;
  }

  addEditorialFooter(slide, info.sectionTitle);
}
