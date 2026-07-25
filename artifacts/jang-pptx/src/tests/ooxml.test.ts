import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { generateLecturePptx } from '../renderer/generate-lecture-pptx';
import { sampleImages } from '../demo/sample-images';
import type { LectureDocument } from '../schema/lecture-types';

const lecture: LectureDocument = {
  schemaVersion: '1.1',
  documentTitle: 'OOXML structure test',
  direction: 'ltr',
  overview: { title: 'Overview', introduction: 'OOXML test', keyPoints: ['Editable output'] },
  sections: [{
    sectionId: 'section-ooxml',
    sectionTitle: 'Native objects',
    slides: [{
      slideId: 'slide-native',
      slideTitle: 'Native PowerPoint objects',
      slideSubtitle: '',
      sourceReferences: [],
      blocks: [
        { blockId: 'bullets', type: 'bullets', items: ['Bullet alpha', 'Bullet beta'], sourceReferences: [] },
        { blockId: 'numbers', type: 'numbered', items: ['Number one', 'Number two'], sourceReferences: [] },
        {
          blockId: 'table', type: 'table', label: 'Editable table',
          headers: ['Column A', 'Column B'], rows: [['A1', 'B1'], ['A2', 'B2']], sourceReferences: [],
        },
      ],
    }, {
      slideId: 'slide-diagram',
      slideTitle: 'Editable diagram',
      slideSubtitle: '',
      sourceReferences: [],
      blocks: [{
        blockId: 'diagram', type: 'diagram', label: 'Native pathway',
        diagramRows: [['Node alpha', 'Node beta', 'Node gamma'], ['Node delta', 'Node epsilon']],
        sourceReferences: [],
      }],
    }, {
      slideId: 'slide-image',
      slideTitle: '',
      slideSubtitle: '',
      sourceReferences: [],
      blocks: [{
        blockId: 'image', type: 'image', slotId: 'img-mitochondria',
        label: 'Editable image caption', description: 'Image metadata test', important: true,
        sourceReference: 'source-image', fit: 'cover', preferredAspect: 'automatic', sourceReferences: [],
      }],
    }],
  }],
  endNote: 'Finished',
};

describe('generated OOXML', () => {
  it('contains native bullets, numbering, tables, pictures, and arrow lines', async () => {
    const result = await generateLecturePptx(lecture, sampleImages, { strictGeometry: true });
    expect(result.slideCount).toBeGreaterThanOrEqual(7);
    const zip = await JSZip.loadAsync(await result.blob.arrayBuffer());
    const slideNames = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
    expect(slideNames).toHaveLength(result.slideCount);
    const xml = (await Promise.all(slideNames.map((name) => zip.file(name)!.async('string')))).join('\n');

    expect(xml).toContain('<a:buChar');
    expect(xml).toContain('<a:buAutoNum');
    expect(xml).toContain('<a:tbl>');
    expect(xml).toContain('<p:pic>');
    expect(xml).toContain('<a:srcRect');
    expect(xml).toMatch(/<a:tailEnd[^>]*type="(?:triangle|arrow|stealth)"/);
    expect(xml).toContain('Node alpha');
    expect(xml).toContain('Editable image caption');
  }, 30000);
});
