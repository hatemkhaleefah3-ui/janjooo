import PptxGenJS from 'pptxgenjs';
import { THEME } from '../template/theme';
import { SECTION_LAYOUT } from '../template/slide-layouts';
import { CONTENT_X } from '../template/geometry';
import { addEditorialFooter, addEditorialHeader, addOrbitArtwork } from '../template/editorial';
import { CONTENT_GAP, measureTextBoxHeight, ruleYAfterTitle } from '../layout/title-spacing';
import type { LectureSection } from '../schema/lecture-types';
import { richTextRuns, richTextToPlain } from './rich-text';

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
  addEditorialHeader(
    slide,
    section.sectionTitle,
    `Section ${String(sectionIndex + 1).padStart(2, '0')}`,
    true,
  );

  slide.addText(String(sectionIndex + 1).padStart(2, '0'), {
    x: 10.05, y: SECTION_LAYOUT.NUMBER_Y, w: 1.45, h: SECTION_LAYOUT.NUMBER_H,
    fontFace: THEME.headingFont, fontSize: 40, bold: true,
    color: THEME.DEEP_GRAY, margin: 0, align: 'right', valign: 'top',
  });

  const titleWidth = 6.4;
  const titleHeight = measureTextBoxHeight(
    section.sectionTitle,
    titleWidth,
    THEME.FONT_SECTION_TITLE_SLIDE,
    SECTION_LAYOUT.TITLE_H,
    2.05,
    0.06,
  );
  const ruleY = ruleYAfterTitle(SECTION_LAYOUT.TITLE_Y, titleHeight);

  slide.addText(section.sectionTitle, {
    x: CONTENT_X, y: SECTION_LAYOUT.TITLE_Y, w: titleWidth, h: titleHeight,
    fontFace: THEME.headingFont, fontSize: THEME.FONT_SECTION_TITLE_SLIDE,
    bold: true, color: THEME.WHITE, margin: 0,
    align: 'left', valign: 'top', wrap: true, fit: 'shrink',
  });
  slide.addShape('line' as PptxGenJS.SHAPE_NAME, {
    x: CONTENT_X, y: ruleY, w: 1.12, h: 0,
    line: { color: THEME.WHITE, width: 2 },
  });

  if (section.sectionDefinition && richTextToPlain(section.sectionDefinition).trim()) {
    const definitionY = ruleY + CONTENT_GAP;
    const definitionHeight = measureTextBoxHeight(
      section.sectionDefinition,
      titleWidth,
      THEME.FONT_CALLOUT_TEXT,
      0.84,
      1.42,
      0.02,
    );
    slide.addText(richTextRuns(section.sectionDefinition), {
      x: CONTENT_X, y: definitionY, w: titleWidth, h: definitionHeight,
      fontFace: THEME.bodyFont, fontSize: THEME.FONT_CALLOUT_TEXT,
      color: THEME.MUTED_ON_DARK, margin: 0,
      align: 'left', valign: 'top', wrap: true, fit: 'shrink',
    });
  }
  addEditorialFooter(slide, section.sectionTitle, true);
}
