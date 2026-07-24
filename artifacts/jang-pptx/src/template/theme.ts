/**
 * All design constants for the Jang PPTX Template Engine.
 * No magic numbers elsewhere — every dimension, color, and font size is here.
 */
export const THEME = {
  // ─── Slide dimensions (inches, LAYOUT_WIDE = 16:9) ───────────────────────
  SLIDE_WIDTH: 13.33,
  SLIDE_HEIGHT: 7.5,

  // ─── Safe-area margins (inches) ──────────────────────────────────────────
  MARGIN: 0.4,

  // ─── Section header band (top strip on content + section title slides) ───
  SECTION_HEADER_HEIGHT: 0.22,
  SECTION_HEADER_GAP: 0.08, // gap below band before content

  // ─── Block gap (space after each rendered block) ─────────────────────────
  BLOCK_GAP: 0.1,

  // ─── Slide title zone ────────────────────────────────────────────────────
  TITLE_HEIGHT: 0.5,
  DIVIDER_HEIGHT: 0.03,
  DIVIDER_GAP: 0.08,  // gap below divider before content
  SUBTITLE_HEIGHT: 0.35,
  SUBTITLE_GAP: 0.06,

  // ─── Colors (6-digit hex, no leading #) ──────────────────────────────────
  NAVY: '1E3A5F',
  NAVY_LIGHT: '2E5B8E',
  GOLD: 'C9922A',
  DARK_TEXT: '1A202C',
  BODY_TEXT: '2D3748',
  MUTED_TEXT: '718096',
  WHITE: 'FFFFFF',
  SLIDE_BG: 'FFFFFF',
  PAGE_BG: 'F7F9FC',
  DIVIDER_COLOR: 'CBD5E0',

  // Section header
  SECTION_HEADER_BG: '1E3A5F',
  SECTION_HEADER_TEXT: 'FFFFFF',

  // Callout tones
  CALLOUT_NOTE_BG: 'EFF6FF',
  CALLOUT_NOTE_BORDER: '93C5FD',
  CALLOUT_NOTE_LABEL: '1D4ED8',
  CALLOUT_WARNING_BG: 'FFFBEB',
  CALLOUT_WARNING_BORDER: 'FCD34D',
  CALLOUT_WARNING_LABEL: 'B45309',
  CALLOUT_INFO_BG: 'F0FDF4',
  CALLOUT_INFO_BORDER: '86EFAC',
  CALLOUT_INFO_LABEL: '15803D',

  // Table
  TABLE_HEADER_BG: '1E3A5F',
  TABLE_HEADER_TEXT: 'FFFFFF',
  TABLE_ROW_ODD_BG: 'F7F9FC',
  TABLE_ROW_EVEN_BG: 'FFFFFF',
  TABLE_BORDER: 'CBD5E0',

  // Diagram
  DIAGRAM_NODE_BG: 'EFF6FF',
  DIAGRAM_NODE_BORDER: '3B82F6',
  DIAGRAM_NODE_TEXT: '1E3A5F',
  DIAGRAM_CONNECTOR: '64748B',

  // Image placeholder
  PLACEHOLDER_BG: 'F1F5F9',
  PLACEHOLDER_BORDER: 'CBD5E0',
  PLACEHOLDER_TEXT: '64748B',

  // Caption
  CAPTION_COLOR: '64748B',
  SLIDE_NUMBER_COLOR: '94A3B8',

  // ─── Font ────────────────────────────────────────────────────────────────
  FONT: 'Calibri',

  // Font sizes (points)
  FONT_COVER_TITLE: 36,
  FONT_COVER_LABEL: 13,
  FONT_SECTION_TITLE_SLIDE: 32,
  FONT_SLIDE_TITLE: 22,
  FONT_SLIDE_SUBTITLE: 16,
  FONT_SECTION_HEADER: 9,
  FONT_PARAGRAPH: 13,
  FONT_BULLET: 13,
  FONT_NUMBERED: 13,
  FONT_SUBTITLE_BLOCK: 15,
  FONT_TABLE_HEADER: 11,
  FONT_TABLE_BODY: 10,
  FONT_DIAGRAM_NODE: 9,
  FONT_CAPTION: 10,
  FONT_SLIDE_NUMBER: 10,
  FONT_CALLOUT_LABEL: 10,
  FONT_CALLOUT_TEXT: 12,
  FONT_OVERVIEW_INTRO: 13,
  FONT_OVERVIEW_KEYPOINT: 12,
  FONT_OVERVIEW_TOC: 12,
  FONT_MIN: 8,

  // ─── Estimated content heights (inches, for pagination) ──────────────────
  H_SUBTITLE_BLOCK: 0.38,
  H_PARAGRAPH_LINE: 0.22,
  H_BULLET_ITEM: 0.25,
  H_NUMBERED_ITEM: 0.25,
  H_CALLOUT_MIN: 0.65,
  H_TABLE_HEADER_ROW: 0.32,
  H_TABLE_BODY_ROW: 0.27,
  H_TABLE_LABEL: 0.28,
  H_DIAGRAM_NODE: 0.45,
  H_DIAGRAM_ROW_GAP: 0.32,
  H_DIAGRAM_LABEL: 0.28,
  H_CAPTION: 0.25,

  // ─── Diagram geometry ────────────────────────────────────────────────────
  DIAGRAM_NODE_WIDTH: 1.9,
  DIAGRAM_NODE_HEIGHT: 0.45,
  DIAGRAM_NODE_H_GAP: 0.25,
  DIAGRAM_ROW_V_GAP: 0.35,

  // ─── Layout thresholds ───────────────────────────────────────────────────
  TABLE_LARGE_THRESHOLD: 3,   // > N columns → dedicated slide
  DIAGRAM_LARGE_THRESHOLD: 4, // > N total nodes → dedicated slide

  // ─── Line spacing factor ─────────────────────────────────────────────────
  LINE_SPACING: 1.3,
} as const;
