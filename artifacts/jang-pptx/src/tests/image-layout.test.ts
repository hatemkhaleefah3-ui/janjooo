import PptxGenJS from 'pptxgenjs';
import { describe, expect, it } from 'vitest';
import {
  extractIntrinsicImageSize,
  fitImageContain,
  fitImageCover,
  guessAspect,
  isUsableImageDataUrl,
} from '../renderer/image-sizing';
import { sampleImages } from '../demo/sample-images';
import { renderImageSlide } from '../renderer/render-image';

describe('image sizing', () => {
  it('contains a wide image without distortion', () => {
    const dims = fitImageContain(0, 0, 8, 5, 2);
    expect(dims.w).toBeCloseTo(8);
    expect(dims.h).toBeCloseTo(4);
    expect(dims.y).toBeCloseTo(0.5);
  });

  it('contains a portrait image without distortion', () => {
    const dims = fitImageContain(1, 2, 8, 5, 0.5);
    expect(dims.h).toBeCloseTo(5);
    expect(dims.w).toBeCloseTo(2.5);
    expect(dims.x).toBeCloseTo(3.75);
  });

  it('uses the complete target frame for native cover cropping', () => {
    expect(fitImageCover(1, 2, 8, 4)).toEqual({ x: 1, y: 2, w: 8, h: 4 });
  });

  it('maps preferred aspect hints', () => {
    expect(guessAspect('wide')).toBeCloseTo(16 / 9);
    expect(guessAspect('portrait')).toBeCloseTo(3 / 4);
    expect(guessAspect('square')).toBe(1);
    expect(guessAspect('automatic')).toBeUndefined();
  });
});

describe('intrinsic image metadata', () => {
  it('reads PNG dimensions synchronously in Node', () => {
    const dataUrl = sampleImages['img-mitochondria'].dataUrl;
    expect(extractIntrinsicImageSize(dataUrl)).toMatchObject({
      width: 50,
      height: 50,
      aspect: 1,
      mimeType: 'image/png',
    });
  });

  it('rejects malformed and unsupported data URLs', () => {
    expect(isUsableImageDataUrl('data:image/png;base64,%%%')).toBe(false);
    expect(isUsableImageDataUrl('data:text/plain;base64,SGVsbG8=')).toBe(false);
    expect(extractIntrinsicImageSize('not-an-image')).toBeUndefined();
  });
});


describe('image renderer aspect safety', () => {
  it('uses intrinsic dimensions even when preferredAspect is different', () => {
    const pptx = new PptxGenJS();
    renderImageSlide(pptx, {
      blockId: 'image-square',
      type: 'image',
      slotId: 'img-mitochondria',
      label: 'Square source image',
      description: '',
      important: true,
      sourceReference: 'source',
      fit: 'contain',
      preferredAspect: 'wide',
      sourceReferences: [],
    }, sampleImages, 'Images');

    const slides = (pptx as unknown as { _slides?: Array<{ _slideObjects?: unknown[] }>; slides?: Array<{ _slideObjects?: unknown[] }> })._slides
      ?? (pptx as unknown as { slides?: Array<{ _slideObjects?: unknown[] }> }).slides
      ?? [];
    const objects = slides[0]?._slideObjects ?? [];
    const picture = objects.find((object) => {
      const record = object as Record<string, unknown>;
      return record._type === 'image' || record.type === 'image' || 'image' in record;
    }) as { options?: { w?: number; h?: number } } | undefined;
    expect(picture?.options?.w).toBeTypeOf('number');
    expect(picture?.options?.h).toBeTypeOf('number');
    expect((picture!.options!.w as number) / (picture!.options!.h as number)).toBeCloseTo(1, 4);
  });
});
