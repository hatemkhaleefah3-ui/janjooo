import { THEME } from '../template/theme';
import { SAFE_BOTTOM } from '../template/geometry';
import type { ImageBlock, LectureBlock, RichText } from '../schema/lecture-types';

export interface LayoutBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type PlannedTextRole =
  | 'title'
  | 'title-definition'
  | 'subtitle'
  | 'subtitle-definition'
  | 'image-label'
  | 'image-description'
  | 'image-source'
  | 'image-companion-label'
  | 'image-companion-description';

export interface PlannedTextElement {
  role: PlannedTextRole;
  text: RichText;
  box: LayoutBox;
}

export interface PlannedRuleElement {
  role: 'title-rule' | 'inline-title-rule';
  box: LayoutBox;
}

export interface PlannedContentBlock {
  block: LectureBlock;
  box: LayoutBox;
  /** Exact nested boxes for title and sub-title groups. */
  textBox?: LayoutBox;
  ruleBox?: LayoutBox;
  definitionBox?: LayoutBox;
}

export interface PlannedImageElement {
  block: ImageBlock;
  box: LayoutBox;
  label?: PlannedTextElement;
  description?: PlannedTextElement;
  source?: PlannedTextElement;
}

/**
 * One immutable content-slide layout contract.
 *
 * The planner owns every content coordinate and dimension. The renderer must
 * consume these boxes without recalculating vertical flow, text-column width,
 * image-caption reserve, or continuation geometry. This keeps pagination,
 * rendering, and validation on the same physical model.
 */
export interface ContentSlideRenderPlan {
  kind: 'content';
  sourceSlideId: string;
  pageIndex: number;
  sectionTitle: string;
  isFirstPage: boolean;
  layout: 'text' | 'text-companion';
  contentBounds: LayoutBox;
  title?: PlannedTextElement;
  titleRule?: PlannedRuleElement;
  titleDefinition?: PlannedTextElement;
  subtitle?: PlannedTextElement;
  subtitleDefinition?: PlannedTextElement;
  blocks: PlannedContentBlock[];
  /** Highest-priority non-image companion placed in the right column. */
  companion?: PlannedContentBlock;
  image?: PlannedImageElement;
  imageCompanionLabel?: PlannedTextElement;
  imageCompanionDescription?: PlannedTextElement;
  /** Natural content utilization before sparse-slide spacing is expanded. */
  naturalUtilization: number;
  /** Final planned utilization of the content area; normal slides target 0.60–1.00. */
  utilization: number;
}

export class SlideRenderPlanError extends Error {
  readonly violations: string[];

  constructor(violations: string[]) {
    super(`Slide render plan is invalid:\n${violations.map((item) => `- ${item}`).join('\n')}`);
    this.name = 'SlideRenderPlanError';
    this.violations = violations;
  }
}

export function right(box: LayoutBox): number {
  return box.x + box.w;
}

export function bottom(box: LayoutBox): number {
  return box.y + box.h;
}

export function boxesOverlap(a: LayoutBox, b: LayoutBox, tolerance = 0.001): boolean {
  return (
    a.x < right(b) - tolerance
    && right(a) > b.x + tolerance
    && a.y < bottom(b) - tolerance
    && bottom(a) > b.y + tolerance
  );
}

function validateBox(box: LayoutBox, label: string, violations: string[], safeBottom = THEME.SLIDE_HEIGHT): void {
  const values = [box.x, box.y, box.w, box.h];
  if (!values.every(Number.isFinite)) {
    violations.push(`${label} contains a non-finite coordinate.`);
    return;
  }
  if (box.w < 0 || box.h < 0) violations.push(`${label} has a negative size.`);
  if (box.x < -0.001) violations.push(`${label} crosses the left slide edge.`);
  if (box.y < -0.001) violations.push(`${label} crosses the top slide edge.`);
  if (right(box) > THEME.SLIDE_WIDTH + 0.001) {
    violations.push(`${label} right=${right(box).toFixed(3)} exceeds slide width ${THEME.SLIDE_WIDTH}.`);
  }
  if (bottom(box) > safeBottom + 0.001) {
    violations.push(`${label} bottom=${bottom(box).toFixed(3)} exceeds safe bottom ${safeBottom}.`);
  }
}

