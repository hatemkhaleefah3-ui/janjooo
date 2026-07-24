import { describe, it, expect } from 'vitest';
import { isDedicatedBlock, estimateBlockHeight } from '../renderer/paginate-content';
import { THEME } from '../template/theme';
import type { DiagramBlock } from '../schema/lecture-types';

function makeDiagram(rows: string[][]): DiagramBlock {
  return {
    blockId: 'dia-test',
    type: 'diagram',
    label: 'Test diagram',
    diagramRows: rows,
    sourceReferences: [],
  };
}

describe('diagram layout decisions', () => {
  it('inline (not dedicated) for <= 4 total nodes', () => {
    expect(isDedicatedBlock(makeDiagram([['A', 'B'], ['C']]))).toBe(false); // 3 nodes
    expect(isDedicatedBlock(makeDiagram([['A'], ['B'], ['C'], ['D']]))).toBe(false); // 4 nodes
    expect(isDedicatedBlock(makeDiagram([['A', 'B', 'C', 'D']]))).toBe(false); // 4 nodes
  });

  it('dedicated slide for > 4 total nodes', () => {
    expect(isDedicatedBlock(makeDiagram([['A', 'B', 'C'], ['D', 'E']]))).toBe(true); // 5 nodes
    expect(isDedicatedBlock(makeDiagram([['A'], ['B'], ['C'], ['D'], ['E']]))).toBe(true); // 5 nodes
    expect(isDedicatedBlock(makeDiagram([['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']]))).toBe(true);
  });

  it('height estimate scales with row count', () => {
    const small = makeDiagram([['A'], ['B']]);
    const large = makeDiagram([['A'], ['B'], ['C'], ['D']]);
    expect(estimateBlockHeight(large)).toBeGreaterThan(estimateBlockHeight(small));
  });

  it('height includes label height', () => {
    const dia = makeDiagram([['NodeA', 'NodeB']]);
    const h = estimateBlockHeight(dia);
    expect(h).toBeGreaterThan(THEME.H_DIAGRAM_LABEL + THEME.DIAGRAM_NODE_HEIGHT);
  });

  it('threshold constant is 4', () => {
    expect(THEME.DIAGRAM_LARGE_THRESHOLD).toBe(4);
  });
});
