import PptxGenJS from 'pptxgenjs';
import { THEME } from '../template/theme';
import { SECTION_LAYOUT } from '../template/slide-layouts';
import { CONTENT_X, CONTENT_WIDTH, SLIDE_NUMBER_X, SLIDE_NUMBER_Y } from '../template/geometry';
import type { LectureSection } from '../schema/lecture-types';

export function renderSection(
  pptx: PptxGenJS,
  section: LectureSection,
  sectionIndex: number,
): void {
  const slide = pptx.addSlide();
  slide.background = { color: THEME.SLIDE_BG };

  // Navy background band (top ~65% of slide)
  slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
    x: SECTION_LAYOUT.BAND_X,
    y: SECTION_LAYOUT.BAND_Y,
    w: SECTION_LAYOUT.BAND_W,
    h: SECTION_LAYOUT.BAND_H,
    fill: { color: THEME.NAVY },
    line: { color: THEME.NAVY, width: 0 },
  });

  // Gold stripe at the bottom of the band
  slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
    x: 0,
    y: SECTION_LAYOUT.GOLD_STRIPE_Y,
    w: THEME.SLIDE_WIDTH,
    h: SECTION_LAYOUT.GOLD_STRIPE_H,
    fill: { color: THEME.GOLD },
    line: { color: THEME.GOLD, width: 0 },
  });

  // Section number label
  slide.addText(`Section ${sectionIndex + 1}`, {
    x: CONTENT_X,
    y: SECTION_LAYOUT.NUMBER_Y,
    w: CONTENT_WIDTH,
    h: SECTION_LAYOUT.NUMBER_H,
    fontFace: THEME.FONT,
    fontSize: 13,
    color: THEME.GOLD,
    align: 'left',
    valign: 'bottom',
    charSpacing: 2,
  });

  // Section title
  slide.addText(section.sectionTitle, {
    x: CONTENT_X,
    y: SECTION_LAYOUT.TITLE_Y,
    w: CONTENT_WIDTH,
    h: SECTION_LAYOUT.TITLE_H,
    fontFace: THEME.FONT,
    fontSize: THEME.FONT_SECTION_TITLE_SLIDE,
    bold: true,
    color: THEME.WHITE,
    align: 'left',
    valign: 'top',
    wrap: true,
  });

  slide.slideNumber = {
    x: SLIDE_NUMBER_X, y: SLIDE_NUMBER_Y,
    fontFace: THEME.FONT,
    fontSize: THEME.FONT_SLIDE_NUMBER,
    color: THEME.MUTED_TEXT,
  };
}
