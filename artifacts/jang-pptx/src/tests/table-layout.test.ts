import { describe, expect, it } from 'vitest';
import { paginateTableRows, tableRowsPerSlide } from '../renderer/render-table';

describe('table continuation helpers', () => {
  it('chunks all rows exactly once', () => {
    const rows = Array.from({ length: 23 }, (_, index) => [`r${index}`, `${index}`]);
    const pages = paginateTableRows(rows, 7);
    expect(pages.map((page) => page.length)).toEqual([7, 7, 7, 2]);
    expect(pages.flat()).toEqual(rows);
  });
  it('always reserves at least one body row', () => {
    expect(tableRowsPerSlide(0.1)).toBe(1);
    expect(tableRowsPerSlide(5)).toBeGreaterThan(1);
  });
});
