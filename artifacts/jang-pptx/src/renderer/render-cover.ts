import PptxGenJS from 'pptxgenjs';
import { THEME } from '../template/theme';
import { COVER_LAYOUT } from '../template/slide-layouts';
import { CONTENT_X, CONTENT_WIDTH } from '../template/geometry';
import type { LectureDocument } from '../schema/lecture-types';

export function renderCover(pptx: PptxGenJS, lecture: LectureDocument): void {
  const slide = pptx.addSlide();
  slide.background = { color: THEME.SLIDE_BG };

  // Left navy strip
  slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
    x: COVER_LAYOUT.STRIP_X,
    y: COVER_LAYOUT.STRIP_Y,
    w: COVER_LAYOUT.STRIP_W,
    h: COVER_LAYOUT.STRIP_H,
    fill: { color: THEME.NAVY },
    line: { color: THEME.NAVY, width: 0 },
  });

  // Top accent band
  slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
    x: 0, y: 0, w: THEME.SLIDE_WIDTH, h: 0.08,
    fill: { color: THEME.NAVY },
    line: { color: THEME.NAVY, width: 0 },
  });

  // Gold accent bar beside title
  slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
    x: COVER_LAYOUT.ACCENT_X,
    y: COVER_LAYOUT.TITLE_Y - 0.1,
    w: COVER_LAYOUT.ACCENT_W,
    h: 2.2,
    fill: { color: THEME.GOLD },
    line: { color: THEME.GOLD, width: 0 },
  });

  // "LECTURE" label
  slide.addText('LECTURE', {
    x: COVER_LAYOUT.LABEL_X,
    y: COVER_LAYOUT.LABEL_Y,
    w: COVER_LAYOUT.LABEL_W,
    h: COVER_LAYOUT.LABEL_H,
    fontFace: THEME.FONT,
    fontSize: THEME.FONT_COVER_LABEL,
    color: THEME.MUTED_TEXT,
    align: 'left',
    valign: 'top',
    charSpacing: 3,
  });

  // Title
  slide.addText(lecture.documentTitle, {
    x: COVER_LAYOUT.TITLE_X,
    y: COVER_LAYOUT.TITLE_Y,
    w: COVER_LAYOUT.TITLE_W,
    h: COVER_LAYOUT.TITLE_H,
    fontFace: THEME.FONT,
    fontSize: THEME.FONT_COVER_TITLE,
    bold: true,
    color: THEME.NAVY,
    align: 'left',
    valign: 'top',
    wrap: true,
  });

  // Thin divider below title
  slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
    x: COVER_LAYOUT.TITLE_X,
    y: COVER_LAYOUT.TITLE_Y + COVER_LAYOUT.TITLE_H + 0.1,
    w: 3.2,
    h: 0.03,
    fill: { color: THEME.DIVIDER_COLOR },
    line: { color: THEME.DIVIDER_COLOR, width: 0 },
  });

  // Bottom-right: slide info bar
  slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
    x: 0, y: THEME.SLIDE_HEIGHT - 0.5,
    w: THEME.SLIDE_WIDTH, h: 0.5,
    fill: { color: THEME.PAGE_BG },
    line: { color: THEME.DIVIDER_COLOR, width: 0 },
  });

  slide.addText(lecture.overview.title, {
    x: CONTENT_X,
    y: THEME.SLIDE_HEIGHT - 0.45,
    w: CONTENT_WIDTH,
    h: 0.38,
    fontFace: THEME.FONT,
    fontSize: 11,
    color: THEME.MUTED_TEXT,
    align: 'left',
    valign: 'middle',
  });
}
