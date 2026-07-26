import type { LectureDocument, LectureSection } from '../schema/lecture-types';
import { compactSectionSlides } from '../renderer/compact-slides';
import { planLectureSlide, type PlannedLectureSlideFragment } from './plan-lecture-slide';

export type PresentationSlidePlan =
  | { type: 'cover'; lecture: LectureDocument }
  | { type: 'overview'; lecture: LectureDocument }
  | { type: 'section'; section: LectureSection; sectionIndex: number }
  | PlannedLectureSlideFragment
  | { type: 'ending'; lecture: LectureDocument };

export interface PresentationRenderPlan {
  slides: PresentationSlidePlan[];
  sourceLectureSlideCount: number;
  compactedLectureSlideCount: number;
  semanticBlockCount: number;
}

/**
 * Builds the complete ordered deck before PptxGenJS is touched. Fixed premium
 * pages and variable content/image/table/diagram plans share one sequence, so
 * slide count and narrative order cannot differ between quality checks and the
 * final PowerPoint renderer.
 */
export function planPresentation(lecture: LectureDocument): PresentationRenderPlan {
  const normalizedLecture: LectureDocument = {
    ...lecture,
    overview: {
      ...lecture.overview,
      // Key terms are deterministic: exactly one item per section title.
      keyPoints: lecture.sections.map((section) => section.sectionTitle),
    },
  };
  const slides: PresentationSlidePlan[] = [
    { type: 'cover', lecture: normalizedLecture },
    { type: 'overview', lecture: normalizedLecture },
  ];
  let sourceLectureSlideCount = 0;
  let compactedLectureSlideCount = 0;
  let semanticBlockCount = 0;

  normalizedLecture.sections.forEach((section, sectionIndex) => {
    slides.push({ type: 'section', section, sectionIndex });
    sourceLectureSlideCount += section.slides.length;
    semanticBlockCount += section.slides.reduce((sum, slide) => sum + slide.blocks.length, 0);
    const compacted = compactSectionSlides(section.slides);
    compactedLectureSlideCount += compacted.length;
    for (const lectureSlide of compacted) {
      slides.push(...planLectureSlide(lectureSlide, section.sectionTitle));
    }
  });

  slides.push({ type: 'ending', lecture: normalizedLecture });
  return {
    slides,
    sourceLectureSlideCount,
    compactedLectureSlideCount,
    semanticBlockCount,
  };
}
