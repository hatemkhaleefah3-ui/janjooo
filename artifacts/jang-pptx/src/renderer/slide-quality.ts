import { estimateBlockHeight, isDedicatedBlock, paginateContent } from './paginate-content';
import { compactSectionSlides, verifyNoContentLoss } from './compact-slides';
import { richTextToPlain } from './rich-text';
import type { ImportedImage, LectureDocument } from '../schema/lecture-types';

export interface SlideQualityIssue {
  code:
    | 'low-density-continuation'
    | 'blank-image-slide'
    | 'unfilled-image-slot'
    | 'disproportionate-slide-count'
    | 'content-lost-in-compaction';
  message: string;
}

export interface SlideQualityReport {
  /** Estimated total slide count, including cover, overview, section dividers, and ending. */
  estimatedSlideCount: number;
  /** Count of semantic content blocks across the whole lecture (paragraphs, lists, tables, images, ...). */
  semanticBlockCount: number;
  issues: SlideQualityIssue[];
  valid: boolean;
}

/** A continuation page this short (inches) is the "avoidable low-density continuation
 * slide" the issue calls out — one short paragraph or list fragment that should have
 * fit on the previous page. */
const LOW_DENSITY_HEIGHT_THRESHOLD = 1.15;

/**
 * Upper bound on generated slides per semantic block before the deck is
 * considered disproportionate to its content (issue #22 acceptance criteria:
 * "substantially fewer than 33 slides" for a lecture whose content doesn't
 * warrant it).
 */
const DISPROPORTION_RATIO = 1.6;

/**
 * Evaluates layout quality against the criteria in issue #22 without
 * rendering a PPTX. Pure and fast enough to run in CI or as a pre-generation
 * gate; `generateLecturePptx` also runs it and folds violations into its
 * warnings (or throws when `strictQuality` is set).
 */
export function evaluateSlideQuality(
  lecture: LectureDocument,
  importedImages: Record<string, ImportedImage> = {},
): SlideQualityReport {
  const issues: SlideQualityIssue[] = [];
  let contentSlideCount = 0;
  let semanticBlockCount = 0;

  for (const section of lecture.sections) {
    semanticBlockCount += section.slides.reduce((sum, slide) => sum + slide.blocks.length, 0);
    const compacted = compactSectionSlides(section.slides);

    const lossViolations = verifyNoContentLoss(section.slides, compacted);
    for (const violation of lossViolations) {
      issues.push({ code: 'content-lost-in-compaction', message: `${section.sectionTitle}: ${violation}` });
    }

    for (const slide of compacted) {
      const fragments = paginateContent(slide);
      let contentPageIndex = 0;

      for (const fragment of fragments) {
        contentSlideCount++;

        if (fragment.type === 'content') {
          const isContinuation = contentPageIndex > 0;
          contentPageIndex++;
          const nonImageBlocks = fragment.blocks.filter((block) => block.type !== 'image');
          const density = nonImageBlocks.reduce((sum, block) => sum + estimateBlockHeight(block), 0);
          if (isContinuation && nonImageBlocks.length <= 1 && density < LOW_DENSITY_HEIGHT_THRESHOLD) {
            issues.push({
              code: 'low-density-continuation',
              message: `Avoidable low-density continuation slide for "${slide.slideTitle}" in section "${section.sectionTitle}".`,
            });
          }
          for (const image of fragment.blocks.filter((block) => block.type === 'image')) {
            if (!importedImages[image.slotId]?.dataUrl) {
              issues.push({
                code: 'unfilled-image-slot',
                message: `Image slot "${image.slotId}" has no imported image.`,
              });
            }
          }
          continue;
        }

        if (fragment.type === 'image') {
          const hasLabel = richTextToPlain(fragment.block.label).trim().length > 0;
          const hasDescription = richTextToPlain(fragment.block.description).trim().length > 0;
          const imported = importedImages[fragment.block.slotId];
          const isFilled = Boolean(imported?.dataUrl);

          if (!isFilled) {
            issues.push({
              code: 'unfilled-image-slot',
              message: `Image slot "${fragment.block.slotId}" has no imported image.`,
            });
            issues.push({
              code: 'blank-image-slide',
              message: hasLabel || hasDescription
                ? `Dedicated image slide for unfilled slot "${fragment.block.slotId}" should be integrated into related content.`
                : `Blank image-only slide for slot "${fragment.block.slotId}" — no label, description, or image.`,
            });
          }
        }
      }
    }
  }

  // 3 fixed slides (cover, overview, ending) + one section-divider slide per section.
  const overheadSlides = 3 + lecture.sections.length;
  const estimatedSlideCount = overheadSlides + contentSlideCount;
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

/** Only structural defects (not "unfilled slot" info, which is expected during drafting) block validity. */
function isBlockingIssue(issue: SlideQualityIssue): boolean {
  return issue.code !== 'unfilled-image-slot';
}

/** `isDedicatedBlock` re-export kept for callers that only need the routing predicate. */
export { isDedicatedBlock };
