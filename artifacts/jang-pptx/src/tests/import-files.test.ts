import { describe, expect, it } from 'vitest';
import { getImageImportError, parseLectureJsonText } from '@/demo/import-files';

describe('demo file imports', () => {
  it('parses JSON files that start with a UTF-8 byte-order mark', () => {
    expect(parseLectureJsonText('\uFEFF {"schemaVersion":"1.1"}')).toEqual({ schemaVersion: '1.1' });
  });

  it('reports empty and malformed JSON clearly', () => {
    expect(() => parseLectureJsonText('   ')).toThrow('selected JSON file is empty');
    expect(() => parseLectureJsonText('{not-json}')).toThrow('Invalid JSON file');
  });

  it('accepts the image formats supported by the PPTX importer', () => {
    expect(getImageImportError({ name: 'figure.png', type: 'image/png', size: 10 })).toBeNull();
    expect(getImageImportError({ name: 'figure.JPG', type: 'image/jpeg', size: 10 })).toBeNull();
    expect(getImageImportError({ name: 'figure.svg', type: '', size: 10 })).toBeNull();
  });

  it('rejects empty, unsupported, and mismatched image files', () => {
    expect(getImageImportError({ name: 'empty.png', type: 'image/png', size: 0 })).toContain('empty');
    expect(getImageImportError({ name: 'photo.webp', type: 'image/webp', size: 10 })).toContain('Unsupported');
    expect(getImageImportError({ name: 'photo.png', type: 'image/jpeg', size: 10 })).toContain('does not match');
  });
});
