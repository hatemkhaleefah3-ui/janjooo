import { CONTENT_WIDTH, SAFE_BOTTOM, TEXT_WIDTH_WITH_IMAGE } from '../template/geometry';
import type {
  ImageBlock,
  LectureBlock,
  LectureSlide,
} from '../schema/lecture-types';
import { isDedicatedBlock } from '../renderer/paginate-content';
import { createContentSlideRenderPlan, measureContentHeading, selectRightSideCompanion } from './plan-content-slide';
import { planDedicatedDiagramSlides, type DedicatedDiagramSlideRenderPlan } from './plan-diagram-slides';
import { planDedicatedImageSlide, type DedicatedImageSlideRenderPlan } from './plan-image-slide';
import { planDedicatedTableSlides, type DedicatedTableSlideRenderPlan } from './plan-table-slides';
import { SlideRenderPlanError, type ContentSlideRenderPlan } from './slide-render-plan';
import { splitContentBlock, type ContentBlockSplit } from './split-content-block';

export type PlannedLectureSlideFragment =
  | { type: 'content'; plan: ContentSlideRenderPlan }
  | { type: 'image'; plan: DedicatedImageSlideRenderPlan }
  | { type: 'dedicated-table'; plan: DedicatedTableSlideRenderPlan }
  | { type: 'dedicated-diagram'; plan: DedicatedDiagramSlideRenderPlan };

interface ImageRebalanceResult {
  currentBlocks: LectureBlock[];
  tail: LectureBlock;
}

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
    titleDefinition: isFirstPage ? slide.titleDefinition : undefined,
    slideSubtitle: isFirstPage ? slide.slideSubtitle : '',
    subtitleDefinition: isFirstPage ? slide.subtitleDefinition : undefined,
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

function availableHeight(
  slide: LectureSlide,
  sectionTitle: string,
  pageIndex: number,
  textWidth: number,
): number {
  const heading = measureContentHeading(
    planningInput(slide, sectionTitle, pageIndex),
    textWidth,
  );
  return Math.max(0.25, SAFE_BOTTOM - heading.contentStartY);
}

function hasInlineImage(blocks: LectureBlock[]): boolean {
  return blocks.some((block) => block.type === 'image');
}

function onlyInlineImage(blocks: LectureBlock[]): boolean {
  return blocks.length === 1 && blocks[0].type === 'image';
}

function textDensity(plan: ContentSlideRenderPlan): number {
  return plan.contentBounds.h * plan.naturalUtilization;
}

/**
 * Splits a block conservatively until the exact immutable plan accepts the
 * resulting head. Text estimation is intentionally only a starting point;
 * the physical plan remains the authority for every page boundary.
 */
function splitToValidPlan(
  slide: LectureSlide,
  sectionTitle: string,
  pageIndex: number,
  pageBlocks: LectureBlock[],
  block: LectureBlock,
  serial: number,
  width: number,
): ContentBlockSplit | undefined {
  const height = availableHeight(slide, sectionTitle, pageIndex, width);
  const ratios = [1, 0.92, 0.84, 0.76, 0.68, 0.6, 0.52, 0.44, 0.36, 0.28, 0.2];

  for (const ratio of ratios) {
    const split = splitContentBlock(
      block,
      Math.max(0.32, height * ratio),
      serial,
      width,
    );
    if (tryPlan(slide, sectionTitle, pageIndex, [...pageBlocks, split.head])) {
      return split;
    }
  }

  return undefined;
}

/**
 * When a later image would otherwise be forced onto a sparse image-only page,
 * split the trailing text block again and carry a substantive tail forward with
 * the image. Both resulting pages must validate as complete immutable plans.
 */
