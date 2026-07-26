import { describe, expect, it } from 'vitest';
import { planLectureSlide } from '../layout/plan-lecture-slide';
import { validateContentSlideRenderPlan } from '../layout/slide-render-plan';
import { richTextToPlain } from '../renderer/rich-text';
import type { LectureBlock, LectureSlide } from '../schema/lecture-types';

function makeSlide(blocks: LectureBlock[]): LectureSlide {
  return {
    slideId: 'planned-slide',
    slideTitle: 'Metabolic integration',
    slideSubtitle: 'A coherent explanation with supporting visual evidence',
    sourceReferences: ['p1', 'p2'],
    blocks,
  };
}

function image(blockId: string, slotId: string): LectureBlock {
  return {
    blockId,
    type: 'image',
    slotId,
    label: `Evidence ${slotId}`,
    description: 'Supporting visual evidence for the surrounding explanation.',
    important: true,
    sourceReference: 'p2',
    fit: 'contain',
    preferredAspect: 'wide',
    sourceReferences: ['p2'],
  };
}

describe('planLectureSlide', () => {
  it('makes complete immutable plans the authority for page boundaries', () => {
    const fragments = planLectureSlide(makeSlide([
      {
        blockId: 'intro',
        type: 'paragraph',
        text: 'Glycine connects biosynthesis, neurotransmission, and one-carbon metabolism. '.repeat(36),
        sourceReferences: ['p1'],
      },
      image('evidence', 'glycine-evidence'),
      {
        blockId: 'interpretation',
        type: 'paragraph',
        text: 'The image should remain close to the interpretation without forcing any object past the footer.',
        sourceReferences: ['p2'],
      },
    ]), 'Metabolic functions');

    const plans = fragments.filter((fragment) => fragment.type === 'content').map((fragment) => fragment.plan);
    expect(plans.length).toBeGreaterThan(1);
    expect(plans[0].title?.text).toBe('Metabolic integration');
    expect(plans.slice(1).every((plan) => plan.title === undefined && plan.subtitle === undefined)).toBe(true);
    expect(plans.every((plan) => validateContentSlideRenderPlan(plan).length === 0)).toBe(true);
    expect(plans.filter((plan) => plan.image).length).toBe(1);
  });

  it('preserves every paragraph character across semantic continuations', () => {
    const source = Array.from({ length: 220 }, (_, index) => `Sentence ${index} explains a pathway relationship. `).join('');
    const fragments = planLectureSlide(makeSlide([
      { blockId: 'long', type: 'paragraph', text: source, sourceReferences: ['p1'] },
    ]), 'Pathway');

    const reconstructed = fragments
      .filter((fragment) => fragment.type === 'content')
      .flatMap((fragment) => fragment.plan.blocks)
      .filter((item) => item.block.type === 'paragraph')
      .map((item) => item.block.type === 'paragraph' ? richTextToPlain(item.block.text) : '')
      .join('');

    expect(reconstructed).toBe(source);
    expect(fragments.length).toBeGreaterThan(1);
  });

  it('keeps at most one inline image in each planned content page', () => {
    const fragments = planLectureSlide(makeSlide([
      image('image-a', 'a'),
      { blockId: 'text-a', type: 'paragraph', text: 'Explanation A.', sourceReferences: ['p1'] },
      image('image-b', 'b'),
      { blockId: 'text-b', type: 'paragraph', text: 'Explanation B.', sourceReferences: ['p2'] },
    ]), 'Images');

    const plans = fragments.filter((fragment) => fragment.type === 'content').map((fragment) => fragment.plan);
    expect(plans.filter((plan) => plan.image).length).toBe(2);
    expect(plans.every((plan) => plan.image === undefined || plan.layout === 'text-image')).toBe(true);
  });

  it('keeps full images, wide tables, and large diagrams on specialized renderers', () => {
    const fragments = planLectureSlide(makeSlide([
      {
        blockId: 'full-image', type: 'image', slotId: 'full', label: 'Full image', description: '',
        important: true, sourceReference: 'p1', fit: 'contain', preferredAspect: 'full', sourceReferences: ['p1'],
      },
      {
        blockId: 'wide-table', type: 'table', label: 'Wide table', headers: ['A', 'B', 'C', 'D'],
        rows: [['1', '2', '3', '4']], sourceReferences: ['p1'],
      },
      {
        blockId: 'large-diagram', type: 'diagram', label: 'Large diagram',
        diagramRows: [['A', 'B', 'C'], ['D', 'E']], sourceReferences: ['p2'],
      },
    ]), 'Specialized');

    expect(fragments.map((fragment) => fragment.type)).toEqual([
      'image',
      'dedicated-table',
      'dedicated-diagram',
    ]);
  });
});
