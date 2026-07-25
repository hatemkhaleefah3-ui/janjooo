import { THEME } from './theme';

export const CONTENT_WIDTH = THEME.SLIDE_WIDTH - 2 * THEME.MARGIN;
export const CONTENT_X = THEME.MARGIN;
export const SECTION_HEADER_Y = 0.48;
export const CONTENT_Y_AFTER_HEADER =
  THEME.MARGIN + THEME.SECTION_HEADER_HEIGHT + THEME.SECTION_HEADER_GAP;
export const SAFE_BOTTOM = 6.62;
export const CONTENT_H_BASE = SAFE_BOTTOM - CONTENT_Y_AFTER_HEADER;
export const TITLE_BLOCK_H =
  THEME.TITLE_HEIGHT + THEME.DIVIDER_HEIGHT + THEME.DIVIDER_GAP;
export const SUBTITLE_BLOCK_H = THEME.SUBTITLE_HEIGHT + THEME.SUBTITLE_GAP;
export const SLIDE_CENTER_X = THEME.SLIDE_WIDTH / 2;
export const SLIDE_CENTER_Y = THEME.SLIDE_HEIGHT / 2;
export const SLIDE_NUMBER_X = THEME.SLIDE_WIDTH - THEME.MARGIN - 0.55;
export const SLIDE_NUMBER_Y = THEME.SLIDE_HEIGHT - 0.48;

export function getContentYStart(hasTitle: boolean, hasSubtitle: boolean): number {
  let y = CONTENT_Y_AFTER_HEADER;
  if (hasTitle) y += TITLE_BLOCK_H;
  if (hasSubtitle) y += SUBTITLE_BLOCK_H;
  return y;
}

export function getAvailableHeight(hasTitle: boolean, hasSubtitle: boolean): number {
  let h = CONTENT_H_BASE;
  if (hasTitle) h -= TITLE_BLOCK_H;
  if (hasSubtitle) h -= SUBTITLE_BLOCK_H;
  return h;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
