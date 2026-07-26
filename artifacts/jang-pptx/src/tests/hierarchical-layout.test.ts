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
  titleDefinition: 'A focused explanatory paragraph defining the title and its teaching purpose across two to three readable lines.',
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

describe('dense hierarchical lecture layout', () => {
  it('places every title rule exactly two pixels below the measured last title line', () => {
    const plan = createContentSlideRenderPlan([paragraph()], input);
    expect(plan.title).toBeDefined();
    expect(plan.titleRule).toBeDefined();
    expect(plan.titleRule!.box.y - bottom(plan.title!.box)).toBeCloseTo(TITLE_RULE_GAP, 8);

    const inline = createContentSlideRenderPlan([
      paragraph('before'),
      { blockId: 'next-title', type: 'title', text: 'A second logical title', definition: 'A focused definition for the second title that occupies two to three readable lines.', sourceReferences: ['p2'] },
      paragraph('after'),
    ], { ...input, slideTitle: '', titleDefinition: '', slideSubtitle: '', subtitleDefinition: '' });
    const titleBlock = inline.blocks.find((item) => item.block.type === 'title')!;
    expect(titleBlock.ruleBox!.y - bottom(titleBlock.textBox!)).toBeCloseTo(TITLE_RULE_GAP, 8);
    expect(titleBlock.definitionBox!.y - titleBlock.ruleBox!.y).toBeCloseTo(TITLE_RULE_GAP, 8);
  });

  it('keeps lists and notes in the left flow unless an image or supported table is present', () => {
    const blocks = [paragraph(), note(), list(), table(), image()];
    expect(selectRightSideCompanion(blocks)?.type).toBe('image');
    expect(selectRightSideCompanion(blocks.filter((block) => block.type !== 'image'))?.type).toBe('table');
    expect(selectRightSideCompanion([paragraph(), note(), list()])).toBeUndefined();
    expect(selectRightSideCompanion([note()])).toBeUndefined();
    expect(selectRightSideCompanion([list()])).toBeUndefined();
  });

  it('uses the full content width for list-only and note-only continuation pages', () => {
    for (const block of [list(), note()]) {
      const plan = createContentSlideRenderPlan([block], {
        ...input,
        pageIndex: 1,
        isFirstPage: false,
        slideTitle: '',
        titleDefinition: '',
        slideSubtitle: '',
        subtitleDefinition: '',
      });
      expect(plan.layout).toBe('text');
      expect(plan.blocks[0].box.x).toBe(CONTENT_X);
      expect(plan.blocks[0].box.w).toBeCloseTo(CONTENT_WIDTH, 6);
      expect(plan.companion).toBeUndefined();
      expect(plan.image).toBeUndefined();
    }
  });

  it('keeps final normal-slide utilization between 60% and 100%', () => {
    const plan = createContentSlideRenderPlan([paragraph()], input);
    expect(plan.naturalUtilization).toBeLessThan(plan.utilization);
    expect(plan.utilization).toBeGreaterThanOrEqual(0.6 - 0.001);
    expect(plan.utilization).toBeLessThanOrEqual(1 + 0.001);
    expect(validateContentSlideRenderPlan(plan)).toEqual([]);
  });

  it('starts a new physical slide for a title after more than 90% prior use', () => {
    const slide: LectureSlide = {
      slideId: 'title-boundary', slideTitle: '', slideSubtitle: '', sourceReferences: ['p1'],
      blocks: [
        paragraph('long', 'Detailed pathway explanation and clinical qualification. '.repeat(40)),
        { blockId: 'new-title', type: 'title', text: 'New logical title', definition: 'A focused definition of the new title across two to three lines.', sourceReferences: ['p2'] },
        paragraph('tail', 'Related explanation after the title.'),
      ],
    };
    const plans = planLectureSlide(slide, 'Section').filter((fragment) => fragment.type === 'content');
    const titlePlanIndex = plans.findIndex((fragment) =>
      fragment.plan.blocks.some((item) => item.block.type === 'title'));
    expect(titlePlanIndex).toBeGreaterThan(0);
    expect(plans[titlePlanIndex - 1].plan.naturalUtilization).toBeGreaterThan(0.9);
    expect(plans[titlePlanIndex].plan.blocks.some((item) => item.block.type === 'title')).toBe(true);
  });

  it('allows a title to remain mid-slide at 90% or less prior use', () => {
    const slide: LectureSlide = {
      slideId: 'title-inline', slideTitle: '', slideSubtitle: '', sourceReferences: ['p1'],
      blocks: [
        paragraph('short', 'Short introductory context.'),
        { blockId: 'new-title', type: 'title', text: 'New logical title', definition: 'A focused definition of the new title across two to three lines.', sourceReferences: ['p2'] },
        paragraph('tail', 'Related explanation after the title.'),
      ],
    };
    const plans = planLectureSlide(slide, 'Section').filter((fragment) => fragment.type === 'content');
    expect(plans[0].plan.blocks.some((item) => item.block.type === 'title')).toBe(true);
  });

  it('forces overview key terms to every ordered title, excluding sections and sub-titles', () => {
    const lecture: LectureDocument = {
      schemaVersion: '1.1', documentTitle: 'Lecture', direction: 'ltr',
      overview: { title: 'Overview', introduction: 'Introduction', keyPoints: ['Wrong generated term'] },
      sections: [
        { sectionId: 'a', sectionTitle: 'First section', slides: [{ slideId: 'a1', slideTitle: 'A', slideSubtitle: 'Excluded subtitle', sourceReferences: [], blocks: [paragraph()] }] },
        { sectionId: 'b', sectionTitle: 'Second section', slides: [{ slideId: 'b1', slideTitle: 'B', slideSubtitle: '', sourceReferences: [], blocks: [paragraph('p2'), { blockId: 'inline-title', type: 'title', text: 'C', definition: 'Definition for C.', sourceReferences: [] }] }] },
      ],
      endNote: 'Questions',
    };
    const overview = planPresentation(lecture).slides.find((slide) => slide.type === 'overview');
    expect(overview?.type).toBe('overview');
    if (overview?.type === 'overview') expect(overview.lecture.overview.keyPoints).toEqual(['A', 'B', 'C']);
  });

  it('crops photos to fill but protects information-bearing figures', () => {
    const photo = image();
    if (photo.type !== 'image') throw new Error('Expected image');
    expect(effectiveImageFit(photo)).toBe('cover');
    expect(effectiveImageFit({ ...photo, visualType: 'pathway', fit: 'cover' })).toBe('contain');
    expect(effectiveImageFit({ ...photo, visualType: 'radiology', fit: 'cover' })).toBe('contain');
  });

  it('renders definitions, colored bands, and left-flow lists without overflow', () => {
    const plan = createContentSlideRenderPlan([paragraph(), list()], input);
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'JANG_DENSE', width: 13.33, height: 7.5 });
    pptx.layout = 'JANG_DENSE';
    renderContentSlide(pptx, plan, {}, []);
    expect(plan.layout).toBe('text');
    expect(validatePresentationGeometry(pptx).violations).toEqual([]);
  });
});