function allPlannedBoxes(plan: ContentSlideRenderPlan): Array<{ label: string; box: LayoutBox; safeBottom: number }> {
  const boxes: Array<{ label: string; box: LayoutBox; safeBottom: number }> = [
    { label: 'content bounds', box: plan.contentBounds, safeBottom: SAFE_BOTTOM },
  ];
  if (plan.title) boxes.push({ label: 'title', box: plan.title.box, safeBottom: SAFE_BOTTOM });
  if (plan.titleRule) boxes.push({ label: 'title rule', box: plan.titleRule.box, safeBottom: SAFE_BOTTOM });
  if (plan.titleDefinition) boxes.push({ label: 'title definition', box: plan.titleDefinition.box, safeBottom: SAFE_BOTTOM });
  if (plan.subtitle) boxes.push({ label: 'subtitle', box: plan.subtitle.box, safeBottom: SAFE_BOTTOM });
  if (plan.subtitleDefinition) boxes.push({ label: 'subtitle definition', box: plan.subtitleDefinition.box, safeBottom: SAFE_BOTTOM });
  plan.blocks.forEach((item, index) => {
    boxes.push({
      label: `block ${index + 1} (${item.block.type}:${item.block.blockId})`,
      box: item.box,
      safeBottom: SAFE_BOTTOM,
    });
    if (item.textBox) boxes.push({ label: `block ${index + 1} text`, box: item.textBox, safeBottom: SAFE_BOTTOM });
    if (item.ruleBox) boxes.push({ label: `block ${index + 1} rule`, box: item.ruleBox, safeBottom: SAFE_BOTTOM });
    if (item.definitionBox) boxes.push({ label: `block ${index + 1} definition`, box: item.definitionBox, safeBottom: SAFE_BOTTOM });
  });
  if (plan.companion) boxes.push({
    label: `companion (${plan.companion.block.type}:${plan.companion.block.blockId})`,
    box: plan.companion.box,
    safeBottom: SAFE_BOTTOM,
  });
  if (plan.image) {
    boxes.push({ label: `image (${plan.image.block.slotId})`, box: plan.image.box, safeBottom: SAFE_BOTTOM });
    if (plan.image.label) boxes.push({ label: 'image label', box: plan.image.label.box, safeBottom: SAFE_BOTTOM });
    if (plan.image.description) boxes.push({ label: 'image description', box: plan.image.description.box, safeBottom: SAFE_BOTTOM });
    if (plan.image.source) boxes.push({ label: 'image source', box: plan.image.source.box, safeBottom: SAFE_BOTTOM });
  }
  if (plan.imageCompanionLabel) boxes.push({
    label: 'image companion label', box: plan.imageCompanionLabel.box, safeBottom: SAFE_BOTTOM,
  });
  if (plan.imageCompanionDescription) boxes.push({
    label: 'image companion description', box: plan.imageCompanionDescription.box, safeBottom: SAFE_BOTTOM,
  });
  return boxes;
}

/** Validates the planner's physical contract before any PowerPoint objects exist. */
export function validateContentSlideRenderPlan(plan: ContentSlideRenderPlan): string[] {
  const violations: string[] = [];
  for (const item of allPlannedBoxes(plan)) validateBox(item.box, item.label, violations, item.safeBottom);

  for (let index = 1; index < plan.blocks.length; index += 1) {
    const previous = plan.blocks[index - 1].box;
    const current = plan.blocks[index].box;
    if (current.y + 0.001 < bottom(previous)) {
      violations.push(`Content blocks ${index} and ${index + 1} overlap or are out of order.`);
    }
  }

  if (plan.layout === 'text-companion') {
    const companionBox = plan.image?.box ?? plan.companion?.box;
    if (companionBox) {
      for (const item of plan.blocks) {
        if (boxesOverlap(item.box, companionBox)) {
          violations.push(`Block ${item.block.blockId} overlaps the companion column.`);
        }
      }
    }
  }

  if (plan.utilization < 0.599 || plan.utilization > 1.001) {
    violations.push(`Content utilization ${plan.utilization.toFixed(3)} is outside the required 0.60–1.00 range.`);
  }

  return violations;
}

export function assertValidContentSlideRenderPlan(plan: ContentSlideRenderPlan): void {
  const violations = validateContentSlideRenderPlan(plan);
  if (violations.length > 0) throw new SlideRenderPlanError(violations);
}
