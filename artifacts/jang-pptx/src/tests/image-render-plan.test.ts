import PptxGenJS from 'pptxgenjs';
import { describe, expect, it } from 'vitest';
import { planDedicatedImageSlide } from '../layout/plan-image-slide';
import { bottom, boxesOverlap, right } from '../layout/slide-render-plan';
import { validatePresentationGeometry } from '../renderer/geometry-validation';
import { renderDedicatedImageSlide } from '../renderer/render-image';
import { THEME } from '../template/theme';
import type { ImageBlock } from '../schema/lecture-types';

function imageBlock(): ImageBlock {
  return {
    blockId: 'full-image',
    type: 'image',
    slotId: 'evidence-image',
    label: 'Phenylalanine and tyrosine pathway',
    description: 'An editable evidence slide with a contained image and explanatory copy.',
    important: true,
    sourceReference: 'p12',
    fit: 'contain',
    preferredAspect: 'full',
    sourceReferences: ['p12'],
  };
}

describe('immutable dedicated image plan', () => {
  it('keeps image bytes independent from the approved page geometry', () => {
    const plan = planDedicatedImageSlide(imageBlock(), 'Aromatic amino acids');

    expect(boxesOverlap(plan.imageBox, plan.labelBox)).toBe(false);
    expect(right(plan.frameBox)).toBeLessThanOrEqual(THEME.SLIDE_WIDTH);
    expect(bottom(plan.frameBox)).toBeLessThanOrEqual(THEME.SLIDE_HEIGHT);
    expect(plan.descriptionBox).toBeDefined();
    expect(plan.sourceBox).toBeDefined();
  });

  it('renders the same valid geometry when the image slot is unfilled', () => {
    const plan = planDedicatedImageSlide(imageBlock(), 'Aromatic amino acids');
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'JANG_IMAGE_TEST', width: 13.33, height: 7.5 });
    pptx.layout = 'JANG_IMAGE_TEST';

    const result = renderDedicatedImageSlide(pptx, plan, {});
    const geometry = validatePresentationGeometry(pptx);

    expect(result.rendered).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(geometry.violations).toEqual([]);
  });
});
