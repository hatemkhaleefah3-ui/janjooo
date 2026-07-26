import type { ImageBlock } from '../schema/lecture-types';
import type { LayoutBox } from './slide-render-plan';
import { richTextToPlain } from '../renderer/rich-text';

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
    labelBox: { x: copy.x, y: copy.y + 0.45, w: copy.w, h: 0.82 },
    titleRuleBox: { x: copy.x, y: copy.y + 1.5, w: 1.05, h: 0 },
    descriptionBox: richTextToPlain(block.description).trim()
      ? { x: copy.x, y: copy.y + 1.82, w: copy.w, h: 1.55 }
      : undefined,
    fitLabelBox: { x: copy.x, y: copy.y + 3.72, w: copy.w, h: 0.18 },
    sourceBox: block.sourceReference
      ? { x: copy.x, y: copy.y + 4.06, w: copy.w, h: 0.22 }
      : undefined,
  };
}
