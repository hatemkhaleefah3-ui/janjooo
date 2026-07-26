import PptxGenJS from 'pptxgenjs';
import { describe, expect, it } from 'vitest';
import { planDedicatedDiagramSlides } from '../layout/plan-diagram-slides';
import { bottom, right } from '../layout/slide-render-plan';
import { validatePresentationGeometry } from '../renderer/geometry-validation';
import { renderDedicatedDiagramSlide } from '../renderer/render-diagram';
import { SAFE_BOTTOM } from '../template/geometry';
import { THEME } from '../template/theme';
import type { DiagramBlock } from '../schema/lecture-types';

function diagramBlock(): DiagramBlock {
  return {
    blockId: 'planned-diagram',
    type: 'diagram',
    label: 'Integrated amino acid pathway',
    diagramType: 'metabolic',
    diagramRows: [
      ['Phenylalanine', 'Tyrosine', 'DOPA', 'Dopamine', 'Norepinephrine', 'Epinephrine'],
      ['Glycine', 'Serine', 'One-carbon pool'],
      ['Clinical deficiency', 'Neurologic consequence'],
    ],
    sourceReferences: ['p1'],
  };
}

describe('explicit dedicated diagram plans', () => {
  it('normalizes nodes into editable rows and keeps every box inside the slide', () => {
    const plans = planDedicatedDiagramSlides(diagramBlock(), 'Metabolic pathways');
    const allNodes = plans.flatMap((plan) => plan.nodes);

    expect(allNodes.length).toBe(11);
    expect(plans.every((plan) => plan.nodes.every((node) =>
      bottom(node.box) <= SAFE_BOTTOM + 0.001
      && right(node.box) <= THEME.SLIDE_WIDTH + 0.001,
    ))).toBe(true);
    expect(plans.every((plan) => plan.nodes.filter((node) => node.emphasized).length <= 1)).toBe(true);
  });

  it('renders the planned nodes and connectors without geometry overflow', () => {
    const plan = planDedicatedDiagramSlides(diagramBlock(), 'Metabolic pathways')[0];
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'JANG_DIAGRAM_TEST', width: 13.33, height: 7.5 });
    pptx.layout = 'JANG_DIAGRAM_TEST';

    renderDedicatedDiagramSlide(pptx, plan);

    const geometry = validatePresentationGeometry(pptx);
    expect(geometry.checkedObjects).toBeGreaterThan(plan.nodes.length);
    expect(geometry.violations).toEqual([]);
  });
});
