import type { RichText } from '../schema/lecture-types';
import { estimateTextHeight } from '../renderer/render-text';

/**
 * Measures a text box from the same wrapping estimator used by content
 * pagination. The lower bound preserves the approved design for short titles;
 * the upper bound keeps very long headings inside their intended composition
 * and lets PowerPoint shrink only after the layout has reserved real space.
 */
export function measureTextBoxHeight(
  text: RichText,
  width: number,
  fontSize: number,
  minimum: number,
  maximum: number,
  padding = 0.04,
): number {
  const measured = estimateTextHeight(text, width, fontSize) + padding;
  return Math.max(minimum, Math.min(maximum, measured));
}

/** Three CSS pixels expressed in PowerPoint inches (96 CSS px per inch). */
export const TITLE_RULE_GAP = 3 / 96;

/** Places the decorative rule exactly 3 px below the measured title. */
export function ruleYAfterTitle(titleY: number, titleHeight: number, gap = TITLE_RULE_GAP): number {
  return titleY + titleHeight + gap;
}
