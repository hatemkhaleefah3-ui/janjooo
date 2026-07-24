import { THEME } from '../template/theme';
import { getAvailableHeight, CONTENT_WIDTH } from '../template/geometry';
import { estimateTextHeight } from './render-text';
import type {
  LectureBlock, LectureSlide, ImageBlock, TableBlock, DiagramBlock,
} from '../schema/lecture-types';
import { richTextToPlain } from './rich-text';

export type SlideFragment =
  | { type: 'content'; blocks: LectureBlock[] }
  | { type: 'image'; block: ImageBlock }
  | { type: 'dedicated-table'; block: TableBlock }
  | { type: 'dedicated-diagram'; block: DiagramBlock };

/** Returns true for blocks that always get their own dedicated slide. */
export function isDedicatedBlock(block: LectureBlock): boolean {
  if (block.type === 'image') return true;
  if (block.type === 'table') {
    return (block as TableBlock).headers.length > THEME.TABLE_LARGE_THRESHOLD;
  }
  if (block.type === 'diagram') {
    const totalNodes = (block as DiagramBlock).diagramRows.reduce(
      (s, r) => s + r.length, 0,
    );
    return totalNodes > THEME.DIAGRAM_LARGE_THRESHOLD;
  }
  return false;
}

function blockToFragment(block: LectureBlock): SlideFragment {
  if (block.type === 'image') return { type: 'image', block: block as ImageBlock };
  if (block.type === 'table') return { type: 'dedicated-table', block: block as TableBlock };
  if (block.type === 'diagram') return { type: 'dedicated-diagram', block: block as DiagramBlock };
  throw new Error(`blockToFragment: not a dedicated block type: ${block.type}`);
}

/** Estimates how much vertical space a block will consume (in inches). */
export function estimateBlockHeight(block: LectureBlock): number {
  const GAP = THEME.BLOCK_GAP;
  switch (block.type) {
    case 'subtitle':
      return THEME.H_SUBTITLE_BLOCK + GAP;
    case 'paragraph': {
      const h = estimateTextHeight(block.text, CONTENT_WIDTH, THEME.FONT_PARAGRAPH);
      return Math.max(0.3, h) + GAP;
    }
    case 'bullets':
      return block.items.length * THEME.H_BULLET_ITEM + 0.08 + GAP;
    case 'numbered':
      return block.items.length * THEME.H_NUMBERED_ITEM + 0.08 + GAP;
    case 'callout': {
      const textLines = Math.max(1, Math.ceil(richTextToPlain(block.text).length / 120));
      return Math.max(THEME.H_CALLOUT_MIN, textLines * 0.22 + 0.28) + GAP;
    }
    case 'table': {
      const t = block as TableBlock;
      return THEME.H_TABLE_LABEL + 0.04 + THEME.H_TABLE_HEADER_ROW +
        t.rows.length * THEME.H_TABLE_BODY_ROW + GAP;
    }
    case 'diagram': {
      const d = block as DiagramBlock;
      return THEME.H_DIAGRAM_LABEL + 0.06 +
        d.diagramRows.length * (THEME.DIAGRAM_NODE_HEIGHT + THEME.DIAGRAM_ROW_V_GAP) + GAP;
    }
    case 'image':
      return 0; // handled separately
    default:
      return 0.5;
  }
}

/**
 * Paginates a slide's blocks into fragments, each representing
 * one output slide's worth of content.
 */
export function paginateContent(slide: LectureSlide): SlideFragment[] {
  const fragments: SlideFragment[] = [];
  const queue: LectureBlock[] = [...slide.blocks];

  let currentPage: LectureBlock[] = [];
  let currentHeight = 0;
  let isFirstPage = true;

  const availFor = (first: boolean): number => {
    const hasTitle = first && !!slide.slideTitle.trim();
    const hasSubtitle = first && !!richTextToPlain(slide.slideSubtitle).trim();
    return getAvailableHeight(hasTitle, hasSubtitle) - 0.1;
  };

  while (queue.length > 0) {
    const block = queue.shift()!;

    if (isDedicatedBlock(block)) {
      // Flush current page before inserting the dedicated slide
      if (currentPage.length > 0) {
        fragments.push({ type: 'content', blocks: currentPage });
        currentPage = [];
        currentHeight = 0;
        isFirstPage = false;
      }
      fragments.push(blockToFragment(block));
      continue;
    }

    const blockH = estimateBlockHeight(block);
    const avail = availFor(isFirstPage && currentPage.length === 0);

    if (currentHeight + blockH > avail && currentPage.length > 0) {
      // Current page is full — flush and retry this block
      fragments.push({ type: 'content', blocks: currentPage });
      currentPage = [];
      currentHeight = 0;
      isFirstPage = false;
      queue.unshift(block);
      continue;
    }

    currentPage.push(block);
    currentHeight += blockH;
  }

  if (currentPage.length > 0) {
    fragments.push({ type: 'content', blocks: currentPage });
  }

  return fragments;
}
