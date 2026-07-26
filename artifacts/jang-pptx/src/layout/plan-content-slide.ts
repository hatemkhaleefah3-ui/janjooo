import { THEME } from '../template/theme';
import {
  CONTENT_X,
  CONTENT_WIDTH,
  getContentYStart,
  IMAGE_COLUMN_WIDTH,
  IMAGE_COLUMN_X,
  SAFE_BOTTOM,
  TEXT_WIDTH_WITH_IMAGE,
} from '../template/geometry';
import type { ImageBlock, LectureBlock, RichText } from '../schema/lecture-types';
import { estimateBlockHeight } from '../renderer/paginate-content';
import { richTextToPlain } from '../renderer/rich-text';
import {
  assertValidContentSlideRenderPlan,
  type ContentSlideRenderPlan,
  type LayoutBox,
  type PlannedContentBlock,
  type PlannedImageElement,
  type PlannedTextElement,
} from './slide-render-plan';

export interface ContentSlidePlanningInput {
  sourceSlideId: string;
  pageIndex: number;
  slideTitle: string;
  slideSubtitle: RichText;
  isFirstPage: boolean;
  sectionTitle: string;
}

function plannedText(role: PlannedTextElement['role'], text: RichText, box: LayoutBox): PlannedTextElement {
  return { role, text, box };
}

function blockBox(block: LectureBlock, currentY: number, textWidth: number, height: number): LayoutBox {
  switch (block.type) {
    case 'subtitle':
      return { x: CONTENT_X, y: currentY, w: Math.min(textWidth, 8.8), h: height };
    case 'paragraph':
      return { x: CONTENT_X, y: currentY, w: Math.min(textWidth, 9.05), h: height };
    case 'bullets':
    case 'numbered':
      return { x: CONTENT_X + 0.02, y: currentY, w: Math.min(textWidth - 0.02, 9.5), h: height };
    case 'callout':
      return { x: CONTENT_X, y: currentY, w: Math.min(textWidth, 9.35), h: height };
    case 'table':
      return {
        x: CONTENT_X,
        y: currentY,
        w: block.headers.length <= THEME.TABLE_LARGE_THRESHOLD ? textWidth * 0.82 : textWidth,
        h: height,
      };
    case 'diagram': {
      const totalNodes = block.diagramRows.reduce((sum, row) => sum + row.length, 0);
      return {
        x: CONTENT_X,
        y: currentY,
        w: totalNodes <= THEME.DIAGRAM_LARGE_THRESHOLD ? textWidth * 0.82 : textWidth,
        h: height,
      };
    }
    case 'image':
      throw new Error('Image blocks are planned in the image column, not the vertical text flow.');
  }
}

function planImage(
  imageBlock: ImageBlock,
  imageAreaY: number,
  isMixedPage: boolean,
): PlannedImageElement {
  const imageLabel = richTextToPlain(imageBlock.label).trim();
  const imageDescription = richTextToPlain(imageBlock.description).trim();
  const sourceReference = imageBlock.sourceReference.trim();
  const labelHeight = isMixedPage && imageLabel ? 0.34 : 0;
  const descriptionHeight = isMixedPage && imageDescription ? 0.48 : 0;
  const sourceHeight = sourceReference ? 0.2 : 0;
  const hasCaption = Boolean(labelHeight || descriptionHeight || sourceHeight);
  const captionReserve = labelHeight + descriptionHeight + sourceHeight + (hasCaption ? 0.16 : 0);
  const imageAreaH = Math.max(1.2, SAFE_BOTTOM - imageAreaY - captionReserve);
  const image: PlannedImageElement = {
    block: imageBlock,
    box: { x: IMAGE_COLUMN_X, y: imageAreaY, w: IMAGE_COLUMN_WIDTH, h: imageAreaH },
  };

  let captionY = imageAreaY + imageAreaH + 0.08;
  if (labelHeight) {
    image.label = plannedText('image-label', imageBlock.label, {
      x: IMAGE_COLUMN_X, y: captionY, w: IMAGE_COLUMN_WIDTH, h: labelHeight,
    });
    captionY += labelHeight;
  }
  if (descriptionHeight) {
    image.description = plannedText('image-description', imageBlock.description, {
      x: IMAGE_COLUMN_X, y: captionY, w: IMAGE_COLUMN_WIDTH, h: descriptionHeight,
    });
    captionY += descriptionHeight;
  }
  if (sourceHeight) {
    image.source = plannedText('image-source', `Source: ${sourceReference}`, {
      x: IMAGE_COLUMN_X, y: captionY, w: IMAGE_COLUMN_WIDTH, h: sourceHeight,
    });
  }
  return image;
}

