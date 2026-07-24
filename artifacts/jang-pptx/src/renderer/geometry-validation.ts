import { THEME } from '../template/theme';

export interface ObjectBounds {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

export interface BoundaryCheck {
  valid: boolean;
  violations: string[];
}

/** Checks that all objects stay within slide boundaries. */
export function checkSlideObjects(objects: ObjectBounds[]): BoundaryCheck {
  const violations: string[] = [];
  for (const obj of objects) {
    const right = obj.x + obj.w;
    const bottom = obj.y + obj.h;
    const label = obj.label ?? 'Object';
    if (obj.x < -0.001) violations.push(`${label}: x=${obj.x.toFixed(3)} is past left edge`);
    if (obj.y < -0.001) violations.push(`${label}: y=${obj.y.toFixed(3)} is past top edge`);
    if (right > THEME.SLIDE_WIDTH + 0.001)
      violations.push(`${label}: right=${right.toFixed(3)} exceeds slide width ${THEME.SLIDE_WIDTH}`);
    if (bottom > THEME.SLIDE_HEIGHT + 0.001)
      violations.push(`${label}: bottom=${bottom.toFixed(3)} exceeds slide height ${THEME.SLIDE_HEIGHT}`);
  }
  return { valid: violations.length === 0, violations };
}

/** Clamps an object's position and size to remain within the slide. */
export function clampToSlide(
  x: number, y: number, w: number, h: number,
): ObjectBounds {
  const cx = Math.max(0, x);
  const cy = Math.max(0, y);
  return {
    x: cx,
    y: cy,
    w: Math.min(w, THEME.SLIDE_WIDTH - cx),
    h: Math.min(h, THEME.SLIDE_HEIGHT - cy),
  };
}
