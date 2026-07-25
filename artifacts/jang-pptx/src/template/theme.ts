/**
 * Central design tokens for the Jang PPTX engine.
 *
 * The defaults intentionally preserve the visual system created in the
 * original Replit prototype. Consumers may override visual roles per
 * generation without changing the slide structure or geometry.
 */
export const DEFAULT_THEME = {
  SLIDE_WIDTH: 13.33,
  SLIDE_HEIGHT: 7.5,
  MARGIN: 0.4,
  SECTION_HEADER_HEIGHT: 0.22,
  SECTION_HEADER_GAP: 0.08,
  BLOCK_GAP: 0.1,
  TITLE_HEIGHT: 0.5,
  DIVIDER_HEIGHT: 0.03,
  DIVIDER_GAP: 0.08,
  SUBTITLE_HEIGHT: 0.35,
  SUBTITLE_GAP: 0.06,

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
  SECTION_HEADER_BG: '1E3A5F',
  SECTION_HEADER_TEXT: 'FFFFFF',
  CALLOUT_NOTE_BG: 'EFF6FF',
  CALLOUT_NOTE_BORDER: '93C5FD',
  CALLOUT_NOTE_LABEL: '1D4ED8',
  CALLOUT_WARNING_BG: 'FFFBEB',
  CALLOUT_WARNING_BORDER: 'FCD34D',
  CALLOUT_WARNING_LABEL: 'B45309',
  CALLOUT_INFO_BG: 'F0FDF4',
  CALLOUT_INFO_BORDER: '86EFAC',
  CALLOUT_INFO_LABEL: '15803D',
  TABLE_HEADER_BG: '1E3A5F',
  TABLE_HEADER_TEXT: 'FFFFFF',
  TABLE_ROW_ODD_BG: 'F7F9FC',
  TABLE_ROW_EVEN_BG: 'FFFFFF',
  TABLE_BORDER: 'CBD5E0',
  DIAGRAM_NODE_BG: 'EFF6FF',
  DIAGRAM_NODE_BORDER: '3B82F6',
  DIAGRAM_NODE_TEXT: '1E3A5F',
  DIAGRAM_CONNECTOR: '64748B',
  PLACEHOLDER_BG: 'F1F5F9',
  PLACEHOLDER_BORDER: 'CBD5E0',
  PLACEHOLDER_TEXT: '64748B',
  CAPTION_COLOR: '64748B',
  SLIDE_NUMBER_COLOR: '94A3B8',

  bodyFont: 'Aptos',
  headingFont: 'Aptos Display',
  labelFont: 'Aptos',
  accentFont: 'Aptos Display',
  FONT: 'Aptos',
  FONT_FALLBACK: 'Arial',
  accentColor: 'C9922A',
  highlightColor: 'FFF2A8',
  titleColor: '1E3A5F',
  bodyColor: '2D3748',
  mutedColor: '718096',

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
  FONT_MIN_TABLE: 8,

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

  DIAGRAM_NODE_WIDTH: 1.9,
  DIAGRAM_NODE_HEIGHT: 0.45,
  DIAGRAM_NODE_H_GAP: 0.25,
  DIAGRAM_ROW_V_GAP: 0.35,
  DIAGRAM_MAX_NODES_PER_ROW: 5,
  TABLE_LARGE_THRESHOLD: 3,
  DIAGRAM_LARGE_THRESHOLD: 4,
  LINE_SPACING: 1.3,
};

export type JangTheme = typeof DEFAULT_THEME;

/**
 * Geometry is deliberately fixed because geometry modules precompute the
 * preserved Jang slide zones at module load. Per-generation overrides are
 * limited to visual and typographic roles so a theme cannot silently change
 * the slide structure.
 */
type FixedGeometryKey =
  | 'SLIDE_WIDTH' | 'SLIDE_HEIGHT' | 'MARGIN'
  | 'SECTION_HEADER_HEIGHT' | 'SECTION_HEADER_GAP' | 'BLOCK_GAP'
  | 'TITLE_HEIGHT' | 'DIVIDER_HEIGHT' | 'DIVIDER_GAP'
  | 'SUBTITLE_HEIGHT' | 'SUBTITLE_GAP'
  | 'H_SUBTITLE_BLOCK' | 'H_PARAGRAPH_LINE' | 'H_BULLET_ITEM'
  | 'H_NUMBERED_ITEM' | 'H_CALLOUT_MIN' | 'H_TABLE_HEADER_ROW'
  | 'H_TABLE_BODY_ROW' | 'H_TABLE_LABEL' | 'H_DIAGRAM_NODE'
  | 'H_DIAGRAM_ROW_GAP' | 'H_DIAGRAM_LABEL' | 'H_CAPTION'
  | 'DIAGRAM_NODE_WIDTH' | 'DIAGRAM_NODE_HEIGHT'
  | 'DIAGRAM_NODE_H_GAP' | 'DIAGRAM_ROW_V_GAP'
  | 'DIAGRAM_MAX_NODES_PER_ROW' | 'TABLE_LARGE_THRESHOLD'
  | 'DIAGRAM_LARGE_THRESHOLD' | 'LINE_SPACING';

export type ThemeOverrides = Partial<Omit<JangTheme, FixedGeometryKey>>;

/** Mutable current theme; renderers read it when each shape is created. */
export const THEME: JangTheme = { ...DEFAULT_THEME };

export function configureTheme(overrides: ThemeOverrides = {}): JangTheme {
  const normalized: ThemeOverrides = { ...overrides };

  // Keep the original single-font and single-colour aliases aligned with the
  // newer semantic roles. Explicit values always win when both are provided.
  if (overrides.bodyFont !== undefined && overrides.FONT === undefined) normalized.FONT = overrides.bodyFont;
  if (overrides.FONT !== undefined && overrides.bodyFont === undefined) normalized.bodyFont = overrides.FONT;
  if (overrides.bodyFont !== undefined && overrides.labelFont === undefined) normalized.labelFont = overrides.bodyFont;
  if (overrides.headingFont !== undefined && overrides.accentFont === undefined) normalized.accentFont = overrides.headingFont;

  if (overrides.NAVY !== undefined && overrides.titleColor === undefined) normalized.titleColor = overrides.NAVY;
  if (overrides.titleColor !== undefined && overrides.NAVY === undefined) normalized.NAVY = overrides.titleColor;
  if (overrides.GOLD !== undefined && overrides.accentColor === undefined) normalized.accentColor = overrides.GOLD;
  if (overrides.accentColor !== undefined && overrides.GOLD === undefined) normalized.GOLD = overrides.accentColor;
  if (overrides.BODY_TEXT !== undefined && overrides.bodyColor === undefined) normalized.bodyColor = overrides.BODY_TEXT;
  if (overrides.bodyColor !== undefined && overrides.BODY_TEXT === undefined) normalized.BODY_TEXT = overrides.bodyColor;
  if (overrides.MUTED_TEXT !== undefined && overrides.mutedColor === undefined) normalized.mutedColor = overrides.MUTED_TEXT;
  if (overrides.mutedColor !== undefined && overrides.MUTED_TEXT === undefined) normalized.MUTED_TEXT = overrides.mutedColor;

  Object.assign(THEME, normalized);
  return { ...THEME };
}

export function resetTheme(): JangTheme {
  Object.assign(THEME, DEFAULT_THEME);
  return { ...THEME };
}
