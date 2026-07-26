import { getAvailableHeight } from '../template/geometry';
import { estimateBlockHeight, isDedicatedBlock } from './paginate-content';
import { richTextToPlain } from './rich-text';
import type { LectureBlock, LectureSlide, SubtitleBlock, TitleBlock } from '../schema/lecture-types';

/**
 * Fraction of a single page's usable height a merged group may occupy.
 * Leaves headroom so a merge doesn't immediately force an awkward
 * continuation split right after compaction.
 */
const MERGE_BUDGET_RATIO = 0.85;

function mergeBudget(): number {
  return Math.max(0.5, getAvailableHeight(true, true) - 0.55) * MERGE_BUDGET_RATIO;
}

/** Height contributed by a slide's non-dedicated blocks (dedicated blocks — full
 * images, wide tables, large diagrams — always get their own slide regardless
 * of how many source slides were merged, so they don't count against budget). */
function nonDedicatedHeight(blocks: LectureBlock[]): number {
  return blocks.reduce((sum, block) => sum + (isDedicatedBlock(block) ? 0 : estimateBlockHeight(block)), 0);
}

/** A logical title group retained when adjacent topics share a physical slide. */
function topicHeadingBlock(slide: LectureSlide): TitleBlock | undefined {
  const title = slide.slideTitle.trim();
  if (!title) return undefined;
  return {
    blockId: `${slide.slideId}--title`,
    type: 'title',
    text: slide.slideTitle,
    ...(slide.titleDefinition ? { definition: slide.titleDefinition } : {}),
    sourceReferences: [...slide.sourceReferences],
  };
}

/** A top-level sub-title group retained beneath its logical title. */
function subtitleBlock(slide: LectureSlide): SubtitleBlock | undefined {
  const text = richTextToPlain(slide.slideSubtitle).trim();
  if (!text) return undefined;
  return {
    blockId: `${slide.slideId}--subtitle`,
    type: 'subtitle',
    text: slide.slideSubtitle,
    ...(slide.subtitleDefinition ? { definition: slide.subtitleDefinition } : {}),
    sourceReferences: [...slide.sourceReferences],
  };
}

/**
 * Merges adjacent slides within a single section when their combined
 * non-dedicated content comfortably fits a single page (issue #22,
 * requirement 1). Never crosses a section boundary — callers pass one
 * section's slides at a time. A merged-in topic keeps its own heading (and
 * subtitle, if any) as inline blocks so nothing from the original slide is
 * lost, only re-grouped onto fewer pages.
 */
export function compactSectionSlides(slides: LectureSlide[]): LectureSlide[] {
  const budget = mergeBudget();
  const compacted: LectureSlide[] = [];
  let current: LectureSlide | undefined;
  let currentHeight = 0;

  for (const slide of slides) {
    if (current) {
      const heading = topicHeadingBlock(slide);
      const subTitle = subtitleBlock(slide);
      const additions = [heading, subTitle, ...slide.blocks].filter(
        (block): block is LectureBlock => Boolean(block),
      );
      const additionHeight = nonDedicatedHeight(additions);
      const currentInlineImages = current.blocks.filter(
        (block) => block.type === 'image' && !isDedicatedBlock(block),
      ).length;
      const additionInlineImages = additions.filter(
        (block) => block.type === 'image' && !isDedicatedBlock(block),
      ).length;
      const wouldCreateSecondInlineImage = currentInlineImages > 0 && additionInlineImages > 0;

      if (!wouldCreateSecondInlineImage && currentHeight + additionHeight <= budget) {
        current.blocks.push(...additions);
        current.sourceReferences = [...new Set([...current.sourceReferences, ...slide.sourceReferences])];
        currentHeight += additionHeight;
        continue;
      }
    }

    if (current) compacted.push(current);
    current = { ...slide, blocks: [...slide.blocks], sourceReferences: [...slide.sourceReferences] };
    currentHeight = nonDedicatedHeight(current.blocks);
  }
  if (current) compacted.push(current);
  return compacted;
}

/**
 * Verifies compaction preserved every block, source reference, and slide
 * title from the original slide sequence (issue #22, requirement 5: "content
 * or source references lost during compaction" must fail the quality check).
 */
export function verifyNoContentLoss(original: LectureSlide[], compacted: LectureSlide[]): string[] {
  const violations: string[] = [];

  const originalBlockIds = new Set(original.flatMap((slide) => slide.blocks.map((block) => block.blockId)));
  const compactedBlockIds = new Set(compacted.flatMap((slide) => slide.blocks.map((block) => block.blockId)));
  for (const id of originalBlockIds) {
    if (!compactedBlockIds.has(id)) violations.push(`Block "${id}" was lost during compaction.`);
  }

  const originalRefs = new Set(original.flatMap((slide) => [
    ...slide.sourceReferences,
    ...slide.blocks.flatMap((block) => block.sourceReferences),
  ]));
  const compactedRefs = new Set(compacted.flatMap((slide) => [
    ...slide.sourceReferences,
    ...slide.blocks.flatMap((block) => block.sourceReferences),
  ]));
  for (const ref of originalRefs) {
    if (!compactedRefs.has(ref)) violations.push(`Source reference "${ref}" was lost during compaction.`);
  }

  const originalTitles = original.map((slide) => slide.slideTitle.trim()).filter(Boolean);
  const compactedText = compacted
    .flatMap((slide) => [
      slide.slideTitle,
      slide.titleDefinition ? richTextToPlain(slide.titleDefinition) : '',
      richTextToPlain(slide.slideSubtitle),
      slide.subtitleDefinition ? richTextToPlain(slide.subtitleDefinition) : '',
      ...slide.blocks.flatMap((block) => [
        'text' in block ? richTextToPlain(block.text) : '',
        'definition' in block && block.definition ? richTextToPlain(block.definition) : '',
      ]),
    ])
    .join(' \n ');
  for (const title of originalTitles) {
    if (!compactedText.includes(title)) violations.push(`Slide title "${title}" was lost during compaction.`);
  }

  return violations;
}
