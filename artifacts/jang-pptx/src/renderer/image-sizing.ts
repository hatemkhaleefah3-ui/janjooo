import { THEME } from '../template/theme';

export interface ImageDimensions {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Fits an image inside an area using "contain" (letterbox), preserving aspect ratio.
 * @param aspect - width/height ratio. If undefined, fills the area completely.
 */
export function fitImageContain(
  areaX: number,
  areaY: number,
  areaW: number,
  areaH: number,
  aspect?: number,
): ImageDimensions {
  if (!aspect) {
    return { x: areaX, y: areaY, w: areaW, h: areaH };
  }
  const areaAspect = areaW / areaH;
  let w: number, h: number;
  if (aspect >= areaAspect) {
    w = areaW;
    h = w / aspect;
  } else {
    h = areaH;
    w = h * aspect;
  }
  return {
    x: areaX + (areaW - w) / 2,
    y: areaY + (areaH - h) / 2,
    w,
    h,
  };
}

/**
 * Returns a numeric aspect ratio (w/h) for a preferredAspect hint.
 * Returns undefined for "automatic".
 */
export function guessAspect(preferredAspect: string): number | undefined {
  switch (preferredAspect) {
    case 'wide': return 16 / 9;
    case 'portrait': return 3 / 4;
    case 'square': return 1;
    case 'full': return THEME.SLIDE_WIDTH / THEME.SLIDE_HEIGHT;
    default: return undefined;
  }
}

/**
 * Attempts to read the intrinsic aspect ratio of an image from its data URL.
 * Browser-only; returns undefined in Node/test environments.
 */
export async function extractAspectFromDataUrl(dataUrl: string): Promise<number | undefined> {
  if (typeof document === 'undefined') return undefined;
  return new Promise<number | undefined>((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve(img.naturalWidth > 0 ? img.naturalWidth / img.naturalHeight : undefined);
    };
    img.onerror = () => resolve(undefined);
    img.src = dataUrl;
    setTimeout(() => resolve(undefined), 2000);
  });
}
