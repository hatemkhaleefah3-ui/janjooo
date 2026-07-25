import { describe, expect, it } from 'vitest';
import { normalizeDiagramRows, paginateDiagramRows } from '../renderer/render-diagram';

describe('diagram continuation helpers', () => {
  it('splits wide rows without losing nodes', () => {
    const nodes = Array.from({ length: 13 }, (_, index) => `N${index}`);
    const rows = normalizeDiagramRows([nodes], 5);
    expect(rows.map((row) => row.length)).toEqual([5, 5, 3]);
    expect(rows.flat()).toEqual(nodes);
  });
  it('paginates normalized rows in stable order', () => {
    const rows = [['A','B'], ['C'], ['D'], ['E'], ['F']];
    const pages = paginateDiagramRows(rows, 2);
    expect(pages.map((page) => page.length)).toEqual([2, 2, 1]);
    expect(pages.flat(2)).toEqual(rows.flat());
  });
});
