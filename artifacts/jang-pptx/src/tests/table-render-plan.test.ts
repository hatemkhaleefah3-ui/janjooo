import PptxGenJS from 'pptxgenjs';
import { describe, expect, it } from 'vitest';
import { planDedicatedTableSlides } from '../layout/plan-table-slides';
import { bottom } from '../layout/slide-render-plan';
import { validatePresentationGeometry } from '../renderer/geometry-validation';
import { renderDedicatedTableSlide } from '../renderer/render-table';
import { SAFE_BOTTOM } from '../template/geometry';
import type { TableBlock } from '../schema/lecture-types';

function tableBlock(): TableBlock {
  return {
    blockId: 'measured-table',
    type: 'table',
    label: 'Amino acid pathways and clinical implications',
    tableType: 'comparison',
    headers: ['Pathway', 'Role', 'Clinical interpretation'],
    rows: Array.from({ length: 22 }, (_, index) => [
      `Pathway ${index + 1}`,
      index % 3 === 0
        ? 'A long mechanistic explanation that wraps across several lines and must increase the physical row height.'.repeat(2)
        : 'Concise role',
      `Interpretation ${index + 1}`,
    ]),
    sourceReferences: ['p1'],
  };
}

describe('row-aware dedicated table plans', () => {
  it('paginates by measured wrapped row height and preserves every row', () => {
    const block = tableBlock();
    const plans = planDedicatedTableSlides(block, 'Metabolic functions');

    expect(plans.length).toBeGreaterThan(1);
    expect(plans.flatMap((plan) => plan.rows)).toEqual(block.rows);
    expect(plans.every((plan) => bottom(plan.tableBox) <= SAFE_BOTTOM + 0.001)).toBe(true);
    expect(plans.some((plan) => plan.rowHeights.some((height) => height > 0.38))).toBe(true);
    expect(plans.slice(1).every((plan) => String(plan.label).includes('continued') || Array.isArray(plan.label))).toBe(true);
  });

  it('renders planned table pages without recalculating row heights', () => {
    const plan = planDedicatedTableSlides(tableBlock(), 'Metabolic functions')[0];
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'JANG_TABLE_TEST', width: 13.33, height: 7.5 });
    pptx.layout = 'JANG_TABLE_TEST';

    renderDedicatedTableSlide(pptx, plan);

    const geometry = validatePresentationGeometry(pptx);
    expect(geometry.checkedObjects).toBeGreaterThan(0);
    expect(geometry.violations).toEqual([]);
  });
});
