import PptxGenJS from 'pptxgenjs';
import { THEME } from '../template/theme';
import { ENDING_LAYOUT } from '../template/slide-layouts';
import { CONTENT_X } from '../template/geometry';
import { addEditorialFooter, addEditorialHeader, addOrbitArtwork } from '../template/editorial';
import { planPresentation } from '../layout/plan-presentation';
import { renderCover } from './render-cover';
import { renderOverview } from './render-overview';
import { renderSection } from './render-section';
import { renderContentSlide } from './render-content-slide';
import { renderDedicatedImageSlide } from './render-image';
import { renderDedicatedTableSlide } from './render-table';
import { renderDedicatedDiagramSlide } from './render-diagram';
import type { LectureDocument, ImportedImage } from '../schema/lecture-types';
import { richTextRuns, richTextToPlain } from './rich-text';

function renderEnding(pptx: PptxGenJS, lecture: LectureDocument): void {
  const slide = pptx.addSlide();
  slide.background = { color: THEME.NAVY };
  slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
    x: 8.68, y: 0, w: THEME.SLIDE_WIDTH - 8.68, h: THEME.SLIDE_HEIGHT,
    fill: { color: THEME.GRAPHITE }, line: { color: THEME.GRAPHITE, width: 0 },
  });
  slide.addShape('line' as PptxGenJS.SHAPE_NAME, {
    x: 8.68, y: 0, w: 0, h: THEME.SLIDE_HEIGHT,
    line: { color: THEME.DARK_RULE, width: 1 },
  });
  addOrbitArtwork(slide, 9.12, 1.85, 3.55, 3.85);
  addEditorialHeader(slide, 'Discussion / next step', '', true);

  slide.addText(richTextRuns(richTextToPlain(lecture.endNote) ? lecture.endNote : 'Questions and discussion'), {
    x: CONTENT_X, y: ENDING_LAYOUT.TEXT_Y, w: 6.45, h: ENDING_LAYOUT.TEXT_H,
    fontFace: THEME.headingFont, fontSize: 30,
    bold: true, color: THEME.WHITE, margin: 0,
    align: 'left', valign: 'top', wrap: true, fit: 'shrink',
  });
  slide.addShape('line' as PptxGenJS.SHAPE_NAME, {
    x: CONTENT_X, y: ENDING_LAYOUT.UNDERLINE_Y, w: 1.12, h: 0,
    line: { color: THEME.WHITE, width: 2 },
  });
  slide.addText(lecture.documentTitle, {
    x: CONTENT_X, y: 5.9, w: 6.4, h: 0.3,
    fontFace: THEME.bodyFont, fontSize: 11,
    color: THEME.MUTED_ON_DARK, margin: 0,
    align: 'left', valign: 'top', fit: 'shrink',
  });

  addEditorialFooter(slide, lecture.documentTitle, true);
}

export function composeSlides(
  pptx: PptxGenJS,
  lecture: LectureDocument,
  importedImages: Record<string, ImportedImage>,
  warnings: string[],
): void {
  const presentationPlan = planPresentation(lecture);

  for (const slidePlan of presentationPlan.slides) {
    switch (slidePlan.type) {
      case 'cover':
        renderCover(pptx, slidePlan.lecture);
        break;
      case 'overview':
        renderOverview(pptx, slidePlan.lecture);
        break;
      case 'section':
        renderSection(pptx, slidePlan.section, slidePlan.sectionIndex);
        break;
      case 'content':
        renderContentSlide(pptx, slidePlan.plan, importedImages, warnings);
        break;
      case 'image': {
        const result = renderDedicatedImageSlide(pptx, slidePlan.plan, importedImages);
        warnings.push(...result.warnings);
        break;
      }
      case 'dedicated-table':
        renderDedicatedTableSlide(pptx, slidePlan.plan);
        break;
      case 'dedicated-diagram':
        renderDedicatedDiagramSlide(pptx, slidePlan.plan);
        break;
      case 'ending':
        renderEnding(pptx, slidePlan.lecture);
        break;
    }
  }
}
