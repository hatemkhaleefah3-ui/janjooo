import PptxGenJS from 'pptxgenjs';
import { THEME } from '../template/theme';
import { OVERVIEW_LAYOUT } from '../template/slide-layouts';
import { CONTENT_X } from '../template/geometry';
import { addEditorialFooter, addEditorialHeader } from '../template/editorial';
import { measureTextBoxHeight } from '../layout/title-spacing';
import type { LectureDocument } from '../schema/lecture-types';
import { listTextRuns, richTextRuns, richTextToPlain } from './rich-text';

export function renderOverview(pptx: PptxGenJS, lecture: LectureDocument): void {
  const slide = pptx.addSlide();
  slide.background = { color: THEME.SLIDE_BG };
  addEditorialHeader(slide, 'Lecture overview', 'Reading sequence');

  const overviewTitle = lecture.overview.title || 'A sequence for learning';
  const titleHeight = measureTextBoxHeight(
    overviewTitle,
    OVERVIEW_LAYOUT.TITLE_W,
    THEME.FONT_SLIDE_TITLE,
    OVERVIEW_LAYOUT.TITLE_H,
    1.02,
    0.04,
  );
  const introY = OVERVIEW_LAYOUT.TITLE_Y + titleHeight + 0.18;
  const introduction = lecture.overview.introduction;
  const hasIntroduction = Boolean(richTextToPlain(introduction).trim());
  const introHeight = hasIntroduction
    ? measureTextBoxHeight(
      introduction,
      OVERVIEW_LAYOUT.LEFT_COL_W,
      THEME.FONT_OVERVIEW_INTRO,
      OVERVIEW_LAYOUT.INTRO_H,
      0.92,
      0.03,
    )
    : 0;

  slide.addText(overviewTitle, {
    x: OVERVIEW_LAYOUT.TITLE_X, y: OVERVIEW_LAYOUT.TITLE_Y,
    w: OVERVIEW_LAYOUT.TITLE_W, h: titleHeight,
    fontFace: THEME.headingFont, fontSize: THEME.FONT_SLIDE_TITLE,
    bold: true, color: THEME.DARK_TEXT, margin: 0,
    align: 'left', valign: 'top', wrap: true, fit: 'shrink',
  });

  if (hasIntroduction) {
    slide.addText(richTextRuns(introduction), {
      x: OVERVIEW_LAYOUT.LEFT_COL_X, y: introY,
      w: OVERVIEW_LAYOUT.LEFT_COL_W, h: introHeight,
      fontFace: THEME.bodyFont, fontSize: THEME.FONT_OVERVIEW_INTRO,
      color: THEME.MUTED_TEXT, margin: 0,
      align: 'left', valign: 'top', wrap: true, fit: 'shrink',
    });
  }

  const sectionCount = Math.max(1, lecture.sections.length);
  const sectionListY = Math.max(2.82, introY + introHeight + 0.18);
  const availableSectionHeight = Math.max(0.9, 6.18 - sectionListY);
  const rowH = Math.min(0.68, Math.max(0.34, availableSectionHeight / sectionCount));
  lecture.sections.forEach((section, index) => {
    const y = sectionListY + index * rowH;
    slide.addText(String(index + 1).padStart(2, '0'), {
      x: CONTENT_X, y, w: 0.42, h: 0.18,
      fontFace: THEME.labelFont, fontSize: 9, bold: true,
      color: index === 0 ? THEME.DARK_TEXT : THEME.MUTED_TEXT, margin: 0,
    });
    slide.addShape('line' as PptxGenJS.SHAPE_NAME, {
      x: 1.18, y: y + 0.09, w: 0.48, h: 0,
      line: { color: THEME.DIVIDER_COLOR, width: 0.7 },
    });
    slide.addText(section.sectionTitle, {
      x: 1.82, y: y - 0.05, w: 5.95, h: Math.max(0.28, rowH - 0.05),
      fontFace: THEME.headingFont, fontSize: THEME.FONT_OVERVIEW_TOC,
      bold: true, color: THEME.DARK_TEXT, margin: 0,
      align: 'left', valign: 'top', wrap: true, fit: 'shrink',
    });
  });

  slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
    x: OVERVIEW_LAYOUT.RIGHT_COL_X, y: OVERVIEW_LAYOUT.TOC_CARD_Y,
    w: OVERVIEW_LAYOUT.RIGHT_COL_W, h: OVERVIEW_LAYOUT.TOC_CARD_H,
    fill: { color: THEME.PAGE_BG }, line: { color: THEME.PAGE_BG, width: 0 },
  });
  slide.addText('KEY TERMS', {
    x: OVERVIEW_LAYOUT.RIGHT_COL_X + 0.36, y: OVERVIEW_LAYOUT.TOC_LABEL_Y,
    w: OVERVIEW_LAYOUT.RIGHT_COL_W - 0.72, h: 0.18,
    fontFace: THEME.labelFont, fontSize: 8, bold: true,
    charSpacing: 1.5, color: THEME.MUTED_TEXT, margin: 0,
  });
  const keyTerms = lecture.sections.map((section) => section.sectionTitle);
  if (keyTerms.length > 0) {
    slide.addText(listTextRuns(keyTerms.map((text) => ({ text })), 'bullet'), {
      x: OVERVIEW_LAYOUT.RIGHT_COL_X + 0.34, y: OVERVIEW_LAYOUT.TOC_Y,
      w: OVERVIEW_LAYOUT.RIGHT_COL_W - 0.68, h: OVERVIEW_LAYOUT.TOC_H,
      fontFace: THEME.bodyFont, fontSize: THEME.FONT_OVERVIEW_KEYPOINT,
      color: THEME.BODY_TEXT, margin: 0.02,
      align: 'left', valign: 'top', wrap: true, paraSpaceAfter: 9, fit: 'shrink',
    } as PptxGenJS.TextPropsOptions);
  }

  addEditorialFooter(slide, lecture.documentTitle);
}