/**
 * Converts one already-selected content page into a single immutable physical
 * layout plan. The current premium editorial design is preserved exactly; only
 * ownership of geometry moves from the renderer into this planner.
 */
export function createContentSlideRenderPlan(
  blocks: LectureBlock[],
  input: ContentSlidePlanningInput,
): ContentSlideRenderPlan {
  const imageBlock = blocks.find((block): block is ImageBlock => block.type === 'image');
  const nonImageBlocks = blocks.filter((block) => block.type !== 'image');
  const textWidth = imageBlock ? TEXT_WIDTH_WITH_IMAGE : CONTENT_WIDTH;
  const hasTitle = input.isFirstPage && Boolean(input.slideTitle.trim());
  const hasSubtitle = input.isFirstPage && Boolean(richTextToPlain(input.slideSubtitle).trim());
  const contentStartY = getContentYStart(hasTitle, hasSubtitle);

  const plan: ContentSlideRenderPlan = {
    kind: 'content',
    sourceSlideId: input.sourceSlideId,
    pageIndex: input.pageIndex,
    sectionTitle: input.sectionTitle,
    isFirstPage: input.isFirstPage,
    layout: imageBlock ? 'text-image' : 'text',
    contentBounds: {
      x: CONTENT_X,
      y: contentStartY,
      w: CONTENT_WIDTH,
      h: SAFE_BOTTOM - contentStartY,
    },
    blocks: [],
  };

  if (hasTitle) {
    const titleY = getContentYStart(false, false);
    plan.title = plannedText('title', input.slideTitle, {
      x: CONTENT_X,
      y: titleY,
      w: Math.min(CONTENT_WIDTH, 8.5),
      h: THEME.TITLE_HEIGHT,
    });
    plan.titleRule = {
      role: 'title-rule',
      box: { x: CONTENT_X, y: titleY + THEME.TITLE_HEIGHT + 0.03, w: 1.12, h: 0 },
    };
  }

  if (hasSubtitle) {
    plan.subtitle = plannedText('subtitle', input.slideSubtitle, {
      x: CONTENT_X,
      y: getContentYStart(hasTitle, false),
      w: Math.min(textWidth, 8.4),
      h: THEME.SUBTITLE_HEIGHT,
    });
  }

  if (imageBlock) {
    plan.image = planImage(imageBlock, contentStartY, nonImageBlocks.length > 0);
  }

  let currentY = contentStartY;
  if (imageBlock && nonImageBlocks.length === 0) {
    const label = richTextToPlain(imageBlock.label).trim();
    const description = richTextToPlain(imageBlock.description).trim();
    if (label) {
      plan.imageCompanionLabel = plannedText('image-companion-label', imageBlock.label, {
        x: CONTENT_X, y: currentY, w: textWidth, h: 0.72,
      });
      currentY += 0.9;
    }
    if (description) {
      plan.imageCompanionDescription = plannedText('image-companion-description', imageBlock.description, {
        x: CONTENT_X, y: currentY, w: textWidth, h: 1.5,
      });
    }
  }

  for (const block of nonImageBlocks) {
    const height = Math.max(0.1, estimateBlockHeight(block, textWidth) - THEME.BLOCK_GAP);
    const item: PlannedContentBlock = {
      block,
      box: blockBox(block, currentY, textWidth, height),
    };
    plan.blocks.push(item);
    currentY += height + THEME.BLOCK_GAP;
  }

  assertValidContentSlideRenderPlan(plan);
  return plan;
}
