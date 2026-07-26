import PptxGenJS from 'pptxgenjs';
import { describe, expect, it } from 'vitest';
import { createContentSlideRenderPlan, selectRightSideCompanion } from '../layout/plan-content-slide';
import { planLectureSlide } from '../layout/plan-lecture-slide';
import { planPresentation } from '../layout/plan-presentation';
import { bottom, validateContentSlideRenderPlan } from '../layout/slide-render-plan';
import { TITLE_RULE_GAP } from '../layout/title-spacing';
import { effectiveImageFit } from '../renderer/render-image';
import { renderContentSlide } from '../renderer/render-content-slide';
import { validatePresentationGeometry } from '../renderer/geometry-validation';
import { CONTENT_WIDTH, CONTENT_X } from '../template/geometry';
import type { LectureBlock, LectureDocument, LectureSlide } from '../schema/lecture-types';

const input = {
  sourceSlideId: 'source',
  pageIndex: 0,
  slideTitle: 'A title that may wrap across two lines in the approved editorial composition',
  titleDefinition: 'A short definition of the title and the teaching purpose of the topic.',
  slideSubtitle: 'Mechanistic sub-title',
  subtitleDefinition: 'A concise explanation placed directly below the sub-title.',
  isFirstPage: true,
  sectionTitle: 'Metabolic integration',
} as const;

function paragraph(id = 'p', text = 'A concise explanatory paragraph.'): LectureBlock {
  return { blockId: id, type: 'paragraph', text, sourceReferences: ['p1'] };
}

function image(): LectureBlock {
  return {
    blockId: 'image', type: 'image', slotId: 'slot', label: 'Clinical photograph',
    description: 'A safely croppable clinical photograph.', important: true,
    sourceReference: 'p1', fit: 'contain', visualType: 'photo', preferredAspect: 'wide', sourceReferences: ['p1'],
  };
}

function table(): LectureBlock {
  return {
    blockId: 'table', type: 'table', label: 'Comparison', headers: ['A', 'B'], rows: [['1', '2']], sourceReferences: ['p1'],
  };
}

function list(): LectureBlock {
  return { blockId: 'list', type: 'bullets', items: ['One', 'Two'], sourceReferences: ['p1'] };
}

function note(): LectureBlock {
  return { blockId: 'note', type: 'callout', label: 'Remember', text: 'Important note.', tone: 'note', sourceReferences: ['p1'] };
}

