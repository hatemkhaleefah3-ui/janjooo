import { describe, it, expect } from 'vitest';
import { fitImageContain, guessAspect } from '../renderer/image-sizing';

describe('fitImageContain', () => {
  it('fills the area when no aspect ratio is given', () => {
    const dims = fitImageContain(0.5, 1.0, 8.0, 5.0, undefined);
    expect(dims.x).toBeCloseTo(0.5);
    expect(dims.y).toBeCloseTo(1.0);
    expect(dims.w).toBeCloseTo(8.0);
    expect(dims.h).toBeCloseTo(5.0);
  });

  it('constrains by width when image is wider than the area', () => {
    // Area: 8" × 5" (aspect 1.6). Image aspect: 2.0 (wider)
    const dims = fitImageContain(0, 0, 8, 5, 2.0);
    expect(dims.w).toBeCloseTo(8);
    expect(dims.h).toBeCloseTo(4); // 8 / 2.0
    expect(dims.y).toBeCloseTo(0.5); // centered vertically: (5 - 4) / 2
  });

  it('constrains by height when image is taller than the area', () => {
    // Area: 8" × 5" (aspect 1.6). Image aspect: 0.5 (taller)
    const dims = fitImageContain(0, 0, 8, 5, 0.5);
    expect(dims.h).toBeCloseTo(5);
    expect(dims.w).toBeCloseTo(2.5); // 5 * 0.5
    expect(dims.x).toBeCloseTo(2.75); // centered: (8 - 2.5) / 2
  });

  it('centers the image within the area', () => {
    const dims = fitImageContain(1, 2, 10, 6, 1.0);
    // Square image in 10×6 area: constrained by height (6), width = 6
    expect(dims.w).toBeCloseTo(6);
    expect(dims.h).toBeCloseTo(6);
    expect(dims.x).toBeCloseTo(1 + (10 - 6) / 2); // 3
    expect(dims.y).toBeCloseTo(2);
  });
});

describe('guessAspect', () => {
  it('returns 16/9 for wide', () => {
    expect(guessAspect('wide')).toBeCloseTo(16 / 9);
  });
  it('returns 3/4 for portrait', () => {
    expect(guessAspect('portrait')).toBeCloseTo(3 / 4);
  });
  it('returns 1 for square', () => {
    expect(guessAspect('square')).toBe(1);
  });
  it('returns undefined for automatic', () => {
    expect(guessAspect('automatic')).toBeUndefined();
  });
  it('returns undefined for unknown hint', () => {
    expect(guessAspect('unknown')).toBeUndefined();
  });
});
