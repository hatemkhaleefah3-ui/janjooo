import { THEME } from '../template/theme';
import {
  CONTENT_X,
  CONTENT_WIDTH,
  CONTENT_Y_AFTER_HEADER,
  IMAGE_COLUMN_WIDTH,
  IMAGE_COLUMN_X,
  SAFE_BOTTOM,
  TEXT_WIDTH_WITH_IMAGE,
} from '../template/geometry';
import type {
  ImageBlock,
  LectureBlock,
  RichText,
  SubtitleBlock,
  TitleBlock,
} from '../schema/lecture-types';
import { estimateBlockHeight } from '../renderer/paginate-content';
import { richTextToPlain } from '../renderer/rich-text';
import { CONTENT_GAP, measureTextBoxHeight, ruleYAfterTitle } from './title-spacing';
import {
  assertValidContentSlideRenderPlan,
  bottom,
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
  titleDefinition?: RichText;
  slideSubtitle: RichText;
  subtitleDefinition?: RichText;
  isFirstPage: boolean;
  sectionTitle: string;
}

export interface ContentHeadingMetrics {
  hasTitle: boolean;
  hasTitleDefinition: boolean;
  hasSubtitle: boolean;
  hasSubtitleDefinition: boolean;
  titleY: number;
  titleWidth: number;
  titleHeight: number;
  titleRuleY: number;
  titleDefinitionY: number;
  titleDefinitionHeight: number;
  subtitleY: number;
  subtitleHeight: number;
  subtitleDefinitionY: number;
  subtitleDefinitionHeight: number;
  contentStartY: number;
}

const TITLE_DEFINITION_GAP = CONTENT_GAP;
const HEADING_SECTION_GAP = CONTENT_GAP;
const SUBTITLE_DEFINITION_GAP = CONTENT_GAP;
const MIN_CONTENT_UTILIZATION = 0.6;

function plannedText(role: PlannedTextElement['role'], text: RichText, box: LayoutBox): PlannedTextElement {
  return { role, text, box };
}

function hasText(value: RichText | undefined): boolean {
  return Boolean(value && richTextToPlain(value).trim());
}

/**
 * Measures the complete title / definition / sub-title / definition stack.
 * Pagination and rendering use these exact values, so one-, two-, three-, or
 * four-line headings keep the decorative rule exactly two pixels below the
 * final rendered line.
 */
export function measureContentHeading(
  input: ContentSlidePlanningInput,
  textWidth: number,
): ContentHeadingMetrics {
  const hasTitle = input.isFirstPage && Boolean(input.slideTitle.trim());
  const hasTitleDefinition = hasTitle && hasText(input.titleDefinition);
  const hasSubtitle = input.isFirstPage && hasText(input.slideSubtitle);
  const hasSubtitleDefinition = hasSubtitle && hasText(input.subtitleDefinition);
  const titleY = CONTENT_Y_AFTER_HEADER;
  const titleWidth = Math.min(CONTENT_WIDTH, 8.8);
  const titleHeight = hasTitle
    ? measureTextBoxHeight(
      input.slideTitle,
      titleWidth,
      THEME.FONT_SLIDE_TITLE,
      THEME.TITLE_HEIGHT,
      1.5,
      0.05,
    )
    : 0;
  const titleRuleY = hasTitle ? ruleYAfterTitle(titleY, titleHeight) : titleY;
  const titleDefinitionY = hasTitle ? titleRuleY + TITLE_DEFINITION_GAP : titleY;
  const titleDefinitionHeight = hasTitleDefinition
    ? measureTextBoxHeight(
      input.titleDefinition!,
      Math.min(textWidth, 9.4),
      THEME.FONT_CALLOUT_TEXT,
      0.52,
      0.82,
      0.02,
    )
    : 0;
  const afterTitleY = hasTitle
    ? titleDefinitionY + titleDefinitionHeight + HEADING_SECTION_GAP
    : titleY;
  const subtitleY = afterTitleY;
  const subtitleHeight = hasSubtitle
    ? measureTextBoxHeight(
      input.slideSubtitle,
      Math.min(textWidth, 8.8),
      THEME.FONT_SLIDE_SUBTITLE,
      THEME.SUBTITLE_HEIGHT,
      0.78,
      0.03,
    )
    : 0;
  const subtitleDefinitionY = subtitleY + subtitleHeight + SUBTITLE_DEFINITION_GAP;
  const subtitleDefinitionHeight = hasSubtitleDefinition
    ? measureTextBoxHeight(
      input.subtitleDefinition!,
      Math.min(textWidth, 9.4),
      THEME.FONT_CALLOUT_TEXT,
      0.3,
      0.78,
      0.02,
    )
    : 0;
  const contentStartY = hasSubtitle
    ? subtitleDefinitionY + subtitleDefinitionHeight + THEME.SUBTITLE_GAP
    : afterTitleY;

  return {
    hasTitle,
    hasTitleDefinition,
    hasSubtitle,
    hasSubtitleDefinition,
    titleY,
    titleWidth,
    titleHeight,
    titleRuleY,
    titleDefinitionY,
    titleDefinitionHeight,
    subtitleY,
    subtitleHeight,
    subtitleDefinitionY,
    subtitleDefinitionHeight,
    contentStartY,
  };
}

