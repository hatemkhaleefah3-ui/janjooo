import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { generateLecturePptx, LectureValidationError } from '../renderer/generate-lecture-pptx';
import type { LectureDocument } from '../schema/lecture-types';

function lecture(): LectureDocument {
  return {
    schemaVersion: '1.1', documentTitle: 'OOXML verification', direction: 'ltr',
    overview: { title: 'Overview', introduction: 'Native objects', keyPoints: ['Editable', 'Deterministic'] },
    sections: [{ sectionId: 's', sectionTitle: 'Verification', slides: [{
      slideId: 'sl', slideTitle: 'Object verification', slideSubtitle: 'Native lists, tables and connectors', sourceReferences: [],
      blocks: [
        { blockId: 'b1', type: 'bullets', items: ['Bullet alpha', { text: 'Nested beta', level: 1 }], sourceReferences: [] },
        { blockId: 'b2', type: 'numbered', items: ['Number one', 'Number two'], sourceReferences: [] },
        { blockId: 't', type: 'table', label: 'Long evidence table', headers: ['A','B','C','D'], rows: Array.from({ length: 32 }, (_, index) => [`ROW_MARKER_${index}`, `B${index}`, `C${index}`, `D${index}`]), sourceReferences: [] },
        { blockId: 'd', type: 'diagram', label: 'Native connector pathway', diagramRows: [['Node A','Node B','Node C'],['Node D','Node E','Node F'],['Node G']], sourceReferences: [] },
        { blockId: 'i', type: 'image', slotId: 'bad-image', label: 'Malformed microscopy image', description: 'Must become a placeholder', important: true, sourceReference: 'p1', fit: 'cover', preferredAspect: 'automatic', sourceReferences: [] },
      ],
    }] }],
    endNote: 'Done',
  };
}

async function slideXml(blob: Blob): Promise<{ zip: JSZip; xml: string }> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const names = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort();
  const xml = (await Promise.all(names.map((name) => zip.file(name)!.async('string')))).join('\n');
  return { zip, xml };
}

describe('native PPTX generation and OOXML inspection', () => {
  it('emits native list properties, table rows, line connectors, and placeholders', async () => {
    const result = await generateLecturePptx(lecture(), { 'bad-image': { dataUrl: 'data:image/png;base64,AAAA' } });
    expect(result.blob.type).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation');
    expect(result.blob.size).toBeGreaterThan(5000);
    expect(result.slideCount).toBeGreaterThan(6);
    expect(result.warnings.some((warning) => warning.includes('could not be decoded'))).toBe(true);

    const { zip, xml } = await slideXml(result.blob);
    expect(zip.file('[Content_Types].xml')).not.toBeNull();
    expect(xml).toMatch(/<a:buChar\b|<a:buFont\b/);
    expect(xml).toMatch(/<a:buAutoNum\b/);
    expect(xml).toMatch(/prst="line"|<p:cxnSp\b/);
    expect(xml).toMatch(/(?:headEnd|tailEnd)[^>]*type="triangle"/);
    expect(xml).toContain('[Image not imported]');
    for (let index = 0; index < 32; index++) expect(xml).toContain(`ROW_MARKER_${index}`);
  }, 30000);

  it('rejects invalid documents before rendering', async () => {
    const invalid = { ...lecture(), documentTitle: '' };
    await expect(generateLecturePptx(invalid)).rejects.toBeInstanceOf(LectureValidationError);
  });

  it('uses the exact preserved slide size and isolates concurrent theme overrides', async () => {
    const [first, second] = await Promise.all([
      generateLecturePptx(lecture(), {}, { theme: { bodyFont: 'Courier New', headingFont: 'Courier New', NAVY: '123456' } }),
      generateLecturePptx(lecture(), {}, { theme: { bodyFont: 'Times New Roman', headingFont: 'Times New Roman', NAVY: '654321' } }),
    ]);

    const inspect = async (blob: Blob) => {
      const zip = await JSZip.loadAsync(await blob.arrayBuffer());
      const presentation = await zip.file('ppt/presentation.xml')!.async('string');
      const theme = await zip.file('ppt/theme/theme1.xml')!.async('string');
      const slides = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
      const xml = (await Promise.all(slides.map((name) => zip.file(name)!.async('string')))).join('\n');
      return { presentation, theme, xml };
    };

    const firstXml = await inspect(first.blob);
    const secondXml = await inspect(second.blob);
    expect(firstXml.presentation).toMatch(/<p:sldSz[^>]*cx="12188952"[^>]*cy="6858000"/);
    expect(secondXml.presentation).toMatch(/<p:sldSz[^>]*cx="12188952"[^>]*cy="6858000"/);
    expect(firstXml.theme).toMatch(/<a:majorFont><a:latin typeface="Courier New"/);
    expect(firstXml.theme).toMatch(/<a:minorFont><a:latin typeface="Courier New"/);
    expect(secondXml.theme).toMatch(/<a:majorFont><a:latin typeface="Times New Roman"/);
    expect(secondXml.theme).toMatch(/<a:minorFont><a:latin typeface="Times New Roman"/);
    expect(firstXml.xml).toContain('123456');
    expect(firstXml.xml).not.toContain('654321');
    expect(secondXml.xml).toContain('654321');
    expect(secondXml.xml).not.toContain('123456');
  }, 30000);

});
