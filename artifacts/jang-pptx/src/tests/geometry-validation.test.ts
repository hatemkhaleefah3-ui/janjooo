import { describe, expect, it } from 'vitest';
import { checkSlideObjects, clampToSlide } from '../renderer/geometry-validation';

describe('geometry validation', () => {
  it('detects objects outside slide boundaries', () => {
    const result = checkSlideObjects([{ x: 12.9, y: 7.2, w: 1, h: 1, label: 'overflow' }]);
    expect(result.valid).toBe(false);
    expect(result.violations.join(' ')).toContain('overflow');
  });

  it('clamps geometry to the slide', () => {
    expect(clampToSlide(-1, -1, 20, 20)).toEqual({ x: 0, y: 0, w: 13.33, h: 7.5 });
  });
});
