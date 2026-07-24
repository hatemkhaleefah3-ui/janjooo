import PptxGenJS from 'pptxgenjs';
import { THEME } from '../template/theme';
import { OVERVIEW_LAYOUT } from '../template/slide-layouts';
import {
  CONTENT_X, CONTENT_WIDTH, SECTION_HEADER_Y,
  SLIDE_NUMBER_X, SLIDE_NUMBER_Y,
} from '../template/geometry';
import type { LectureDocument } from '../schema/lecture-types';
import { listTextRuns, richTextRuns, richTextToPlain } from './rich-text';

function addSectionHeader(slide: PptxGenJS.Slide, label: string): void {
  slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
    x: 0, y: SECTION_HEADER_Y,
    w: THEME.SLIDE_WIDTH, h: THEME.SECTION_HEADER_HEIGHT,
    fill: { color: THEME.SECTION_HEADER_BG },
    line: { color: THEME.SECTION_HEADER_BG, width: 0 },
  });
  slide.addText(label, {
    x: CONTENT_X, y: SECTION_HEADER_Y,
    w: CONTENT_WIDTH, h: THEME.SECTION_HEADER_HEIGHT,
    fontFace: THEME.FONT,
    fontSize: THEME.FONT_SECTION_HEADER,
    color: THEME.SECTION_HEADER_TEXT,
    align: 'left',
    valign: 'middle',
  });
}

export function renderOverview(pptx: PptxGenJS, lecture: LectureDocument): void {
  const slide = pptx.addSlide();
  slide.background = { color: THEME.SLIDE_BG };
  addSectionHeader(slide, 'Overview');

  // ─── Title ────────────────────────────────────────────────────────────────
  slide.addText(lecture.overview.title || 'Overview', {
    x: OVERVIEW_LAYOUT.TITLE_X,
    y: OVERVIEW_LAYOUT.TITLE_Y,
    w: OVERVIEW_LAYOUT.TITLE_W,
    h: OVERVIEW_LAYOUT.TITLE_H,
    fontFace: THEME.FONT,
    fontSize: THEME.FONT_SLIDE_TITLE,
    bold: true,
    color: THEME.NAVY,
    align: 'left',
    valign: 'middle',
  });

  // Divider
  slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
    x: CONTENT_X, y: OVERVIEW_LAYOUT.DIVIDER_Y,
    w: CONTENT_WIDTH, h: THEME.DIVIDER_HEIGHT,
    fill: { color: THEME.DIVIDER_COLOR },
    line: { color: THEME.DIVIDER_COLOR, width: 0 },
  });

  // ─── Left column: Introduction + Key Points ───────────────────────────────
  if (richTextToPlain(lecture.overview.introduction)) {
    slide.addText(richTextRuns(lecture.overview.introduction), {
      x: OVERVIEW_LAYOUT.LEFT_COL_X,
      y: OVERVIEW_LAYOUT.INTRO_Y,
      w: OVERVIEW_LAYOUT.LEFT_COL_W,
      h: OVERVIEW_LAYOUT.INTRO_H,
      fontFace: THEME.FONT,
      fontSize: THEME.FONT_OVERVIEW_INTRO,
      color: THEME.BODY_TEXT,
      align: 'left',
      valign: 'top',
      wrap: true,
    });
  }

  // Key Points label
  slide.addText('Key Points', {
    x: OVERVIEW_LAYOUT.LEFT_COL_X,
    y: OVERVIEW_LAYOUT.KEYPOINTS_LABEL_Y,
    w: OVERVIEW_LAYOUT.LEFT_COL_W,
    h: 0.28,
    fontFace: THEME.FONT,
    fontSize: 11,
    bold: true,
    color: THEME.NAVY,
    align: 'left',
    valign: 'top',
  });

  if (lecture.overview.keyPoints.length > 0) {
    const kpText = listTextRuns(lecture.overview.keyPoints.map((text) => ({ text })), 'bullet');
    slide.addText(kpText, {
      x: OVERVIEW_LAYOUT.LEFT_COL_X,
      y: OVERVIEW_LAYOUT.KEYPOINTS_Y,
      w: OVERVIEW_LAYOUT.LEFT_COL_W,
      h: OVERVIEW_LAYOUT.KEYPOINTS_H,
      fontFace: THEME.FONT,
      fontSize: THEME.FONT_OVERVIEW_KEYPOINT,
      color: THEME.BODY_TEXT,
      align: 'left',
      valign: 'top',
      wrap: true,
      paraSpaceAfter: 4,
    });
  }

  // ─── Right column: Table of Contents card ────────────────────────────────
  slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
    x: OVERVIEW_LAYOUT.RIGHT_COL_X - 0.1,
    y: OVERVIEW_LAYOUT.TOC_CARD_Y,
    w: OVERVIEW_LAYOUT.RIGHT_COL_W + 0.12,
    h: OVERVIEW_LAYOUT.TOC_CARD_H,
    fill: { color: THEME.PAGE_BG },
    line: { color: THEME.DIVIDER_COLOR, width: 1 },
  });

  slide.addText('Contents', {
    x: OVERVIEW_LAYOUT.RIGHT_COL_X,
    y: OVERVIEW_LAYOUT.TOC_LABEL_Y,
    w: OVERVIEW_LAYOUT.RIGHT_COL_W,
    h: 0.28,
    fontFace: THEME.FONT,
    fontSize: 11,
    bold: true,
    color: THEME.NAVY,
    align: 'left',
    valign: 'top',
  });

  const tocLines = lecture.sections
    .map((s, i) => `${i + 1}.  ${s.sectionTitle}`)
    .join('\n');

  slide.addText(tocLines, {
    x: OVERVIEW_LAYOUT.RIGHT_COL_X,
    y: OVERVIEW_LAYOUT.TOC_Y,
    w: OVERVIEW_LAYOUT.RIGHT_COL_W,
    h: OVERVIEW_LAYOUT.TOC_H,
    fontFace: THEME.FONT,
    fontSize: THEME.FONT_OVERVIEW_TOC,
    color: THEME.BODY_TEXT,
    align: 'left',
    valign: 'top',
    wrap: true,
    paraSpaceAfter: 6,
  });

  slide.slideNumber = {
    x: SLIDE_NUMBER_X, y: SLIDE_NUMBER_Y,
    fontFace: THEME.FONT,
    fontSize: THEME.FONT_SLIDE_NUMBER,
    color: THEME.SLIDE_NUMBER_COLOR,
  };
}
