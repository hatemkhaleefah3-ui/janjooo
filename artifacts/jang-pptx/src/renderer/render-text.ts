import { THEME } from '../template/theme';
import type { RichText } from '../schema/lecture-types';
import { richTextToPlain } from './rich-text';

/**
 * Estimates the rendered height (in inches) of a block of text.
 * Uses a proportional character-width model for Calibri at 13pt.
 */
export function estimateTextHeight(
  text: RichText,
  widthInches: number,
  fontSizePt: number,
): number {
  // Calibri at 13pt ≈ 8.5 chars/inch.  Scale for other sizes.
  const charsPerInch = 8.5 * (13 / fontSizePt);
  const charsPerLine = Math.max(1, Math.floor(widthInches * charsPerInch));
  const lines = Math.max(1, Math.ceil(richTextToPlain(text).length / charsPerLine));
  // line height in inches = pt / 72 * 1.3 line-spacing
  const lineH = (fontSizePt / 72) * THEME.LINE_SPACING * 1.2;
  return lines * lineH;
}

/** Background color for a callout tone. */
export function calloutBgColor(tone: 'note' | 'warning' | 'info'): string {
  if (tone === 'note') return THEME.CALLOUT_NOTE_BG;
  if (tone === 'warning') return THEME.CALLOUT_WARNING_BG;
  return THEME.CALLOUT_INFO_BG;
}

/** Border / accent color for a callout tone. */
export function calloutBorderColor(tone: 'note' | 'warning' | 'info'): string {
  if (tone === 'note') return THEME.CALLOUT_NOTE_BORDER;
  if (tone === 'warning') return THEME.CALLOUT_WARNING_BORDER;
  return THEME.CALLOUT_INFO_BORDER;
}

/** Label color for a callout tone. */
export function calloutLabelColor(tone: 'note' | 'warning' | 'info'): string {
  if (tone === 'note') return THEME.CALLOUT_NOTE_LABEL;
  if (tone === 'warning') return THEME.CALLOUT_WARNING_LABEL;
  return THEME.CALLOUT_INFO_LABEL;
}

/** Display label string for a callout tone. */
export function calloutLabelText(tone: 'note' | 'warning' | 'info'): string {
  if (tone === 'note') return 'NOTE';
  if (tone === 'warning') return 'WARNING';
  return 'INFO';
}
