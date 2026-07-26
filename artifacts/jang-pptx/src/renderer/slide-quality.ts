import { planLectureSlide } from '../layout/plan-lecture-slide';
import { isDedicatedBlock } from './paginate-content';
import { compactSectionSlides, verifyNoContentLoss } from './compact-slides';
import { richTextToPlain } from './rich-text';
import type { ImportedImage, LectureDocument } from '../schema/lecture-types';

export interface SlideQualityIssue {
  code:
    | 'low-density-continuation'
    | 'blank-image-slide'
    | 'unfilled-image-slot'
    | 'disproportionate-slide-count'
    | 'content-lost-in-compaction'
    | 'content-density-out-of-range';
  message: string;
}

export interface SlideQualityReport {
  /** Exact planned total slide count, including cover, overview, section dividers, and ending. */
  estimatedSlideCount: number;
  /** Count of semantic content blocks across the whole lecture. */
  semanticBlockCount: number;
  issues: SlideQualityIssue[];
  valid: boolean;
}

const LOW_DENSITY_HEIGHT_THRESHOLD = 1.15;
const DISPROPORTION_RATIO = 1.6;

/**
 * Evaluates the same immutable plans that production renders. Quality no longer
 * runs a parallel pagination model that can disagree with the PPTX output.
 */
export function evaluateSlideQuality(
  lecture: LectureDocument,
  importedImages: Record<string, ImportedImage> = {},
): SlideQualityReport {
  const issues: SlideQualityIssue[] = [];
  let plannedSlideCount = 0;
  let semanticBlockCount = 0;

  for (const section of lecture.sections) {
    semanticBlockCount += section.slides.reduce((sum, slide) => sum + slide.blocks.length, 0);
    const compacted = compactSectionSlides(section.slides);

    const lossViolations = verifyNoContentLoss(section.slides, compacted);
    for (const violation of lossViolations) {
      issues.push({ code: 'content-lost-in-compaction', message: `${section.sectionTitle}: ${violation}` });
    }

    for (const slide of compacted) {
      const fragments = planLectureSlide(slide, section.sectionTitle);
      plannedSlideCount += fragments.length;

      for (const fragment of fragments) {
        if (fragment.type === 'content') {
          const plan = fragment.plan;
          const density = plan.contentBounds.h * plan.naturalUtilization;
          if (plan.utilization < 0.6 - 0.001 || plan.utilization > 1 + 0.001) {
            issues.push({
              code: 'content-density-out-of-range',
              message: `Content utilization ${(plan.utilization * 100).toFixed(1)}% for "${slide.slideTitle}" is outside 60%–100%.`,
            });
          }
          if (plan.pageIndex > 0 && plan.blocks.length <= 1 && density < LOW_DENSITY_HEIGHT_THRESHOLD) {
            issues.push({
              code: 'low-density-continuation',
              message: `Avoidable low-density continuation slide for "${slide.slideTitle}" in section "${section.sectionTitle}".`,
            });
          }
          if (plan.image && !importedImages[plan.image.block.slotId]?.dataUrl) {
            issues.push({
              code: 'unfilled-image-slot',
              message: `Image slot "${plan.image.block.slotId}" has no imported image.`,
            });
          }
          continue;
        }

        if (fragment.type === 'image') {
          const block = fragment.plan.block;
          const hasLabel = richTextToPlain(block.label).trim().length > 0;
          const hasDescription = richTextToPlain(block.description).trim().length > 0;
          const isFilled = Boolean(importedImages[block.slotId]?.dataUrl);

          if (!isFilled) {
            issues.push({
              code: 'unfilled-image-slot',
              message: `Image slot "${block.slotId}" has no imported image.`,
            });
            issues.push({
              code: 'blank-image-slide',
              message: hasLabel || hasDescription
                ? `Dedicated image slide for unfilled slot "${block.slotId}" should be integrated into related content.`
                : `Blank image-only slide for slot "${block.slotId}" — no label, description, or image.`,
            });
          }
        }
      }
    }
  }

  const overheadSlides = 3 + lecture.sections.length;
  const estimatedSlideCount = overheadSlides + plannedSlideCount;
  const expectedUpperBound = overheadSlides + semanticBlockCount * DISPROPORTION_RATIO;
  if (estimatedSlideCount > expectedUpperBound && semanticBlockCount > 0) {
    issues.push({
      code: 'disproportionate-slide-count',
      message: `Generated ${estimatedSlideCount} slides for ${semanticBlockCount} semantic content blocks ` +
        `(expected at most ~${Math.ceil(expectedUpperBound)}).`,
    });
  }

  return { estimatedSlideCount, semanticBlockCount, issues, valid: !issues.some(isBlockingIssue) };
}

function isBlockingIssue(issue: SlideQualityIssue): boolean {
  return issue.code !== 'unfilled-image-slot';
}

export { isDedicatedBlock };
