import PptxGenJS from 'pptxgenjs';
import { THEME } from '../template/theme';
import { SECTION_LAYOUT } from '../template/slide-layouts';
import { CONTENT_X } from '../template/geometry';
import { addEditorialFooter, addEditorialHeader, addOrbitArtwork } from '../template/editorial';
import type { LectureSection } from '../schema/lecture-types';

export function renderSection(
  pptx: PptxGenJS,
  section: LectureSection,
  sectionIndex: number,
): void {
  const slide = pptx.addSlide();
  slide.background = { color: THEME.NAVY };

  slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
    x: SECTION_LAYOUT.BAND_X, y: SECTION_LAYOUT.BAND_Y,
    w: SECTION_LAYOUT.BAND_W, h: SECTION_LAYOUT.BAND_H,
    fill: { color: THEME.GRAPHITE }, line: { color: THEME.GRAPHITE, width: 0 },
  });
  slide.addShape('line' as PptxGenJS.SHAPE_NAME, {
    x: SECTION_LAYOUT.BAND_X, y: 0, w: 0, h: THEME.SLIDE_HEIGHT,
    line: { color: THEME.DARK_RULE, width: 1 },
  });
  addOrbitArtwork(slide, 9.15, 2.2, 3.4, 3.4);
  addEditorialHeader(slide, `Section ${String(sectionIndex + 1).padStart(2, '0')}`, section.sectionTitle, true);

  slide.addText(String(sectionIndex + 1).padStart(2, '0'), {
    x: 10.05, y: SECTION_LAYOUT.NUMBER_Y, w: 1.45, h: SECTION_LAYOUT.NUMBER_H,
    fontFace: THEME.headingFont, fontSize: 40, bold: true,
    color: THEME.DEEP_GRAY, margin: 0, align: 'right', valign: 'top',
  });
  slide.addText(section.sectionTitle, {
    x: CONTENT_X, y: SECTION_LAYOUT.TITLE_Y, w: 6.4, h: SECTION_LAYOUT.TITLE_H,
    fontFace: THEME.headingFont, fontSize: THEME.FONT_SECTION_TITLE_SLIDE,
    bold: true, color: THEME.WHITE, margin: 0,
    align: 'left', valign: 'top', wrap: true, fit: 'shrink',
  });
  slide.addShape('line' as PptxGenJS.SHAPE_NAME, {
    x: CONTENT_X, y: 3.22, w: 1.12, h: 0,
    line: { color: THEME.WHITE, width: 2 },
  });
  addEditorialFooter(slide, section.sectionTitle, true);
}