/**
 * Images have first priority for the right column. A table may use the right
 * column only when another explanatory block can occupy the left. Lists,
 * numbered lists, and notes always remain in the normal left reading flow.
 */
export function selectRightSideCompanion(blocks: LectureBlock[]): LectureBlock | undefined {
  const image = blocks.find((block) => block.type === 'image');
  if (image) return image;

  const table = blocks.find((block) => block.type === 'table');
  return table && blocks.some((block) => block !== table) ? table : undefined;
}

function ordinaryBlockBox(block: LectureBlock, currentY: number, textWidth: number, height: number): LayoutBox {
  switch (block.type) {
    case 'title':
    case 'subtitle':
    case 'paragraph':
    case 'bullets':
    case 'numbered':
    case 'callout':
    case 'table':
    case 'diagram':
      return { x: CONTENT_X, y: currentY, w: textWidth, h: height };
    case 'image':
      throw new Error('Image blocks are planned in the companion column, not the vertical text flow.');
  }
}

function planHeadingBlock(
  block: TitleBlock | SubtitleBlock,
  currentY: number,
  textWidth: number,
): PlannedContentBlock {
  if (block.type === 'title') {
    const titleHeight = measureTextBoxHeight(
      block.text,
      textWidth,
      THEME.FONT_SLIDE_TITLE,
      0.48,
      1.25,
      0.04,
    );
    const ruleY = ruleYAfterTitle(currentY, titleHeight);
    const definitionY = ruleY + TITLE_DEFINITION_GAP;
    const definitionHeight = hasText(block.definition)
      ? measureTextBoxHeight(block.definition!, textWidth, THEME.FONT_CALLOUT_TEXT, 0.52, 0.82, 0.02)
      : 0;
    const totalHeight = definitionY + definitionHeight + HEADING_SECTION_GAP - currentY;
    return {
      block,
      box: { x: CONTENT_X, y: currentY, w: textWidth, h: totalHeight },
      textBox: { x: CONTENT_X, y: currentY, w: textWidth, h: titleHeight },
      ruleBox: { x: CONTENT_X, y: ruleY, w: 1.12, h: 0 },
      ...(definitionHeight > 0
        ? { definitionBox: { x: CONTENT_X, y: definitionY, w: textWidth, h: definitionHeight } }
        : {}),
    };
  }

  const subtitleHeight = measureTextBoxHeight(
    block.text,
    textWidth,
    THEME.FONT_SUBTITLE_BLOCK,
    THEME.H_SUBTITLE_BLOCK,
    0.82,
    0.03,
  );
  const definitionY = currentY + subtitleHeight + SUBTITLE_DEFINITION_GAP;
  const definitionHeight = hasText(block.definition)
    ? measureTextBoxHeight(block.definition!, textWidth, THEME.FONT_CALLOUT_TEXT, 0.3, 0.78, 0.02)
    : 0;
  const totalHeight = definitionY + definitionHeight + THEME.BLOCK_GAP - currentY;
  return {
    block,
    box: { x: CONTENT_X, y: currentY, w: textWidth, h: totalHeight },
    textBox: { x: CONTENT_X, y: currentY, w: textWidth, h: subtitleHeight },
    ...(definitionHeight > 0
      ? { definitionBox: { x: CONTENT_X, y: definitionY, w: textWidth, h: definitionHeight } }
      : {}),
  };
}

