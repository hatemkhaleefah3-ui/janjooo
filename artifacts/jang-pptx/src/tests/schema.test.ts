import { describe, it, expect } from 'vitest';
import { validateLecture } from '../schema/validate-lecture';
import { sampleLecture } from '../demo/sample-lecture';

describe('validateLecture — schema and semantic checks', () => {
  it('passes for the complete sample lecture', () => {
    const result = validateLecture(sampleLecture);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('rejects non-object input', () => {
    expect(validateLecture(null).valid).toBe(false);
    expect(validateLecture('string').valid).toBe(false);
    expect(validateLecture(42).valid).toBe(false);
  });

  it('rejects missing documentTitle', () => {
    const doc = { ...sampleLecture, documentTitle: '' };
    const result = validateLecture(doc);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('documentTitle'))).toBe(true);
  });

  it('rejects wrong schemaVersion', () => {
    const doc = { ...sampleLecture, schemaVersion: '2.0' };
    const result = validateLecture(doc);
    expect(result.valid).toBe(false);
  });

  it('rejects sections with no slides', () => {
    const doc = {
      ...sampleLecture,
      sections: [{ ...sampleLecture.sections[0], slides: [] }],
    };
    const result = validateLecture(doc);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('no slides'))).toBe(true);
  });

  it('rejects slides with no blocks', () => {
    const section = sampleLecture.sections[0];
    const doc = {
      ...sampleLecture,
      sections: [
        {
          ...section,
          slides: [{ ...section.slides[0], blocks: [] }],
        },
      ],
    };
    const result = validateLecture(doc);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('no blocks'))).toBe(true);
  });

  it('rejects duplicate sectionIds', () => {
    const doc = {
      ...sampleLecture,
      sections: [sampleLecture.sections[0], { ...sampleLecture.sections[0] }],
    };
    const result = validateLecture(doc);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Duplicate sectionId'))).toBe(true);
  });

  it('rejects duplicate slideIds across sections', () => {
    const slide = sampleLecture.sections[0].slides[0];
    const doc = {
      ...sampleLecture,
      sections: [
        sampleLecture.sections[0],
        {
          ...sampleLecture.sections[1],
          slides: [{ ...slide }], // reuse same slideId
        },
      ],
    };
    const result = validateLecture(doc);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Duplicate slideId'))).toBe(true);
  });

  it('rejects repeated non-empty slide titles', () => {
    const section = sampleLecture.sections[0];
    const doc = {
      ...sampleLecture,
      sections: [
        {
          ...section,
          slides: [
            { ...section.slides[0], slideId: 'sl-a', slideTitle: 'Same Title' },
            { ...section.slides[1], slideId: 'sl-b', slideTitle: 'Same Title' },
          ],
        },
      ],
    };
    const result = validateLecture(doc);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Repeated non-empty slide title'))).toBe(true);
  });

  it('warns about generic image labels', () => {
    const section = sampleLecture.sections[0];
    const imgSlide = section.slides.find((s) =>
      s.blocks.some((b) => b.type === 'image'),
    )!;
    const imgBlock = imgSlide.blocks.find((b) => b.type === 'image')!;
    const doc = {
      ...sampleLecture,
      sections: [
        {
          ...section,
          slides: [
            {
              ...imgSlide,
              blocks: [{ ...imgBlock, label: 'Image', slotId: 'img-test-x' }],
            },
          ],
        },
      ],
    };
    const result = validateLecture(doc);
    // Label "Image" is generic → warning
    expect(result.warnings.some((w) => w.includes('generic label'))).toBe(true);
  });

  it('rejects table blocks with mismatched row lengths', () => {
    const section = sampleLecture.sections[0];
    const tableSlide = section.slides.find((s) =>
      s.blocks.some((b) => b.type === 'table'),
    )!;
    const doc = {
      ...sampleLecture,
      sections: [
        {
          ...section,
          slides: [
            {
              ...tableSlide,
              blocks: tableSlide.blocks.map((b) =>
                b.type === 'table'
                  ? { ...b, rows: [['only one cell']] } // mismatch
                  : b,
              ),
            },
          ],
        },
      ],
    };
    const result = validateLecture(doc);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('cells but'))).toBe(true);
  });

  it('rejects diagram blocks with empty nodes', () => {
    const doc = {
      ...sampleLecture,
      sections: [
        {
          ...sampleLecture.sections[0],
          slides: [
            {
              slideId: 'sl-empty-node',
              slideTitle: 'Test',
              slideSubtitle: '',
              sourceReferences: [],
              blocks: [
                {
                  blockId: 'bx-dia',
                  type: 'diagram' as const,
                  label: 'Test diagram',
                  diagramRows: [['NodeA', ''], ['NodeC']],
                  sourceReferences: [],
                },
              ],
            },
          ],
        },
      ],
    };
    const result = validateLecture(doc);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('empty node'))).toBe(true);
  });
});

describe('schema 1.2 hierarchy contract', () => {
  it('accepts traceable definitions, title blocks, and section-title key terms', () => {
    const doc = {
      schemaVersion: '1.2' as const,
      documentTitle: 'Hierarchical lecture',
      direction: 'ltr' as const,
      overview: { title: 'Overview', introduction: 'Sequence', keyPoints: ['Metabolism'] },
      sections: [{
        sectionId: 'metabolism',
        sectionTitle: 'Metabolism',
        sectionDefinition: 'The coordinated transformation and use of biochemical substrates.',
        slides: [{
          slideId: 'topic',
          slideTitle: 'Glycine pathways',
          titleDefinition: 'Routes that synthesize, use, and degrade glycine.',
          slideSubtitle: 'Core reactions',
          subtitleDefinition: 'The principal ordered conversions and their enzymes.',
          sourceReferences: ['p1'],
          blocks: [
            { blockId: 't2', type: 'title' as const, text: 'Clinical consequences', definition: 'Effects of pathway disruption.', sourceReferences: ['p2'] },
            { blockId: 's2', type: 'subtitle' as const, text: 'Nonketotic hyperglycinemia', definition: 'A disorder caused by impaired glycine cleavage.', sourceReferences: ['p2'] },
            { blockId: 'p2', type: 'paragraph' as const, text: 'Glycine accumulates in body fluids.', sourceReferences: ['p2'] },
          ],
        }],
      }],
      endNote: 'Questions',
    };
    expect(validateLecture(doc)).toMatchObject({ valid: true, errors: [] });
  });

  it('requires definitions and exact section-title key terms for schema 1.2', () => {
    const doc = {
      schemaVersion: '1.2' as const,
      documentTitle: 'Invalid hierarchy',
      direction: 'ltr' as const,
      overview: { title: 'Overview', introduction: 'Sequence', keyPoints: ['Unrelated term'] },
      sections: [{
        sectionId: 's', sectionTitle: 'Section', slides: [{
          slideId: 'sl', slideTitle: 'Title', slideSubtitle: 'Sub-title', sourceReferences: [],
          blocks: [{ blockId: 'p', type: 'paragraph' as const, text: 'Text', sourceReferences: [] }],
        }],
      }],
      endNote: 'Questions',
    };
    const result = validateLecture(doc);
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toMatch(/sectionDefinition/);
    expect(result.errors.join('\n')).toMatch(/titleDefinition/);
    expect(result.errors.join('\n')).toMatch(/subtitleDefinition/);
    expect(result.errors.join('\n')).toMatch(/overview\.keyPoints/);
  });
});
