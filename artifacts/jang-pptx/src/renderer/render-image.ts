import PptxGenJS from 'pptxgenjs';
import { THEME } from '../template/theme';
import {
  CONTENT_X, CONTENT_WIDTH, SECTION_HEADER_Y,
  SLIDE_NUMBER_X, SLIDE_NUMBER_Y, CONTENT_Y_AFTER_HEADER, SAFE_BOTTOM,
} from '../template/geometry';
import { fitImageContain, guessAspect } from './image-sizing';
import type { ImageBlock, ImportedImage } from '../schema/lecture-types';

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

export function renderImageSlide(
  pptx: PptxGenJS,
  block: ImageBlock,
  importedImages: Record<string, ImportedImage>,
  sectionTitle: string,
): void {
  const slide = pptx.addSlide();
  slide.background = { color: THEME.SLIDE_BG };
  addSectionHeader(slide, sectionTitle);

  const captionH = THEME.H_CAPTION + 0.1;
  const imgAreaX = CONTENT_X;
  const imgAreaY = CONTENT_Y_AFTER_HEADER + 0.1;
  const imgAreaW = CONTENT_WIDTH;
  const imgAreaH = SAFE_BOTTOM - imgAreaY - captionH - 0.15;

  const importedImage = importedImages[block.slotId];

  if (importedImage?.dataUrl) {
    const aspect = guessAspect(block.preferredAspect);
    const dims = fitImageContain(imgAreaX, imgAreaY, imgAreaW, imgAreaH, aspect);
    try {
      slide.addImage({
        data: importedImage.dataUrl,
        x: dims.x, y: dims.y, w: dims.w, h: dims.h,
      });
    } catch {
      // Fall through to placeholder on image error
      renderPlaceholder(slide, block, imgAreaX, imgAreaY, imgAreaW, imgAreaH);
    }
  } else {
    renderPlaceholder(slide, block, imgAreaX, imgAreaY, imgAreaW, imgAreaH);
  }

  // Caption
  const captionY = imgAreaY + imgAreaH + 0.1;
  slide.addText(block.label, {
    x: CONTENT_X, y: captionY, w: CONTENT_WIDTH, h: captionH,
    fontFace: THEME.FONT,
    fontSize: THEME.FONT_CAPTION,
    italic: true,
    color: THEME.CAPTION_COLOR,
    align: 'center',
    valign: 'top',
    wrap: true,
  });

  slide.slideNumber = {
    x: SLIDE_NUMBER_X, y: SLIDE_NUMBER_Y,
    fontFace: THEME.FONT,
    fontSize: THEME.FONT_SLIDE_NUMBER,
    color: THEME.SLIDE_NUMBER_COLOR,
  };
}

function renderPlaceholder(
  slide: PptxGenJS.Slide,
  block: ImageBlock,
  areaX: number, areaY: number,
  areaW: number, areaH: number,
): void {
  const padX = areaW * 0.05;
  const pX = areaX + padX;
  const pW = areaW - 2 * padX;

  slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
    x: pX, y: areaY, w: pW, h: areaH,
    fill: { color: THEME.PLACEHOLDER_BG },
    line: { color: THEME.PLACEHOLDER_BORDER, width: 1.5, dashType: 'dash' },
  });

  const midY = areaY + areaH / 2;

  slide.addText('[Image not imported]', {
    x: pX, y: midY - 0.3, w: pW, h: 0.32,
    fontFace: THEME.FONT, fontSize: 13, bold: true,
    color: THEME.PLACEHOLDER_TEXT, align: 'center', valign: 'middle',
  });

  slide.addText(block.label, {
    x: pX, y: midY + 0.05, w: pW, h: 0.28,
    fontFace: THEME.FONT, fontSize: 11,
    color: THEME.BODY_TEXT, align: 'center', valign: 'middle', wrap: true,
  });

  if (block.description) {
    slide.addText(block.description, {
      x: pX + 0.4, y: midY + 0.4, w: pW - 0.8, h: 0.45,
      fontFace: THEME.FONT, fontSize: 10, italic: true,
      color: THEME.MUTED_TEXT, align: 'center', valign: 'top', wrap: true,
    });
  }

  if (block.sourceReference) {
    slide.addText(`Source: ${block.sourceReference}`, {
      x: pX, y: areaY + areaH - 0.28, w: pW, h: 0.24,
      fontFace: THEME.FONT, fontSize: 9,
      color: THEME.MUTED_TEXT, align: 'center', valign: 'middle',
    });
  }
}
