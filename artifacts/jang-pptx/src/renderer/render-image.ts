import PptxGenJS from 'pptxgenjs';
import { THEME } from '../template/theme';
import { addEditorialFooter, addEditorialHeader } from '../template/editorial';
import { planDedicatedImageSlide, type DedicatedImageSlideRenderPlan } from '../layout/plan-image-slide';
import { extractIntrinsicImageSize, fitImageContain, fitImageCover, isUsableImageDataUrl } from './image-sizing';
import type { ImageBlock, ImportedImage } from '../schema/lecture-types';
import { richTextRuns, richTextToPlain } from './rich-text';

export interface ImageRenderResult { rendered: boolean; warnings: string[]; }

/**
 * Renders an image (or its placeholder) into an arbitrary rectangular area.
 * Shared by dedicated and mixed layouts. Imported bytes affect only painting
 * inside this immutable area; they never alter pagination or surrounding text.
 */
export function paintImageIntoArea(
  slide: PptxGenJS.Slide,
  block: ImageBlock,
  importedImages: Record<string, ImportedImage>,
  areaX: number,
  areaY: number,
  areaW: number,
  areaH: number,
): ImageRenderResult {
  const warnings: string[] = [];
  const imported = importedImages[block.slotId];
  let rendered = false;

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
          const dimensions = fitImageCover(areaX, areaY, areaW, areaH);
          slide.addImage({
            data: imported.dataUrl,
            ...dimensions,
            sizing: { type: 'cover', w: dimensions.w, h: dimensions.h },
          });
        } else {
          slide.addImage({ data: imported.dataUrl, ...fitImageContain(areaX, areaY, areaW, areaH, intrinsic.aspect) });
        }
        rendered = true;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        warnings.push(`Image slot "${block.slotId}" failed to embed (${message}) — placeholder shown.`);
      }
    }
  }

  if (!rendered) renderPlaceholder(slide, block, areaX, areaY, areaW, areaH);
  return { rendered, warnings };
}

/** Renders the approved image-evidence design from an immutable physical plan. */
export function renderDedicatedImageSlide(
  pptx: PptxGenJS,
  plan: DedicatedImageSlideRenderPlan,
  importedImages: Record<string, ImportedImage>,
): ImageRenderResult {
  const slide = pptx.addSlide();
  slide.background = { color: THEME.SLIDE_BG };
  addEditorialHeader(slide, 'Image evidence', plan.sectionTitle);

  slide.addShape('roundRect' as PptxGenJS.SHAPE_NAME, {
    ...plan.frameBox,
    rectRadius: 0.06,
    fill: { color: THEME.WHITE },
    line: { color: THEME.DIVIDER_COLOR, width: 0.6 },
  } as never);
  const result = paintImageIntoArea(
    slide,
    plan.block,
    importedImages,
    plan.imageBox.x,
    plan.imageBox.y,
    plan.imageBox.w,
    plan.imageBox.h,
  );

  slide.addText('IMAGE / EDITABLE OBJECT', {
    ...plan.eyebrowBox,
    fontFace: THEME.labelFont,
    fontSize: 8,
    bold: true,
    charSpacing: 1.5,
    color: THEME.MUTED_TEXT,
    margin: 0,
  });
  slide.addText(richTextRuns(plan.block.label), {
    ...plan.labelBox,
    fontFace: THEME.headingFont,
    fontSize: 23,
    bold: true,
    color: THEME.DARK_TEXT,
    margin: 0,
    align: 'left',
    valign: 'top',
    wrap: true,
    fit: 'shrink',
  });
  slide.addShape('line' as PptxGenJS.SHAPE_NAME, {
    ...plan.titleRuleBox,
    line: { color: THEME.DARK_TEXT, width: 1.4 },
  });
  if (plan.descriptionBox) {
    slide.addText(richTextRuns(plan.block.description), {
      ...plan.descriptionBox,
      fontFace: THEME.bodyFont,
      fontSize: 15,
      color: THEME.BODY_TEXT,
      margin: 0,
      align: 'left',
      valign: 'top',
      wrap: true,
      fit: 'shrink',
    });
  }
  slide.addText(plan.block.fit === 'cover' ? 'COVER CROP' : 'CONTAIN / FULL IMAGE', {
    ...plan.fitLabelBox,
    fontFace: THEME.labelFont,
    fontSize: 8,
    bold: true,
    charSpacing: 1.2,
    color: THEME.MUTED_TEXT,
    margin: 0,
  });
  if (plan.sourceBox) {
    slide.addText(`Source: ${plan.block.sourceReference}`, {
      ...plan.sourceBox,
      fontFace: THEME.bodyFont,
      fontSize: THEME.FONT_CAPTION,
      italic: true,
      color: THEME.CAPTION_COLOR,
      margin: 0,
      align: 'left',
      valign: 'top',
      fit: 'shrink',
    });
  }

  addEditorialFooter(slide, plan.sectionTitle);
  return result;
}

/** Backward-compatible wrapper. */
export function renderImageSlide(
  pptx: PptxGenJS,
  block: ImageBlock,
  importedImages: Record<string, ImportedImage>,
  sectionTitle: string,
): ImageRenderResult {
  return renderDedicatedImageSlide(
    pptx,
    planDedicatedImageSlide(block, sectionTitle),
    importedImages,
  );
}

function renderPlaceholder(slide: PptxGenJS.Slide, block: ImageBlock, areaX: number, areaY: number, areaW: number, areaH: number): void {
  slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
    x: areaX, y: areaY, w: areaW, h: areaH,
    fill: { color: THEME.PLACEHOLDER_BG },
    line: { color: THEME.PLACEHOLDER_BORDER, width: 1, dashType: 'dash' },
  });
  slide.addText('[Image not imported]', {
    x: areaX + Math.min(0.4, areaW * 0.1), y: areaY + areaH / 2 - 0.2, w: Math.max(0.2, areaW - Math.min(0.8, areaW * 0.2)), h: 0.22,
    fontFace: THEME.labelFont, fontSize: 9, bold: true,
    charSpacing: 1.2, color: THEME.PLACEHOLDER_TEXT, margin: 0,
    align: 'center', valign: 'middle',
  });
  slide.addText(richTextRuns(block.label), {
    x: areaX + Math.min(0.5, areaW * 0.12), y: areaY + areaH / 2 + 0.12, w: Math.max(0.2, areaW - Math.min(1, areaW * 0.24)), h: 0.48,
    fontFace: THEME.bodyFont, fontSize: 12,
    color: THEME.BODY_TEXT, margin: 0,
    align: 'center', valign: 'top', wrap: true, fit: 'shrink',
  });
}
