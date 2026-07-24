import { describe, it, expect } from 'vitest';
import { isDedicatedBlock, estimateBlockHeight } from '../renderer/paginate-content';
import { THEME } from '../template/theme';
import type { TableBlock } from '../schema/lecture-types';

function makeTable(headers: string[], rows: string[][]): TableBlock {
  return {
    blockId: 'tbl-test',
    type: 'table',
    label: 'Test table',
    headers,
    rows,
    sourceReferences: [],
  };
}

describe('table layout decisions', () => {
  it('inline (not dedicated) for <= 3 columns', () => {
    expect(isDedicatedBlock(makeTable(['A', 'B', 'C'], [['1', '2', '3']]))).toBe(false);
    expect(isDedicatedBlock(makeTable(['A', 'B'], []))).toBe(false);
    expect(isDedicatedBlock(makeTable(['A'], []))).toBe(false);
  });

  it('dedicated slide for > 3 columns', () => {
    expect(isDedicatedBlock(makeTable(['A', 'B', 'C', 'D'], []))).toBe(true);
    expect(isDedicatedBlock(makeTable(['A', 'B', 'C', 'D', 'E', 'F'], []))).toBe(true);
  });

  it('height estimate scales with row count', () => {
    const smallTable = makeTable(['A', 'B'], [['x', 'y']]);
    const bigTable = makeTable(['A', 'B'], [
      ['x', 'y'], ['x2', 'y2'], ['x3', 'y3'], ['x4', 'y4'],
    ]);
    const smallH = estimateBlockHeight(smallTable);
    const bigH = estimateBlockHeight(bigTable);
    expect(bigH).toBeGreaterThan(smallH);
  });

  it('height includes label height', () => {
    const table = makeTable(['A', 'B'], []);
    const h = estimateBlockHeight(table);
    // At minimum: label + header row + gap
    expect(h).toBeGreaterThan(THEME.H_TABLE_LABEL + THEME.H_TABLE_HEADER_ROW);
  });

  it('threshold constant is 3', () => {
    expect(THEME.TABLE_LARGE_THRESHOLD).toBe(3);
  });
});
