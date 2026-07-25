import type PptxGenJS from 'pptxgenjs';
import { THEME } from '../template/theme';

export interface ObjectBounds { x: number; y: number; w: number; h: number; label?: string; }
export interface BoundaryCheck { valid: boolean; violations: string[]; }
export interface PresentationGeometryResult extends BoundaryCheck { checkedObjects: number; }

export function checkSlideObjects(objects: ObjectBounds[]): BoundaryCheck {
  const violations: string[] = [];
  for (const obj of objects) {
    const right = obj.x + obj.w;
    const bottom = obj.y + obj.h;
    const label = obj.label ?? 'Object';
    if (![obj.x, obj.y, obj.w, obj.h].every(Number.isFinite)) {
      violations.push(`${label}: geometry contains a non-finite value`);
      continue;
    }
    if (obj.w < -0.001 || obj.h < -0.001) violations.push(`${label}: width and height must be non-negative`);
    if (obj.x < -0.001) violations.push(`${label}: x=${obj.x.toFixed(3)} is past left edge`);
    if (obj.y < -0.001) violations.push(`${label}: y=${obj.y.toFixed(3)} is past top edge`);
    if (right > THEME.SLIDE_WIDTH + 0.001) violations.push(`${label}: right=${right.toFixed(3)} exceeds slide width ${THEME.SLIDE_WIDTH}`);
    if (bottom > THEME.SLIDE_HEIGHT + 0.001) violations.push(`${label}: bottom=${bottom.toFixed(3)} exceeds slide height ${THEME.SLIDE_HEIGHT}`);
  }
  return { valid: violations.length === 0, violations };
}

export function clampToSlide(x: number, y: number, w: number, h: number): ObjectBounds {
  const cx = Math.max(0, x);
  const cy = Math.max(0, y);
  return { x: cx, y: cy, w: Math.max(0, Math.min(w, THEME.SLIDE_WIDTH - cx)), h: Math.max(0, Math.min(h, THEME.SLIDE_HEIGHT - cy)) };
}

function boundsFromObject(value: unknown, label: string): ObjectBounds | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const options = (record.options ?? record._options ?? record) as Record<string, unknown>;
  const x = options.x; const y = options.y; const w = options.w; const h = options.h;
  if ([x, y, w, h].every((item) => typeof item === 'number')) {
    return { x: x as number, y: y as number, w: w as number, h: h as number, label };
  }
  return undefined;
}

/** Inspects PptxGenJS's generated slide object geometry before serialization. */
export function validatePresentationGeometry(pptx: PptxGenJS): PresentationGeometryResult {
  const presentation = pptx as unknown as { slides?: Array<Record<string, unknown>>; _slides?: Array<Record<string, unknown>> };
  const slides = presentation.slides ?? presentation._slides ?? [];
  const violations: string[] = [];
  let checkedObjects = 0;
  slides.forEach((slide, slideIndex) => {
    const objects = (slide._slideObjects ?? slide.slideObjects ?? []) as unknown[];
    const bounds = objects.map((object, objectIndex) => boundsFromObject(object, `slide ${slideIndex + 1} object ${objectIndex + 1}`)).filter((item): item is ObjectBounds => Boolean(item));
    checkedObjects += bounds.length;
    violations.push(...checkSlideObjects(bounds).violations);
  });
  return { valid: violations.length === 0, violations, checkedObjects };
}