describe('issue #29 hierarchical lecture layout', () => {
  it('places every title rule exactly three pixels below the measured title', () => {
    const plan = createContentSlideRenderPlan([paragraph()], input);
    expect(plan.title).toBeDefined();
    expect(plan.titleRule).toBeDefined();
    expect(plan.titleRule!.box.y - bottom(plan.title!.box)).toBeCloseTo(TITLE_RULE_GAP, 8);

    const inline = createContentSlideRenderPlan([
      paragraph('before'),
      { blockId: 'next-title', type: 'title', text: 'A second logical title', definition: 'Definition for the second title.', sourceReferences: ['p2'] },
      paragraph('after'),
    ], { ...input, slideTitle: '', titleDefinition: '', slideSubtitle: '', subtitleDefinition: '' });
    const titleBlock = inline.blocks.find((item) => item.block.type === 'title')!;
    expect(titleBlock.ruleBox!.y - bottom(titleBlock.textBox!)).toBeCloseTo(TITLE_RULE_GAP, 8);
    expect(titleBlock.definitionBox!.y).toBeGreaterThan(titleBlock.ruleBox!.y);
  });

  it('selects the right companion by image, table, list, then note', () => {
    const blocks = [paragraph(), note(), list(), table(), image()];
    expect(selectRightSideCompanion(blocks)?.type).toBe('image');
    expect(selectRightSideCompanion(blocks.filter((block) => block.type !== 'image'))?.type).toBe('table');
    expect(selectRightSideCompanion([paragraph(), note(), list()])?.type).toBe('bullets');
    expect(selectRightSideCompanion([paragraph(), note()])?.type).toBe('callout');
  });

  it('uses the full content width when no supported companion exists', () => {
    const plan = createContentSlideRenderPlan([paragraph()], {
      ...input,
      slideTitle: 'Full-width topic',
    });
    expect(plan.layout).toBe('text');
    expect(plan.blocks[0].box.x).toBe(CONTENT_X);
    expect(plan.blocks[0].box.w).toBeCloseTo(CONTENT_WIDTH, 6);
    expect(plan.companion).toBeUndefined();
    expect(plan.image).toBeUndefined();
  });

  it('keeps final normal-slide utilization between 60% and 100%', () => {
    const plan = createContentSlideRenderPlan([paragraph()], input);
    expect(plan.naturalUtilization).toBeLessThan(plan.utilization);
    expect(plan.utilization).toBeGreaterThanOrEqual(0.6 - 0.001);
    expect(plan.utilization).toBeLessThanOrEqual(1 + 0.001);
    expect(validateContentSlideRenderPlan(plan)).toEqual([]);
  });

  it('starts a new physical slide for a title after more than 50% prior use', () => {
    const slide: LectureSlide = {
      slideId: 'title-boundary', slideTitle: '', slideSubtitle: '', sourceReferences: ['p1'],
      blocks: [
        paragraph('long', 'Detailed pathway explanation and clinical qualification. '.repeat(18)),
        { blockId: 'new-title', type: 'title', text: 'New logical title', definition: 'Definition of the new title.', sourceReferences: ['p2'] },
        paragraph('tail', 'Related explanation after the title.'),
      ],
    };
    const plans = planLectureSlide(slide, 'Section').filter((fragment) => fragment.type === 'content');
    const titlePlanIndex = plans.findIndex((fragment) =>
      fragment.plan.blocks.some((item) => item.block.type === 'title'));
    expect(titlePlanIndex).toBeGreaterThan(0);
    expect(plans[titlePlanIndex - 1].plan.naturalUtilization).toBeGreaterThan(0.5);
    expect(plans[titlePlanIndex].plan.blocks[0].block.type).toBe('title');
  });

  it('allows a title to remain mid-slide after 50% or less prior use', () => {
    const slide: LectureSlide = {
      slideId: 'title-inline', slideTitle: '', slideSubtitle: '', sourceReferences: ['p1'],
      blocks: [
        paragraph('short', 'Short introductory context.'),
        { blockId: 'new-title', type: 'title', text: 'New logical title', definition: 'Definition of the new title.', sourceReferences: ['p2'] },
        paragraph('tail', 'Related explanation after the title.'),
      ],
    };
    const plans = planLectureSlide(slide, 'Section').filter((fragment) => fragment.type === 'content');
    expect(plans[0].plan.blocks.some((item) => item.block.type === 'title')).toBe(true);
  });

  it('forces overview key terms to the ordered section titles', () => {
    const lecture: LectureDocument = {
      schemaVersion: '1.1', documentTitle: 'Lecture', direction: 'ltr',
      overview: { title: 'Overview', introduction: 'Introduction', keyPoints: ['Wrong generated term'] },
      sections: [
        { sectionId: 'a', sectionTitle: 'First section', slides: [{ slideId: 'a1', slideTitle: 'A', slideSubtitle: '', sourceReferences: [], blocks: [paragraph()] }] },
        { sectionId: 'b', sectionTitle: 'Second section', slides: [{ slideId: 'b1', slideTitle: 'B', slideSubtitle: '', sourceReferences: [], blocks: [paragraph('p2')] }] },
      ],
      endNote: 'Questions',
    };
    const overview = planPresentation(lecture).slides.find((slide) => slide.type === 'overview');
    expect(overview?.type).toBe('overview');
    if (overview?.type === 'overview') expect(overview.lecture.overview.keyPoints).toEqual(['First section', 'Second section']);
  });

  it('crops photos to fill but protects information-bearing figures', () => {
    const photo = image();
    if (photo.type !== 'image') throw new Error('Expected image');
    expect(effectiveImageFit(photo)).toBe('cover');
    expect(effectiveImageFit({ ...photo, visualType: 'pathway', fit: 'cover' })).toBe('contain');
    expect(effectiveImageFit({ ...photo, visualType: 'radiology', fit: 'cover' })).toBe('contain');
  });

  it('renders definitions, colored bands, and companion geometry without overflow', () => {
    const plan = createContentSlideRenderPlan([paragraph(), list()], input);
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'JANG_29', width: 13.33, height: 7.5 });
    pptx.layout = 'JANG_29';
    renderContentSlide(pptx, plan, {}, []);
    expect(validatePresentationGeometry(pptx).violations).toEqual([]);
  });
});
