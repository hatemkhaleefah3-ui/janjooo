import PptxGenJS from 'pptxgenjs';
import { describe, expect, it } from 'vitest';
import { createContentSlideRenderPlan } from '../layout/plan-content-slide';
import { bottom, validateContentSlideRenderPlan } from '../layout/slide-render-plan';
import { validatePresentationGeometry } from '../renderer/geometry-validation';
import { renderContentSlide } from '../renderer/render-content-slide';
import { CONTENT_X, IMAGE_COLUMN_X, SAFE_BOTTOM, TEXT_WIDTH_WITH_IMAGE } from '../template/geometry';
import { THEME } from '../template/theme';
import type { LectureBlock } from '../schema/lecture-types';

function planningInput() {
  return {
    sourceSlideId: 'source-slide',
    pageIndex: 0,
    slideTitle: 'Amino acid metabolism',
    titleDefinition: 'A focused definition that explains the title across two to three readable lines.',
    slideSubtitle: 'Integrated teaching content and image evidence',
    subtitleDefinition: 'The related evidence and teaching details shown beneath the title.',
    isFirstPage: true,
    sectionTitle: 'Metabolic functions',
  } as const;
}

function mixedBlocks(): LectureBlock[] {
  return [
    {
      blockId: 'paragraph',
      type: 'paragraph',
      text: 'Glycine participates in biosynthesis, neurotransmission, and one-carbon metabolism.',
      sourceReferences: ['p1'],
    },
    {
      blockId: 'image',
      type: 'image',
      slotId: 'glycine-pathway',
      label: 'Glycine pathway evidence',
      description: 'A pathway figure supporting the related teaching point.',
      important: true,
      sourceReference: 'p1',
      fit: 'contain',
      preferredAspect: 'wide',
      sourceReferences: ['p1'],
    },
  ];
}

describe('immutable content slide render plan', () => {
  it('preserves the approved editorial layout while owning every content box', () => {
    const plan = createContentSlideRenderPlan(mixedBlocks(), planningInput());

    expect(plan.layout).toBe('text-companion');
    expect(plan.title?.box.x).toBe(CONTENT_X);
    expect(plan.titleRule?.box.w).toBe(1.12);
    expect(plan.image?.box.x).toBe(IMAGE_COLUMN_X);
    expect(plan.blocks[0].box.w).toBeLessThanOrEqual(TEXT_WIDTH_WITH_IMAGE);
    expect(validateContentSlideRenderPlan(plan)).toEqual([]);

    const boxes = [
      plan.contentBounds,
      plan.title?.box,
      plan.titleRule?.box,
      plan.titleDefinition?.box,
      plan.subtitle?.box,
      plan.subtitleDefinition?.box,
      ...plan.blocks.map((item) => item.box),
      plan.image?.box,
      plan.image?.label?.box,
      plan.image?.description?.box,
      plan.image?.source?.box,
    ].filter((box): box is NonNullable<typeof box> => Boolean(box));
    expect(boxes.every((box) => bottom(box) <= SAFE_BOTTOM + 0.001)).toBe(true);
  });

  it('moves the rule definitions subtitle and body below a wrapped slide title', () => {
    const plan = createContentSlideRenderPlan(mixedBlocks(), {
      ...planningInput(),
      slideTitle: 'Biosynthesis of specialized products from tyrosine and their clinical significance',
    });

    expect(plan.title).toBeDefined();
    expect(plan.titleRule).toBeDefined();
    expect(plan.titleDefinition).toBeDefined();
    expect(plan.subtitle).toBeDefined();
    expect(plan.title!.box.h).toBeGreaterThan(THEME.TITLE_HEIGHT);
    expect(plan.titleRule!.box.y - bottom(plan.title!.box)).toBeCloseTo(2 / 96, 8);
    expect(plan.titleDefinition!.box.y - plan.titleRule!.box.y).toBeCloseTo(2 / 96, 8);
    expect(plan.subtitle!.box.y).toBeGreaterThan(plan.titleDefinition!.box.y);
    expect(plan.blocks[0].box.y).toBeGreaterThanOrEqual(bottom(plan.subtitleDefinition!.box));
    expect(validateContentSlideRenderPlan(plan)).toEqual([]);
  });

  it('renders the exact plan without introducing geometry overflow', () => {
    const plan = createContentSlideRenderPlan(mixedBlocks(), planningInput());
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'JANG_WIDE_TEST', width: 13.33, height: 7.5 });
    pptx.layout = 'JANG_WIDE_TEST';
    const warnings: string[] = [];

    renderContentSlide(pptx, plan, {}, warnings);

    const geometry = validatePresentationGeometry(pptx);
    expect(geometry.checkedObjects).toBeGreaterThan(0);
    expect(geometry.violations).toEqual([]);
  });

  it('rejects a plan whose physical box crosses the safe content boundary', () => {
    const plan = createContentSlideRenderPlan(mixedBlocks(), planningInput());
    const invalid = {
      ...plan,
      blocks: plan.blocks.map((item, index) => index === 0
        ? { ...item, box: { ...item.box, y: SAFE_BOTTOM, h: 1 } }
        : item),
    };

    expect(validateContentSlideRenderPlan(invalid).some((message) => message.includes('safe bottom'))).toBe(true);
  });
});
