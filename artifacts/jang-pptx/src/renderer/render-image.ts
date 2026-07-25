import PptxGenJS from 'pptxgenjs';
import { THEME } from '../template/theme';
import {
  CONTENT_X, CONTENT_WIDTH, SECTION_HEADER_Y,
  SLIDE_NUMBER_X, SLIDE_NUMBER_Y, CONTENT_Y_AFTER_HEADER, SAFE_BOTTOM,
} from '../template/geometry';
import { extractImageDimensionsFromDataUrl, fitImageContain, guessAspect, isSupportedImageDataUrl } from './image-sizing';
import type { ImageBlock, ImportedImage } from '../schema/lecture-types';
import { richTextRuns, richTextToPlain } from './rich-text';

export interface ImageRenderResult { rendered: boolean; warnings: string[]; }

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

export function renderImageSlide(
  pptx: PptxGenJS,
  block: ImageBlock,
  importedImages: Record<string, ImportedImage>,
  sectionTitle: string,
): ImageRenderResult {
  const warnings: string[] = [];
  const slide = pptx.addSlide();
  slide.background = { color: THEME.SLIDE_BG };
  addSectionHeader(slide, sectionTitle);

  const captionH = THEME.H_CAPTION + 0.1;
  const area = {
    x: CONTENT_X,
    y: CONTENT_Y_AFTER_HEADER + 0.1,
    w: CONTENT_WIDTH,
    h: SAFE_BOTTOM - (CONTENT_Y_AFTER_HEADER + 0.1) - captionH - 0.15,
  };
  const imported = importedImages[block.slotId];
  let rendered = false;

  if (!imported?.dataUrl) {
    warnings.push(`Image slot "${block.slotId}" (${richTextToPlain(block.label)}) has no imported image — placeholder shown.`);
  } else if (!isSupportedImageDataUrl(imported.dataUrl)) {
    warnings.push(`Image slot "${block.slotId}" is not a supported PNG, JPEG, GIF, WebP, or SVG data URL — placeholder shown.`);
  } else {
    const intrinsic = extractImageDimensionsFromDataUrl(imported.dataUrl);
    if (!intrinsic) {
      warnings.push(`Image slot "${block.slotId}" could not be decoded safely — placeholder shown.`);
    } else {
      const aspect = block.preferredAspect === 'automatic' ? intrinsic.aspect : guessAspect(block.preferredAspect) ?? intrinsic.aspect;
      try {
        if (block.fit === 'cover') {
          slide.addImage({
            data: imported.dataUrl,
            x: area.x, y: area.y, w: area.w, h: area.h,
            sizing: { type: 'cover', w: area.w, h: area.h },
          } as never);
        } else {
          const dimensions = fitImageContain(area.x, area.y, area.w, area.h, aspect);
          slide.addImage({ data: imported.dataUrl, ...dimensions });
        }
        rendered = true;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        warnings.push(`Image slot "${block.slotId}" failed to embed (${message}) — placeholder shown.`);
      }
    }
  }

  if (!rendered) renderPlaceholder(slide, block, area.x, area.y, area.w, area.h);

  slide.addText(richTextRuns(block.label), {
    x: CONTENT_X, y: area.y + area.h + 0.1, w: CONTENT_WIDTH, h: captionH,
    fontFace: THEME.FONT, fontSize: THEME.FONT_CAPTION, italic: true,
    color: THEME.CAPTION_COLOR, align: 'center', valign: 'top', wrap: true,
  });
  slide.slideNumber = {
    x: SLIDE_NUMBER_X, y: SLIDE_NUMBER_Y, fontFace: THEME.FONT,
    fontSize: THEME.FONT_SLIDE_NUMBER, color: THEME.SLIDE_NUMBER_COLOR,
  };
  return { rendered, warnings };
}

function renderPlaceholder(slide: PptxGenJS.Slide, block: ImageBlock, areaX: number, areaY: number, areaW: number, areaH: number): void {
  const padX = areaW * 0.05;
  const x = areaX + padX;
  const w = areaW - 2 * padX;
  slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
    x, y: areaY, w, h: areaH,
    fill: { color: THEME.PLACEHOLDER_BG },
    line: { color: THEME.PLACEHOLDER_BORDER, width: 1.5, dashType: 'dash' },
  });
  const midY = areaY + areaH / 2;
  slide.addText('[Image not imported]', {
    x, y: midY - 0.3, w, h: 0.32,
    fontFace: THEME.FONT, fontSize: 13, bold: true,
    color: THEME.PLACEHOLDER_TEXT, align: 'center', valign: 'middle',
  });
  slide.addText(richTextRuns(block.label), {
    x, y: midY + 0.05, w, h: 0.28,
    fontFace: THEME.FONT, fontSize: 11, color: THEME.BODY_TEXT,
    align: 'center', valign: 'middle', wrap: true,
  });
  if (richTextToPlain(block.description).trim()) {
    slide.addText(richTextRuns(block.description), {
      x: x + 0.4, y: midY + 0.4, w: w - 0.8, h: 0.45,
      fontFace: THEME.FONT, fontSize: 10, italic: true,
      color: THEME.MUTED_TEXT, align: 'center', valign: 'top', wrap: true,
    });
  }
  if (block.sourceReference) {
    slide.addText(`Source: ${block.sourceReference}`, {
      x, y: areaY + areaH - 0.28, w, h: 0.24,
      fontFace: THEME.FONT, fontSize: 9, color: THEME.MUTED_TEXT,
      align: 'center', valign: 'middle',
    });
  }
}
