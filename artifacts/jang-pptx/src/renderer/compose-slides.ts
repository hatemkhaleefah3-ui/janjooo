import PptxGenJS from 'pptxgenjs';
import { THEME } from '../template/theme';
import { ENDING_LAYOUT } from '../template/slide-layouts';
import { CONTENT_X } from '../template/geometry';
import { addEditorialFooter, addEditorialHeader, addOrbitArtwork } from '../template/editorial';
import { renderCover } from './render-cover';
import { renderOverview } from './render-overview';
import { renderSection } from './render-section';
import { renderContentSlide } from './render-content-slide';
import { renderImageSlide } from './render-image';
import { renderDedicatedTableSlides } from './render-table';
import { renderDedicatedDiagramSlides } from './render-diagram';
import { paginateContent } from './paginate-content';
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
  renderCover(pptx, lecture);
  renderOverview(pptx, lecture);

  for (let si = 0; si < lecture.sections.length; si++) {
    const section = lecture.sections[si];
    renderSection(pptx, section, si);

    for (const lectureSlide of section.slides) {
      const fragments = paginateContent(lectureSlide);
      let contentPageIndex = 0;

      for (const fragment of fragments) {
        switch (fragment.type) {
          case 'content': {
            const isFirstPage = contentPageIndex === 0;
            renderContentSlide(pptx, fragment.blocks, {
              slideTitle: isFirstPage ? lectureSlide.slideTitle : '',
              slideSubtitle: isFirstPage ? lectureSlide.slideSubtitle : '',
              isFirstPage,
              sectionTitle: section.sectionTitle,
            });
            contentPageIndex++;
            break;
          }
          case 'image': {
            const result = renderImageSlide(pptx, fragment.block, importedImages, section.sectionTitle);
            warnings.push(...result.warnings);
            break;
          }
          case 'dedicated-table':
            renderDedicatedTableSlides(pptx, fragment.block, section.sectionTitle);
            break;
          case 'dedicated-diagram':
            renderDedicatedDiagramSlides(pptx, fragment.block, section.sectionTitle);
            break;
        }
      }
    }
  }

  renderEnding(pptx, lecture);
}
