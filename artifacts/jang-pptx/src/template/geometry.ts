import { THEME } from './theme';

/** Width of the content area (slide width minus both horizontal margins). */
export const CONTENT_WIDTH = THEME.SLIDE_WIDTH - 2 * THEME.MARGIN;

/** X position where content starts. */
export const CONTENT_X = THEME.MARGIN;

/** Y of the section header band. */
export const SECTION_HEADER_Y = THEME.MARGIN;

/** Y where content begins after the section header band. */
export const CONTENT_Y_AFTER_HEADER =
  THEME.MARGIN + THEME.SECTION_HEADER_HEIGHT + THEME.SECTION_HEADER_GAP;

/** Available height from below the section header to above the bottom margin. */
export const CONTENT_H_BASE =
  THEME.SLIDE_HEIGHT - CONTENT_Y_AFTER_HEADER - THEME.MARGIN;

/** Height consumed by a slide title + divider + gap (the title block). */
export const TITLE_BLOCK_H =
  THEME.TITLE_HEIGHT + THEME.DIVIDER_HEIGHT + THEME.DIVIDER_GAP;

/** Height consumed by a slide subtitle + gap. */
export const SUBTITLE_BLOCK_H = THEME.SUBTITLE_HEIGHT + THEME.SUBTITLE_GAP;

/** Bottom of slide safe area (below this = outside safe zone). */
export const SAFE_BOTTOM = THEME.SLIDE_HEIGHT - THEME.MARGIN;

/** Slide center X. */
export const SLIDE_CENTER_X = THEME.SLIDE_WIDTH / 2;

/** Slide center Y. */
export const SLIDE_CENTER_Y = THEME.SLIDE_HEIGHT / 2;

/** Slide number X position (lower-right). */
export const SLIDE_NUMBER_X = THEME.SLIDE_WIDTH - THEME.MARGIN - 0.6;

/** Slide number Y position (lower-right). */
export const SLIDE_NUMBER_Y = THEME.SLIDE_HEIGHT - THEME.MARGIN - 0.22;

/**
 * Returns the Y position where block content begins on a content slide,
 * accounting for section header, optional title, and optional subtitle.
 */
export function getContentYStart(hasTitle: boolean, hasSubtitle: boolean): number {
  let y = CONTENT_Y_AFTER_HEADER;
  if (hasTitle) y += TITLE_BLOCK_H;
  if (hasSubtitle) y += SUBTITLE_BLOCK_H;
  return y;
}

/**
 * Returns the available height for block content on a content slide,
 * accounting for optional title and subtitle.
 */
export function getAvailableHeight(hasTitle: boolean, hasSubtitle: boolean): number {
  let h = CONTENT_H_BASE;
  if (hasTitle) h -= TITLE_BLOCK_H;
  if (hasSubtitle) h -= SUBTITLE_BLOCK_H;
  return h;
}

/** Clamps a value to a [min, max] range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