function rebalanceTrailingTextForImage(
  slide: LectureSlide,
  sectionTitle: string,
  pageIndex: number,
  currentBlocks: LectureBlock[],
  image: ImageBlock,
  serial: number,
): ImageRebalanceResult | undefined {
  if (currentBlocks.length === 0 || hasInlineImage(currentBlocks)) return undefined;

  const prefix = currentBlocks.slice(0, -1);
  const trailing = currentBlocks[currentBlocks.length - 1];
  if (!['paragraph', 'bullets', 'numbered', 'callout', 'table'].includes(trailing.type)) {
    return undefined;
  }

  const fullHeight = availableHeight(slide, sectionTitle, pageIndex, CONTENT_WIDTH);
  const ratios = [0.82, 0.72, 0.62, 0.52, 0.42, 0.32, 0.24];
  let best: (ImageRebalanceResult & { score: number }) | undefined;

  for (const ratio of ratios) {
    const split = splitContentBlock(
      trailing,
      Math.max(0.35, fullHeight * ratio),
      serial,
      CONTENT_WIDTH,
    );
    if (!split.tail) continue;

    const firstBlocks = [...prefix, split.head];
    const firstPlan = tryPlan(slide, sectionTitle, pageIndex, firstBlocks);
    const companionPlan = tryPlan(slide, sectionTitle, pageIndex + 1, [split.tail, image]);
    if (!firstPlan || !companionPlan) continue;

    const firstDensity = textDensity(firstPlan);
    const companionDensity = textDensity(companionPlan);
    if (firstDensity < 0.8 || companionDensity < 0.75) continue;

    const score = Math.min(firstDensity, companionDensity) + companionDensity * 0.2;
    if (!best || score > best.score) {
      best = { currentBlocks: firstBlocks, tail: split.tail, score };
    }
  }

  return best
    ? { currentBlocks: best.currentBlocks, tail: best.tail }
    : undefined;
}

/**
 * Plans one logical lecture slide into physical output pages.
 *
 * Source order is preserved. Each next block is accepted only when the complete
 * immutable slide plan—including measured title/subtitle reserve, mixed-column
 * reflow, image captions, and safe bottom—validates. A later image is added to
 * the current page only when the already-placed text still fits after narrowing.
 * When that is impossible, the planner rebalances a trailing text fragment so
 * the image starts the next page with substantive related copy instead of a
 * sparse image-only continuation.
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

      // Keep compatible title groups together until the preceding natural
      // content footprint exceeds the preferred 90% utilization target.
      if (next.type === 'title' && pageBlocks.length > 0) {
        const prior = tryPlan(slide, sectionTitle, pageIndex, pageBlocks);
        if (prior && prior.naturalUtilization > 0.9 + 0.001) break;
      }

      const candidate = [...pageBlocks, next];
      if (tryPlan(slide, sectionTitle, pageIndex, candidate)) {
        pageBlocks.push(queue.shift()!);
        continue;
      }

      if (next.type === 'image' && pageBlocks.length > 0) {
        const rebalanced = rebalanceTrailingTextForImage(
          slide,
          sectionTitle,
          pageIndex,
          pageBlocks,
          next,
          splitSerial,
        );
        if (rebalanced) {
          pageBlocks.splice(0, pageBlocks.length, ...rebalanced.currentBlocks);
          queue.unshift(rebalanced.tail);
          splitSerial += 1;
          break;
        }
      }

      const maySplitIntoCurrentPage = pageBlocks.length === 0 || onlyInlineImage(pageBlocks);
      if (!maySplitIntoCurrentPage) break;

      if (next.type === 'image') {
        throw new SlideRenderPlanError([
          `Image block ${next.blockId} cannot fit its planned image and caption boxes on an empty content page.`,
        ]);
      }

      const width = selectRightSideCompanion([...pageBlocks, next]) ? TEXT_WIDTH_WITH_IMAGE : CONTENT_WIDTH;
      const split = splitToValidPlan(
        slide,
        sectionTitle,
        pageIndex,
        pageBlocks,
        next,
        splitSerial,
        width,
      );
      if (!split) {
        throw new SlideRenderPlanError([
          `Block ${next.blockId} (${next.type}) could not be split into a valid physical page.`,
        ]);
      }

      splitSerial += 1;
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