function planFlowBlock(block: LectureBlock, currentY: number, textWidth: number): PlannedContentBlock {
  if (block.type === 'title' || block.type === 'subtitle') {
    return planHeadingBlock(block, currentY, textWidth);
  }
  const height = Math.max(0.1, estimateBlockHeight(block, textWidth) - THEME.BLOCK_GAP);
  return { block, box: ordinaryBlockBox(block, currentY, textWidth, height) };
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
  const captionReserve = labelHeight + descriptionHeight + sourceHeight + (hasCaption ? CONTENT_GAP : 0);
  const imageAreaH = Math.max(1.2, SAFE_BOTTOM - imageAreaY - captionReserve);
  const image: PlannedImageElement = {
    block: imageBlock,
    box: { x: IMAGE_COLUMN_X, y: imageAreaY, w: IMAGE_COLUMN_WIDTH, h: imageAreaH },
  };

  let captionY = imageAreaY + imageAreaH + CONTENT_GAP;
  if (labelHeight) {
    image.label = plannedText('image-label', imageBlock.label, {
      x: IMAGE_COLUMN_X, y: captionY, w: IMAGE_COLUMN_WIDTH, h: labelHeight,
    });
    captionY += labelHeight + CONTENT_GAP;
  }
  if (descriptionHeight) {
    image.description = plannedText('image-description', imageBlock.description, {
      x: IMAGE_COLUMN_X, y: captionY, w: IMAGE_COLUMN_WIDTH, h: descriptionHeight,
    });
    captionY += descriptionHeight + CONTENT_GAP;
  }
  if (sourceHeight) {
    image.source = plannedText('image-source', `Source: ${sourceReference}`, {
      x: IMAGE_COLUMN_X, y: captionY, w: IMAGE_COLUMN_WIDTH, h: sourceHeight,
    });
  }
  return image;
}

function plannedBottom(plan: ContentSlideRenderPlan): number {
  const candidates = [plan.contentBounds.y];
  for (const item of plan.blocks) candidates.push(bottom(item.box));
  if (plan.companion) candidates.push(bottom(plan.companion.box));
  if (plan.image) {
    candidates.push(bottom(plan.image.box));
    if (plan.image.label) candidates.push(bottom(plan.image.label.box));
    if (plan.image.description) candidates.push(bottom(plan.image.description.box));
    if (plan.image.source) candidates.push(bottom(plan.image.source.box));
  }
  if (plan.imageCompanionLabel) candidates.push(bottom(plan.imageCompanionLabel.box));
  if (plan.imageCompanionDescription) candidates.push(bottom(plan.imageCompanionDescription.box));
  return Math.max(...candidates);
}

/**
 * Keeps inherently short pages above the 60% minimum without changing wording,
 * order, classification, or font size. Compaction remains the preferred way to
 * reach the approximately 90% target with real content.
 */
function expandSparsePlan(plan: ContentSlideRenderPlan): void {
  const targetBottom = plan.contentBounds.y + plan.contentBounds.h * MIN_CONTENT_UTILIZATION;
  let currentBottom = plannedBottom(plan);
  let extra = targetBottom - currentBottom;
  if (extra <= 0.001) return;

  if (plan.blocks.length >= 2) {
    const step = extra / (plan.blocks.length - 1);
    plan.blocks.forEach((item, index) => {
      if (index === 0) return;
      const shift = step * index;
      item.box.y += shift;
      if (item.textBox) item.textBox.y += shift;
      if (item.ruleBox) item.ruleBox.y += shift;
      if (item.definitionBox) item.definitionBox.y += shift;
    });
  } else if (plan.blocks.length === 1) {
    plan.blocks[0].box.h += extra;
  } else if (plan.companion) {
    plan.companion.box.h += extra;
  } else if (plan.imageCompanionDescription) {
    plan.imageCompanionDescription.box.h += extra;
  }

  currentBottom = plannedBottom(plan);
  extra = targetBottom - currentBottom;
  if (extra <= 0.001) return;
  if (plan.blocks.length > 0) plan.blocks[plan.blocks.length - 1].box.h += extra;
  else if (plan.companion) plan.companion.box.h += extra;
  else if (plan.imageCompanionDescription) plan.imageCompanionDescription.box.h += extra;
}

/**
 * Converts one already-selected content page into one immutable physical plan.
 * The right side is reserved only for an image or a supported table companion;
 * lists and notes remain in the normal left reading flow.
 */
