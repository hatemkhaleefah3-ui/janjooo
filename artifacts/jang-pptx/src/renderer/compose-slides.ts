import PptxGenJS from 'pptxgenjs';
import { THEME } from '../template/theme';
import { ENDING_LAYOUT } from '../template/slide-layouts';
import {
  CONTENT_X, CONTENT_WIDTH, SLIDE_NUMBER_X, SLIDE_NUMBER_Y,
} from '../template/geometry';
import { renderCover } from './render-cover';
import { renderOverview } from './render-overview';
import { renderSection } from './render-section';
import { renderContentSlide } from './render-content-slide';
import { renderImageSlide } from './render-image';
import { renderDedicatedTableSlides } from './render-table';
import { renderDedicatedDiagramSlide } from './render-diagram';
import { paginateContent } from './paginate-content';
import type { LectureDocument, ImportedImage } from '../schema/lecture-types';
import { richTextRuns, richTextToPlain } from './rich-text';

function renderEnding(pptx: PptxGenJS, lecture: LectureDocument): void {
  const slide = pptx.addSlide();
  slide.background = { color: THEME.NAVY };

  slide.addText(richTextRuns(richTextToPlain(lecture.endNote) ? lecture.endNote : 'End of Lecture'), {
    x: CONTENT_X,
    y: ENDING_LAYOUT.TEXT_Y,
    w: CONTENT_WIDTH,
    h: ENDING_LAYOUT.TEXT_H,
    fontFace: THEME.FONT,
    fontSize: 28,
    bold: true,
    color: THEME.WHITE,
    align: 'center',
    valign: 'middle',
    wrap: true,
  });

  // Gold underline accent
  slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
    x: CONTENT_X + CONTENT_WIDTH * 0.28,
    y: ENDING_LAYOUT.UNDERLINE_Y,
    w: CONTENT_WIDTH * 0.44,
    h: 0.04,
    fill: { color: THEME.GOLD },
    line: { color: THEME.GOLD, width: 0 },
  });

  slide.slideNumber = {
    x: SLIDE_NUMBER_X, y: SLIDE_NUMBER_Y,
    fontFace: THEME.FONT,
    fontSize: THEME.FONT_SLIDE_NUMBER,
    color: THEME.SLIDE_NUMBER_COLOR,
  };
}

/**
 * Builds all slides in the correct order:
 * Cover → Overview → (Section title → Section content slides)+ → Ending
 */
export function composeSlides(
  pptx: PptxGenJS,
  lecture: LectureDocument,
  importedImages: Record<string, ImportedImage>,
  warnings: string[],
): void {
  // 1. Cover slide
  renderCover(pptx, lecture);

  // 2. Overview slide
  renderOverview(pptx, lecture);

  // 3. Sections
  for (let si = 0; si < lecture.sections.length; si++) {
    const section = lecture.sections[si];

    // Section title slide
    renderSection(pptx, section, si);

    // Content slides for each slide in the section
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
            const hasImage = !!importedImages[fragment.block.slotId]?.dataUrl;
            if (!hasImage) {
              warnings.push(
                `Image slot "${fragment.block.slotId}" (${richTextToPlain(fragment.block.label)}) has no imported image — placeholder shown.`,
              );
            }
            renderImageSlide(pptx, fragment.block, importedImages, section.sectionTitle);
            break;
          }
          case 'dedicated-table':
            renderDedicatedTableSlides(pptx, fragment.block, section.sectionTitle);
            break;
          case 'dedicated-diagram':
            renderDedicatedDiagramSlide(pptx, fragment.block, section.sectionTitle);
            break;
        }
      }
    }
  }

  // 4. Ending slide
  renderEnding(pptx, lecture);
}
