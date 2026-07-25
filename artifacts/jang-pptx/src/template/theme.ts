/**
 * Central design tokens for the Jang PPTX engine.
 *
 * The default theme implements the approved premium academic visual system:
 * an editorial black/graphite/paper palette, PowerPoint-safe typography,
 * generous whitespace, restrained rules, and native editable objects.
 */
export const DEFAULT_THEME = {
  SLIDE_WIDTH: 13.33,
  SLIDE_HEIGHT: 7.5,
  MARGIN: 0.68,
  SECTION_HEADER_HEIGHT: 0.18,
  SECTION_HEADER_GAP: 0.36,
  BLOCK_GAP: 0.18,
  TITLE_HEIGHT: 0.62,
  DIVIDER_HEIGHT: 0.012,
  DIVIDER_GAP: 0.18,
  SUBTITLE_HEIGHT: 0.34,
  SUBTITLE_GAP: 0.15,

  // Approved premium academic palette.
  NAVY: '111111',
  NAVY_LIGHT: '2B2B2B',
  GOLD: '777777',
  DARK_TEXT: '111111',
  BODY_TEXT: '1C1C1C',
  MUTED_TEXT: '6A6A6A',
  WHITE: 'FFFFFF',
  SLIDE_BG: 'FAFAF9',
  PAGE_BG: 'F0F0EF',
  DIVIDER_COLOR: 'DEDEDC',
  SECTION_HEADER_BG: 'FAFAF9',
  SECTION_HEADER_TEXT: '111111',
  GRAPHITE: '2B2B2B',
  DEEP_GRAY: '505050',
  MID_GRAY: '777777',
  LIGHT_NEUTRAL: 'DEDEDC',
  MUTED_ON_DARK: 'D7D7D5',
  DARK_RULE: '676767',
  CALLOUT_NOTE_BG: 'FAFAF9',
  CALLOUT_NOTE_BORDER: '111111',
  CALLOUT_NOTE_LABEL: '111111',
  CALLOUT_WARNING_BG: 'F0F0EF',
  CALLOUT_WARNING_BORDER: '505050',
  CALLOUT_WARNING_LABEL: '2B2B2B',
  CALLOUT_INFO_BG: 'FFFFFF',
  CALLOUT_INFO_BORDER: '777777',
  CALLOUT_INFO_LABEL: '505050',
  TABLE_HEADER_BG: '111111',
  TABLE_HEADER_TEXT: 'FAFAF9',
  TABLE_ROW_ODD_BG: 'FFFFFF',
  TABLE_ROW_EVEN_BG: 'F0F0EF',
  TABLE_BORDER: 'DEDEDC',
  DIAGRAM_NODE_BG: 'FFFFFF',
  DIAGRAM_NODE_BORDER: '111111',
  DIAGRAM_NODE_TEXT: '111111',
  DIAGRAM_CONNECTOR: '505050',
  PLACEHOLDER_BG: 'F0F0EF',
  PLACEHOLDER_BORDER: '777777',
  PLACEHOLDER_TEXT: '505050',
  CAPTION_COLOR: '6A6A6A',
  SLIDE_NUMBER_COLOR: '111111',

  bodyFont: 'Aptos',
  headingFont: 'Aptos Display',
  labelFont: 'Aptos',
  accentFont: 'Georgia',
  FONT: 'Aptos',
  FONT_FALLBACK: 'Arial',
  accentColor: '777777',
  highlightColor: 'E6E6E4',
  titleColor: '111111',
  bodyColor: '1C1C1C',
  mutedColor: '6A6A6A',

  FONT_COVER_TITLE: 36,
  FONT_COVER_LABEL: 8,
  FONT_SECTION_TITLE_SLIDE: 34,
  FONT_SLIDE_TITLE: 27,
  FONT_SLIDE_SUBTITLE: 14,
  FONT_SECTION_HEADER: 8,
  FONT_PARAGRAPH: 16,
  FONT_BULLET: 16,
  FONT_NUMBERED: 16,
  FONT_SUBTITLE_BLOCK: 18,
  FONT_TABLE_HEADER: 10,
  FONT_TABLE_BODY: 11,
  FONT_DIAGRAM_NODE: 11,
  FONT_CAPTION: 9,
  FONT_SLIDE_NUMBER: 8,
  FONT_CALLOUT_LABEL: 9,
  FONT_CALLOUT_TEXT: 14,
  FONT_OVERVIEW_INTRO: 15,
  FONT_OVERVIEW_KEYPOINT: 13,
  FONT_OVERVIEW_TOC: 14,
  FONT_MIN: 8,
  FONT_MIN_TABLE: 8,

  H_SUBTITLE_BLOCK: 0.45,
  H_PARAGRAPH_LINE: 0.3,
  H_BULLET_ITEM: 0.34,
  H_NUMBERED_ITEM: 0.34,
  H_CALLOUT_MIN: 0.85,
  H_TABLE_HEADER_ROW: 0.4,
  H_TABLE_BODY_ROW: 0.38,
  H_TABLE_LABEL: 0.34,
  H_DIAGRAM_NODE: 0.58,
  H_DIAGRAM_ROW_GAP: 0.38,
  H_DIAGRAM_LABEL: 0.34,
  H_CAPTION: 0.25,

  DIAGRAM_NODE_WIDTH: 1.9,
  DIAGRAM_NODE_HEIGHT: 0.58,
  DIAGRAM_NODE_H_GAP: 0.38,
  DIAGRAM_ROW_V_GAP: 0.42,
  DIAGRAM_MAX_NODES_PER_ROW: 5,
  TABLE_LARGE_THRESHOLD: 3,
  DIAGRAM_LARGE_THRESHOLD: 4,
  LINE_SPACING: 1.22,
};

export type JangTheme = typeof DEFAULT_THEME;

/**
 * Geometry is fixed because geometry modules precompute slide zones at module
 * load. Per-generation overrides are limited to visual and typographic roles.
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
