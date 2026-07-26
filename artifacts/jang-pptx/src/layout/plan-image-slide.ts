import { THEME } from '../template/theme';
import type { ImageBlock } from '../schema/lecture-types';
import type { LayoutBox } from './slide-render-plan';
import { richTextToPlain } from '../renderer/rich-text';
import { measureTextBoxHeight, ruleYAfterTitle } from './title-spacing';

export interface DedicatedImageSlideRenderPlan {
  kind: 'dedicated-image';
  sectionTitle: string;
  block: ImageBlock;
  frameBox: LayoutBox;
  imageBox: LayoutBox;
  eyebrowBox: LayoutBox;
  labelBox: LayoutBox;
  titleRuleBox: LayoutBox;
  descriptionBox?: LayoutBox;
  fitLabelBox: LayoutBox;
  sourceBox?: LayoutBox;
}

/** Preserves the approved image-evidence composition as an immutable box plan. */
export function planDedicatedImageSlide(
  block: ImageBlock,
  sectionTitle: string,
): DedicatedImageSlideRenderPlan {
  const frameBox = { x: 0.68, y: 1.55, w: 6.15, h: 4.72 };
  const copy = { x: 7.32, y: 1.62, w: 4.7, h: 4.65 };
  const labelY = copy.y + 0.45;
  const labelHeight = measureTextBoxHeight(block.label, copy.w, 23, 0.72, 1.42, 0.04);
  const titleRuleY = ruleYAfterTitle(labelY, labelHeight);
  const descriptionY = titleRuleY + 0.14;
  const hasDescription = Boolean(richTextToPlain(block.description).trim());
  const descriptionHeight = hasDescription
    ? measureTextBoxHeight(block.description, copy.w, 15, 0.5, 1.42, 0.03)
    : 0;
  const fitLabelY = Math.max(copy.y + 3.72, descriptionY + descriptionHeight + 0.22);
  const sourceY = Math.min(copy.y + 4.25, fitLabelY + 0.34);

  return {
    kind: 'dedicated-image',
    sectionTitle,
    block,
    frameBox,
    imageBox: {
      x: frameBox.x + 0.22,
      y: frameBox.y + 0.22,
      w: frameBox.w - 0.44,
      h: frameBox.h - 0.44,
    },
    eyebrowBox: { x: copy.x, y: copy.y, w: copy.w, h: 0.18 },
    labelBox: { x: copy.x, y: labelY, w: copy.w, h: labelHeight },
    titleRuleBox: { x: copy.x, y: titleRuleY, w: 1.05, h: 0 },
    descriptionBox: hasDescription
      ? { x: copy.x, y: descriptionY, w: copy.w, h: descriptionHeight }
      : undefined,
    fitLabelBox: { x: copy.x, y: fitLabelY, w: copy.w, h: 0.18 },
    sourceBox: block.sourceReference
      ? { x: copy.x, y: sourceY, w: copy.w, h: 0.22 }
      : undefined,
  };
}
