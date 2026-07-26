import { CONTENT_WIDTH, getAvailableHeight, TEXT_WIDTH_WITH_IMAGE } from '../template/geometry';
import type {
  LectureBlock,
  LectureSlide,
} from '../schema/lecture-types';
import { isDedicatedBlock } from '../renderer/paginate-content';
import { richTextToPlain } from '../renderer/rich-text';
import { createContentSlideRenderPlan } from './plan-content-slide';
import { planDedicatedDiagramSlides, type DedicatedDiagramSlideRenderPlan } from './plan-diagram-slides';
import { planDedicatedImageSlide, type DedicatedImageSlideRenderPlan } from './plan-image-slide';
import { planDedicatedTableSlides, type DedicatedTableSlideRenderPlan } from './plan-table-slides';
import { SlideRenderPlanError, type ContentSlideRenderPlan } from './slide-render-plan';
import { splitContentBlock } from './split-content-block';

export type PlannedLectureSlideFragment =
  | { type: 'content'; plan: ContentSlideRenderPlan }
  | { type: 'image'; plan: DedicatedImageSlideRenderPlan }
  | { type: 'dedicated-table'; plan: DedicatedTableSlideRenderPlan }
  | { type: 'dedicated-diagram'; plan: DedicatedDiagramSlideRenderPlan };

function planningInput(
  slide: LectureSlide,
  sectionTitle: string,
  pageIndex: number,
) {
  const isFirstPage = pageIndex === 0;
  return {
    sourceSlideId: slide.slideId,
    pageIndex,
    slideTitle: isFirstPage ? slide.slideTitle : '',
    slideSubtitle: isFirstPage ? slide.slideSubtitle : '',
    isFirstPage,
    sectionTitle,
  };
}

function tryPlan(
  slide: LectureSlide,
  sectionTitle: string,
  pageIndex: number,
  blocks: LectureBlock[],
): ContentSlideRenderPlan | undefined {
  try {
    return createContentSlideRenderPlan(blocks, planningInput(slide, sectionTitle, pageIndex));
  } catch (error) {
    if (error instanceof SlideRenderPlanError) return undefined;
    throw error;
  }
}

function availableHeight(slide: LectureSlide, pageIndex: number): number {
  const first = pageIndex === 0;
  const hasTitle = first && slide.slideTitle.trim().length > 0;
  const hasSubtitle = first && richTextToPlain(slide.slideSubtitle).trim().length > 0;
  return Math.max(0.25, getAvailableHeight(hasTitle, hasSubtitle));
}

function hasInlineImage(blocks: LectureBlock[]): boolean {
  return blocks.some((block) => block.type === 'image');
}

function onlyInlineImage(blocks: LectureBlock[]): boolean {
  return blocks.length === 1 && blocks[0].type === 'image';
}

/**
 * Plans one logical lecture slide into physical output pages.
 *
 * Source order is preserved. Each next block is accepted only when the complete
 * immutable slide plan—including title/subtitle reserve, mixed-column reflow,
 * image captions, and safe bottom—validates. A later image is added to the
 * current page only when the already-placed text still fits after narrowing;
 * otherwise the image starts the next page and can pair with following text.
 */
export function planLectureSlide(
  slide: LectureSlide,
  sectionTitle: string,
): PlannedLectureSlideFragment[] {
  const output: PlannedLectureSlideFragment[] = [];
  const queue: LectureBlock[] = [...slide.blocks];
  let pageIndex = 0;
  let splitSerial = 1;

  while (queue.length > 0) {
    if (isDedicatedBlock(queue[0])) {
      const block = queue.shift()!;
      if (block.type === 'image') {
        output.push({ type: 'image', plan: planDedicatedImageSlide(block, sectionTitle) });
      } else if (block.type === 'table') {
        output.push(...planDedicatedTableSlides(block, sectionTitle).map((plan) => ({
          type: 'dedicated-table' as const,
          plan,
        })));
      } else if (block.type === 'diagram') {
        output.push(...planDedicatedDiagramSlides(block, sectionTitle).map((plan) => ({
          type: 'dedicated-diagram' as const,
          plan,
        })));
      }
      continue;
    }

    const pageBlocks: LectureBlock[] = [];

    while (queue.length > 0) {
      const next = queue[0];
      if (isDedicatedBlock(next)) break;

      if (next.type === 'image' && hasInlineImage(pageBlocks)) break;

      const candidate = [...pageBlocks, next];
      if (tryPlan(slide, sectionTitle, pageIndex, candidate)) {
        pageBlocks.push(queue.shift()!);
        continue;
      }

      const maySplitIntoCurrentPage = pageBlocks.length === 0 || onlyInlineImage(pageBlocks);
      if (!maySplitIntoCurrentPage) break;

      if (next.type === 'image') {
        throw new SlideRenderPlanError([
          `Image block ${next.blockId} cannot fit its planned image and caption boxes on an empty content page.`,
        ]);
      }

      const width = hasInlineImage(pageBlocks) ? TEXT_WIDTH_WITH_IMAGE : CONTENT_WIDTH;
      const split = splitContentBlock(
        next,
        availableHeight(slide, pageIndex),
        splitSerial++,
        width,
      );
      const splitCandidate = [...pageBlocks, split.head];
      const planned = tryPlan(slide, sectionTitle, pageIndex, splitCandidate);
      if (!planned) {
        throw new SlideRenderPlanError([
          `Block ${next.blockId} (${next.type}) could not be split into a valid physical page.`,
        ]);
      }

      queue.shift();
      if (split.tail) queue.unshift(split.tail);
      pageBlocks.push(split.head);
      break;
    }

    if (pageBlocks.length === 0) {
      const next = queue[0];
      throw new SlideRenderPlanError([
        `Planner made no progress at block ${next?.blockId ?? 'unknown'}.`,
      ]);
    }

    output.push({
      type: 'content',
      plan: createContentSlideRenderPlan(
        pageBlocks,
        planningInput(slide, sectionTitle, pageIndex),
      ),
    });
    pageIndex += 1;
  }

  return output;
}