export function createContentSlideRenderPlan(
  blocks: LectureBlock[],
  input: ContentSlidePlanningInput,
): ContentSlideRenderPlan {
  const selectedCompanion = selectRightSideCompanion(blocks);
  const imageBlock = selectedCompanion?.type === 'image' ? selectedCompanion : undefined;
  const companionBlock = selectedCompanion && selectedCompanion.type !== 'image'
    ? selectedCompanion
    : undefined;
  const flowBlocks = selectedCompanion
    ? blocks.filter((block) => block !== selectedCompanion)
    : [...blocks];
  const hasCompanion = Boolean(selectedCompanion);
  const textWidth = hasCompanion ? TEXT_WIDTH_WITH_IMAGE : CONTENT_WIDTH;
  const heading = measureContentHeading(input, textWidth);
  const contentStartY = heading.contentStartY;

  const plan: ContentSlideRenderPlan = {
    kind: 'content',
    sourceSlideId: input.sourceSlideId,
    pageIndex: input.pageIndex,
    sectionTitle: input.sectionTitle,
    isFirstPage: input.isFirstPage,
    layout: hasCompanion ? 'text-companion' : 'text',
    contentBounds: {
      x: CONTENT_X,
      y: contentStartY,
      w: CONTENT_WIDTH,
      h: SAFE_BOTTOM - contentStartY,
    },
    blocks: [],
    naturalUtilization: 0,
    utilization: 0,
  };

  if (heading.hasTitle) {
    plan.title = plannedText('title', input.slideTitle, {
      x: CONTENT_X,
      y: heading.titleY,
      w: heading.titleWidth,
      h: heading.titleHeight,
    });
    plan.titleRule = {
      role: 'title-rule',
      box: { x: CONTENT_X, y: heading.titleRuleY, w: 1.12, h: 0 },
    };
  }
  if (heading.hasTitleDefinition) {
    plan.titleDefinition = plannedText('title-definition', input.titleDefinition!, {
      x: CONTENT_X,
      y: heading.titleDefinitionY,
      w: Math.min(textWidth, 9.4),
      h: heading.titleDefinitionHeight,
    });
  }
  if (heading.hasSubtitle) {
    plan.subtitle = plannedText('subtitle', input.slideSubtitle, {
      x: CONTENT_X,
      y: heading.subtitleY,
      w: Math.min(textWidth, 8.8),
      h: heading.subtitleHeight,
    });
  }
  if (heading.hasSubtitleDefinition) {
    plan.subtitleDefinition = plannedText('subtitle-definition', input.subtitleDefinition!, {
      x: CONTENT_X,
      y: heading.subtitleDefinitionY,
      w: Math.min(textWidth, 9.4),
      h: heading.subtitleDefinitionHeight,
    });
  }

  if (imageBlock) {
    plan.image = planImage(imageBlock, contentStartY, flowBlocks.length > 0);
  } else if (companionBlock) {
    const height = Math.max(
      0.5,
      estimateBlockHeight(companionBlock, IMAGE_COLUMN_WIDTH) - THEME.BLOCK_GAP,
    );
    plan.companion = {
      block: companionBlock,
      box: { x: IMAGE_COLUMN_X, y: contentStartY, w: IMAGE_COLUMN_WIDTH, h: height },
    };
  }

  let currentY = contentStartY;
  if (imageBlock && flowBlocks.length === 0) {
    const label = richTextToPlain(imageBlock.label).trim();
    const description = richTextToPlain(imageBlock.description).trim();
    if (label) {
      plan.imageCompanionLabel = plannedText('image-companion-label', imageBlock.label, {
        x: CONTENT_X, y: currentY, w: textWidth, h: 0.72,
      });
      currentY += 0.72 + CONTENT_GAP;
    }
    if (description) {
      plan.imageCompanionDescription = plannedText('image-companion-description', imageBlock.description, {
        x: CONTENT_X, y: currentY, w: textWidth, h: 1.5,
      });
    }
  }

  for (const block of flowBlocks) {
    const item = planFlowBlock(block, currentY, textWidth);
    plan.blocks.push(item);
    currentY = bottom(item.box) + THEME.BLOCK_GAP;
  }

  const naturalBottom = plannedBottom(plan);
  plan.naturalUtilization = Math.max(0, (naturalBottom - contentStartY) / Math.max(0.01, plan.contentBounds.h));
  expandSparsePlan(plan);
  const finalBottom = plannedBottom(plan);
  plan.utilization = Math.max(0, (finalBottom - contentStartY) / Math.max(0.01, plan.contentBounds.h));

  assertValidContentSlideRenderPlan(plan);
  return plan;
}
