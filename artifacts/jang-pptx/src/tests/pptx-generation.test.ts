import { describe, it, expect } from 'vitest';
import { generateLecturePptx } from '../renderer/generate-lecture-pptx';
import { sampleLecture } from '../demo/sample-lecture';
import { sampleImages } from '../demo/sample-images';
import type { LectureDocument } from '../schema/lecture-types';

describe('generateLecturePptx — end-to-end', () => {
  it('generates a non-empty Blob for the sample lecture', async () => {
    const result = await generateLecturePptx(sampleLecture, sampleImages);
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.blob.size).toBeGreaterThan(5000);
    expect(Array.isArray(result.warnings)).toBe(true);
  }, 30000);

  it('generates with no images (all placeholders)', async () => {
    const result = await generateLecturePptx(sampleLecture, {});
    expect(result.blob.size).toBeGreaterThan(5000);
    // Should have placeholder warnings for both image slots
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.includes('placeholder'))).toBe(true);
  }, 30000);

  it('generates a minimal lecture (one section, one slide)', async () => {
    const minimal: LectureDocument = {
      schemaVersion: '1.0',
      documentTitle: 'Minimal Test Lecture',
      direction: 'ltr',
      overview: {
        title: 'Overview',
        introduction: 'A minimal lecture for testing.',
        keyPoints: ['Key point one'],
      },
      sections: [
        {
          sectionId: 'sec-1',
          sectionTitle: 'Introduction',
          slides: [
            {
              slideId: 'sl-1',
              slideTitle: 'Hello World',
              slideSubtitle: '',
              sourceReferences: [],
              blocks: [
                {
                  blockId: 'blk-1',
                  type: 'paragraph',
                  text: 'This is the only content slide.',
                  sourceReferences: [],
                },
              ],
            },
          ],
        },
      ],
      endNote: 'End.',
    };
    const result = await generateLecturePptx(minimal, {});
    expect(result.blob.size).toBeGreaterThan(2000);
    expect(result.warnings).toHaveLength(0);
  }, 30000);

  it('PPTX MIME type is correct', async () => {
    const result = await generateLecturePptx(sampleLecture, sampleImages);
    expect(result.blob.type).toBe(
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    );
  }, 30000);

  it('all block types can be rendered without throwing', async () => {
    const allTypes: LectureDocument = {
      schemaVersion: '1.0',
      documentTitle: 'All Block Types Test',
      direction: 'ltr',
      overview: { title: 'Overview', introduction: 'Test', keyPoints: ['KP1'] },
      sections: [
        {
          sectionId: 'sec-all',
          sectionTitle: 'All Types',
          slides: [
            {
              slideId: 'sl-all',
              slideTitle: 'All Block Types',
              slideSubtitle: 'Testing every block',
              sourceReferences: [],
              blocks: [
                { blockId: 'b-sub', type: 'subtitle', text: 'Subtitle block', sourceReferences: [] },
                { blockId: 'b-para', type: 'paragraph', text: 'A paragraph of text.', sourceReferences: [] },
                { blockId: 'b-bul', type: 'bullets', items: ['Item A', 'Item B'], sourceReferences: [] },
                { blockId: 'b-num', type: 'numbered', items: ['Step 1', 'Step 2'], sourceReferences: [] },
                { blockId: 'b-note', type: 'callout', label: 'Key', text: 'Note text', tone: 'note', sourceReferences: [] },
                { blockId: 'b-warn', type: 'callout', label: 'Careful', text: 'Warning text', tone: 'warning', sourceReferences: [] },
                { blockId: 'b-info', type: 'callout', label: 'FYI', text: 'Info text', tone: 'info', sourceReferences: [] },
                {
                  blockId: 'b-tbl-small', type: 'table', label: 'Small table',
                  headers: ['Name', 'Value'], rows: [['A', '1'], ['B', '2']], sourceReferences: [],
                },
                {
                  blockId: 'b-dia-small', type: 'diagram', label: 'Small diagram',
                  diagramRows: [['Alpha'], ['Beta']], sourceReferences: [],
                },
              ],
            },
            {
              slideId: 'sl-large',
              slideTitle: 'Dedicated Slides',
              slideSubtitle: '',
              sourceReferences: [],
              blocks: [
                {
                  blockId: 'b-tbl-large', type: 'table', label: 'Large table',
                  headers: ['A', 'B', 'C', 'D', 'E'],
                  rows: [['1', '2', '3', '4', '5'], ['6', '7', '8', '9', '10']],
                  sourceReferences: [],
                },
                {
                  blockId: 'b-dia-large', type: 'diagram', label: 'Large pathway',
                  diagramRows: [['N1', 'N2', 'N3'], ['N4', 'N5']],
                  sourceReferences: [],
                },
                {
                  blockId: 'b-img', type: 'image', slotId: 'img-all-types',
                  label: 'Cardiac cycle pressure-volume loop', description: 'PV loop',
                  important: true, sourceReference: 'p1', fit: 'contain', preferredAspect: 'square',
                  sourceReferences: [],
                },
              ],
            },
          ],
        },
      ],
      endNote: 'Done.',
    };

    await expect(generateLecturePptx(allTypes, {})).resolves.toMatchObject({
      blob: expect.any(Blob),
    });
  }, 30000);
});
