import PptxGenJS from 'pptxgenjs';
import { THEME } from '../template/theme';
import { COVER_LAYOUT } from '../template/slide-layouts';
import { addEditorialFooter, addEditorialHeader, addOrbitArtwork } from '../template/editorial';
import type { LectureDocument } from '../schema/lecture-types';

export function renderCover(pptx: PptxGenJS, lecture: LectureDocument): void {
  const slide = pptx.addSlide();
  slide.background = { color: THEME.NAVY };

  slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
    x: COVER_LAYOUT.STRIP_X, y: COVER_LAYOUT.STRIP_Y,
    w: COVER_LAYOUT.STRIP_W, h: COVER_LAYOUT.STRIP_H,
    fill: { color: THEME.GRAPHITE }, line: { color: THEME.GRAPHITE, width: 0 },
  });
  slide.addShape('line' as PptxGenJS.SHAPE_NAME, {
    x: COVER_LAYOUT.STRIP_X + 1.42, y: 0, w: 0, h: THEME.SLIDE_HEIGHT,
    line: { color: THEME.DARK_RULE, width: 0.8, transparency: 20 },
  });
  addOrbitArtwork(slide, 8.42, 1.0, 4.15, 4.55);
  addEditorialHeader(slide, 'Jang lecture / editable PowerPoint', '', true);

  slide.addText(lecture.documentTitle, {
    x: COVER_LAYOUT.TITLE_X, y: COVER_LAYOUT.TITLE_Y,
    w: COVER_LAYOUT.TITLE_W, h: COVER_LAYOUT.TITLE_H,
    fontFace: THEME.headingFont, fontSize: THEME.FONT_COVER_TITLE,
    bold: true, color: THEME.WHITE, margin: 0,
    align: 'left', valign: 'top', wrap: true, fit: 'shrink',
  });

  slide.addShape('line' as PptxGenJS.SHAPE_NAME, {
    x: COVER_LAYOUT.TITLE_X, y: 3.37, w: 1.12, h: 0,
    line: { color: THEME.WHITE, width: 2 },
  });

  slide.addText(lecture.overview.title || 'Structured lecture', {
    x: COVER_LAYOUT.TITLE_X, y: 3.72, w: 5.75, h: 0.48,
    fontFace: THEME.bodyFont, fontSize: 15,
    color: THEME.MUTED_ON_DARK, margin: 0,
    align: 'left', valign: 'top', wrap: true, fit: 'shrink',
  });
  slide.addText('GENERATED FROM STRUCTURED LECTURE METADATA', {
    x: COVER_LAYOUT.TITLE_X, y: 5.45, w: 5.8, h: 0.18,
    fontFace: THEME.labelFont, fontSize: THEME.FONT_COVER_LABEL,
    bold: true, charSpacing: 1.5, color: THEME.MUTED_ON_DARK, margin: 0,
  });

  addEditorialFooter(slide, lecture.documentTitle, true);
}
