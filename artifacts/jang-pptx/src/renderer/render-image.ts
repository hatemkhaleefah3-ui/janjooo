import PptxGenJS from 'pptxgenjs';
import { THEME } from '../template/theme';
import { CONTENT_X } from '../template/geometry';
import { addEditorialFooter, addEditorialHeader } from '../template/editorial';
import { extractIntrinsicImageSize, fitImageContain, fitImageCover, isUsableImageDataUrl } from './image-sizing';
import type { ImageBlock, ImportedImage } from '../schema/lecture-types';
import { richTextRuns, richTextToPlain } from './rich-text';

export interface ImageRenderResult { rendered: boolean; warnings: string[]; }

export function renderImageSlide(
  pptx: PptxGenJS,
  block: ImageBlock,
  importedImages: Record<string, ImportedImage>,
  sectionTitle: string,
): ImageRenderResult {
  const warnings: string[] = [];
  const slide = pptx.addSlide();
  slide.background = { color: THEME.SLIDE_BG };
  addEditorialHeader(slide, 'Image evidence', sectionTitle);

  const frame = { x: CONTENT_X, y: 1.55, w: 6.15, h: 4.72 };
  const copy = { x: 7.32, y: 1.62, w: 4.7, h: 4.65 };
  slide.addShape('roundRect' as PptxGenJS.SHAPE_NAME, {
    ...frame, rectRadius: 0.06,
    fill: { color: THEME.WHITE }, line: { color: THEME.DIVIDER_COLOR, width: 0.6 },
  } as never);

  const imported = importedImages[block.slotId];
  let rendered = false;
  const imageArea = { x: frame.x + 0.22, y: frame.y + 0.22, w: frame.w - 0.44, h: frame.h - 0.44 };

  if (!imported?.dataUrl) {
    warnings.push(`Image slot "${block.slotId}" (${richTextToPlain(block.label)}) has no imported image — placeholder shown.`);
  } else if (!isUsableImageDataUrl(imported.dataUrl)) {
    warnings.push(`Image slot "${block.slotId}" is not a supported PNG, JPEG, GIF, WebP, or SVG data URL — placeholder shown.`);
  } else {
    const intrinsic = extractIntrinsicImageSize(imported.dataUrl);
    if (!intrinsic) {
      warnings.push(`Image slot "${block.slotId}" could not be decoded safely — placeholder shown.`);
    } else {
      try {
        if (block.fit === 'cover') {
          const dimensions = fitImageCover(imageArea.x, imageArea.y, imageArea.w, imageArea.h);
          slide.addImage({
            data: imported.dataUrl,
            ...dimensions,
            sizing: { type: 'cover', w: dimensions.w, h: dimensions.h },
          });
        } else {
          slide.addImage({ data: imported.dataUrl, ...fitImageContain(imageArea.x, imageArea.y, imageArea.w, imageArea.h, intrinsic.aspect) });
        }
        rendered = true;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        warnings.push(`Image slot "${block.slotId}" failed to embed (${message}) — placeholder shown.`);
      }
    }
  }

  if (!rendered) renderPlaceholder(slide, block, imageArea.x, imageArea.y, imageArea.w, imageArea.h);

  slide.addText('IMAGE / EDITABLE OBJECT', {
    x: copy.x, y: copy.y, w: copy.w, h: 0.18,
    fontFace: THEME.labelFont, fontSize: 8, bold: true,
    charSpacing: 1.5, color: THEME.MUTED_TEXT, margin: 0,
  });
  slide.addText(richTextRuns(block.label), {
    x: copy.x, y: copy.y + 0.45, w: copy.w, h: 0.82,
    fontFace: THEME.headingFont, fontSize: 23, bold: true,
    color: THEME.DARK_TEXT, margin: 0,
    align: 'left', valign: 'top', wrap: true, fit: 'shrink',
  });
  slide.addShape('line' as PptxGenJS.SHAPE_NAME, {
    x: copy.x, y: copy.y + 1.5, w: 1.05, h: 0,
    line: { color: THEME.DARK_TEXT, width: 1.4 },
  });
  if (richTextToPlain(block.description).trim()) {
    slide.addText(richTextRuns(block.description), {
      x: copy.x, y: copy.y + 1.82, w: copy.w, h: 1.55,
      fontFace: THEME.bodyFont, fontSize: 15,
      color: THEME.BODY_TEXT, margin: 0,
      align: 'left', valign: 'top', wrap: true, fit: 'shrink',
    });
  }
  slide.addText(block.fit === 'cover' ? 'COVER CROP' : 'CONTAIN / FULL IMAGE', {
    x: copy.x, y: copy.y + 3.72, w: copy.w, h: 0.18,
    fontFace: THEME.labelFont, fontSize: 8, bold: true,
    charSpacing: 1.2, color: THEME.MUTED_TEXT, margin: 0,
  });
  if (block.sourceReference) {
    slide.addText(`Source: ${block.sourceReference}`, {
      x: copy.x, y: copy.y + 4.06, w: copy.w, h: 0.22,
      fontFace: THEME.bodyFont, fontSize: THEME.FONT_CAPTION,
      italic: true, color: THEME.CAPTION_COLOR, margin: 0,
      align: 'left', valign: 'top', fit: 'shrink',
    });
  }

  addEditorialFooter(slide, sectionTitle);
  return { rendered, warnings };
}

function renderPlaceholder(slide: PptxGenJS.Slide, block: ImageBlock, areaX: number, areaY: number, areaW: number, areaH: number): void {
  slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
    x: areaX, y: areaY, w: areaW, h: areaH,
    fill: { color: THEME.PLACEHOLDER_BG },
    line: { color: THEME.PLACEHOLDER_BORDER, width: 1, dashType: 'dash' },
  });
  slide.addText('[Image not imported]', {
    x: areaX + 0.4, y: areaY + areaH / 2 - 0.2, w: areaW - 0.8, h: 0.22,
    fontFace: THEME.labelFont, fontSize: 9, bold: true,
    charSpacing: 1.2, color: THEME.PLACEHOLDER_TEXT, margin: 0,
    align: 'center', valign: 'middle',
  });
  slide.addText(richTextRuns(block.label), {
    x: areaX + 0.5, y: areaY + areaH / 2 + 0.12, w: areaW - 1, h: 0.48,
    fontFace: THEME.bodyFont, fontSize: 12,
    color: THEME.BODY_TEXT, margin: 0,
    align: 'center', valign: 'top', wrap: true, fit: 'shrink',
  });
}
