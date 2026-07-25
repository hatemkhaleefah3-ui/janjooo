import { THEME } from '../template/theme';

export interface ImageDimensions { x: number; y: number; w: number; h: number; }
export interface IntrinsicImageSize { width: number; height: number; mimeType: string; aspect: number; }

export function fitImageContain(areaX: number, areaY: number, areaW: number, areaH: number, aspect?: number): ImageDimensions {
  if (!aspect || !Number.isFinite(aspect) || aspect <= 0) return { x: areaX, y: areaY, w: areaW, h: areaH };
  const areaAspect = areaW / areaH;
  const w = aspect >= areaAspect ? areaW : areaH * aspect;
  const h = aspect >= areaAspect ? areaW / aspect : areaH;
  return { x: areaX + (areaW - w) / 2, y: areaY + (areaH - h) / 2, w, h };
}

/** Target frame used by PptxGenJS native `cover` cropping. */
export function fitImageCover(areaX: number, areaY: number, areaW: number, areaH: number): ImageDimensions {
  return { x: areaX, y: areaY, w: areaW, h: areaH };
}

export function guessAspect(preferredAspect: string): number | undefined {
  switch (preferredAspect) {
    case 'wide': return 16 / 9;
    case 'portrait': return 3 / 4;
    case 'square': return 1;
    case 'full': return THEME.SLIDE_WIDTH / THEME.SLIDE_HEIGHT;
    default: return undefined;
  }
}

function decodeBase64(value: string): Uint8Array {
  const compact = value.replace(/\s/g, '');
  if (typeof atob === 'function') {
    const binary = atob(compact);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }
  return new Uint8Array(Buffer.from(compact, 'base64'));
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

interface ParsedDataUrl { mimeType: string; bytes: Uint8Array; text?: string; }
function parseDataUrl(dataUrl: string): ParsedDataUrl | undefined {
  const match = /^data:([^;,]+)(;base64)?,(.*)$/is.exec(dataUrl.trim());
  if (!match || !match[1].toLowerCase().startsWith('image/')) return undefined;
  try {
    const mimeType = match[1].toLowerCase();
    const encoded = match[3];
    if (match[2]) {
      const compact = encoded.replace(/\s/g, '');
      if (!compact || compact.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(compact)) return undefined;
    }
    const bytes = match[2] ? decodeBase64(encoded) : new TextEncoder().encode(decodeURIComponent(encoded));
    if (!bytes.length) return undefined;
    return { mimeType, bytes, ...(mimeType === 'image/svg+xml' ? { text: decodeUtf8(bytes) } : {}) };
  } catch {
    return undefined;
  }
}

export function isUsableImageDataUrl(dataUrl: string): boolean {
  const parsed = parseDataUrl(dataUrl);
  return Boolean(parsed && ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'].includes(parsed.mimeType));
}

function u16be(bytes: Uint8Array, offset: number): number { return bytes[offset] * 256 + bytes[offset + 1]; }
function u32be(bytes: Uint8Array, offset: number): number { return bytes[offset] * 0x1000000 + bytes[offset + 1] * 0x10000 + bytes[offset + 2] * 0x100 + bytes[offset + 3]; }
function u16le(bytes: Uint8Array, offset: number): number { return bytes[offset] + bytes[offset + 1] * 256; }
function u24le(bytes: Uint8Array, offset: number): number { return bytes[offset] + bytes[offset + 1] * 256 + bytes[offset + 2] * 65536; }

function pngSize(bytes: Uint8Array): [number, number] | undefined {
  if (bytes.length < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) return undefined;
  return [u32be(bytes, 16), u32be(bytes, 20)];
}
function gifSize(bytes: Uint8Array): [number, number] | undefined {
  if (bytes.length < 10 || decodeUtf8(bytes.slice(0, 3)) !== 'GIF') return undefined;
  return [u16le(bytes, 6), u16le(bytes, 8)];
}
function jpegSize(bytes: Uint8Array): [number, number] | undefined {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return undefined;
  let offset = 2;
  const sof = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset++; continue; }
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    const length = u16be(bytes, offset);
    if (sof.has(marker) && offset + 7 < bytes.length) return [u16be(bytes, offset + 5), u16be(bytes, offset + 3)];
    if (length < 2) break;
    offset += length;
  }
  return undefined;
}
function webpSize(bytes: Uint8Array): [number, number] | undefined {
  if (bytes.length < 30 || decodeUtf8(bytes.slice(0, 4)) !== 'RIFF' || decodeUtf8(bytes.slice(8, 12)) !== 'WEBP') return undefined;
  const kind = decodeUtf8(bytes.slice(12, 16));
  if (kind === 'VP8X') return [1 + u24le(bytes, 24), 1 + u24le(bytes, 27)];
  if (kind === 'VP8L' && bytes[20] === 0x2f) {
    const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
    return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
  }
  if (kind === 'VP8 ' && bytes.length >= 30) return [u16le(bytes, 26) & 0x3fff, u16le(bytes, 28) & 0x3fff];
  return undefined;
}
function svgSize(text: string): [number, number] | undefined {
  const svg = /<svg\b[^>]*>/i.exec(text)?.[0];
  if (!svg) return undefined;
  const numeric = (name: string): number | undefined => {
    const value = new RegExp(`${name}\\s*=\\s*["']\\s*([0-9.]+)`, 'i').exec(svg)?.[1];
    return value ? Number(value) : undefined;
  };
  const width = numeric('width'); const height = numeric('height');
  if (width && height) return [width, height];
  const viewBox = /viewBox\s*=\s*["']\s*[-0-9.]+\s+[-0-9.]+\s+([0-9.]+)\s+([0-9.]+)/i.exec(svg);
  return viewBox ? [Number(viewBox[1]), Number(viewBox[2])] : undefined;
}

/** Reads PNG/JPEG/GIF/WebP/SVG dimensions synchronously in Node or browser. */
export function extractIntrinsicImageSize(dataUrl: string): IntrinsicImageSize | undefined {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return undefined;
  let dimensions: [number, number] | undefined;
  switch (parsed.mimeType) {
    case 'image/png': dimensions = pngSize(parsed.bytes); break;
    case 'image/jpeg':
    case 'image/jpg': dimensions = jpegSize(parsed.bytes); break;
    case 'image/gif': dimensions = gifSize(parsed.bytes); break;
    case 'image/webp': dimensions = webpSize(parsed.bytes); break;
    case 'image/svg+xml': dimensions = svgSize(parsed.text ?? decodeUtf8(parsed.bytes)); break;
  }
  if (!dimensions || dimensions[0] <= 0 || dimensions[1] <= 0) return undefined;
  return { width: dimensions[0], height: dimensions[1], mimeType: parsed.mimeType, aspect: dimensions[0] / dimensions[1] };
}

/** Backward-compatible async API. */
export async function extractAspectFromDataUrl(dataUrl: string): Promise<number | undefined> {
  return extractIntrinsicImageSize(dataUrl)?.aspect;
}

/** Backward-compatible aliases retained for existing integrations. */
export const isSupportedImageDataUrl = isUsableImageDataUrl;
export const extractImageDimensionsFromDataUrl = extractIntrinsicImageSize;
