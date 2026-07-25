import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME } from '../template/theme';
import { generateLecturePptx } from '../renderer/generate-lecture-pptx';
import type { LectureDocument } from '../schema/lecture-types';

const lecture: LectureDocument = {
  schemaVersion: '1.1', documentTitle: 'Approved design regression', direction: 'ltr',
  overview: { title: 'Editorial overview', introduction: 'Design regression', keyPoints: ['Editable'] },
  sections: [{ sectionId: 's', sectionTitle: 'Design system', slides: [{
    slideId: 'sl', slideTitle: 'Premium academic content', slideSubtitle: '', sourceReferences: [],
    blocks: [{ blockId: 'p', type: 'paragraph', text: 'Native editable content.', sourceReferences: [] }],
  }] }], endNote: 'Questions',
};

describe('approved premium academic theme', () => {
  it('keeps the approved palette, typography, and editorial OOXML markers', async () => {
    expect(DEFAULT_THEME.NAVY).toBe('111111');
    expect(DEFAULT_THEME.SLIDE_BG).toBe('FAFAF9');
    expect(DEFAULT_THEME.headingFont).toBe('Aptos Display');
    expect(DEFAULT_THEME.MARGIN).toBe(0.68);

    const result = await generateLecturePptx(lecture, {}, { strictGeometry: true });
    const zip = await JSZip.loadAsync(await result.blob.arrayBuffer());
    const slideNames = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
    const xml = (await Promise.all(slideNames.map((name) => zip.file(name)!.async('string')))).join('\n');
    expect(xml).toContain('JANG LECTURE / EDITABLE POWERPOINT');
    expect(xml).toContain('LECTURE CONTENT');
    expect(xml).toContain('111111');
    expect(xml).toContain('FAFAF9');
  }, 30000);
});
