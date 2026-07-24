import { describe, it, expect } from 'vitest';
import { paginateContent, isDedicatedBlock, estimateBlockHeight } from '../renderer/paginate-content';
import type { LectureSlide, LectureBlock } from '../schema/lecture-types';

function makeSlide(blocks: LectureBlock[], title = '', subtitle = ''): LectureSlide {
  return {
    slideId: 'test-slide',
    slideTitle: title,
    slideSubtitle: subtitle,
    sourceReferences: [],
    blocks,
  };
}

describe('isDedicatedBlock', () => {
  it('marks image blocks as dedicated', () => {
    expect(isDedicatedBlock({
      blockId: 'x', type: 'image', slotId: 'img-1', label: 'Test image',
      description: '', important: true, sourceReference: 'p1',
      fit: 'contain', preferredAspect: 'automatic', sourceReferences: [],
    })).toBe(true);
  });

  it('marks tables with > 3 columns as dedicated', () => {
    expect(isDedicatedBlock({
      blockId: 'x', type: 'table', label: 'Large table',
      headers: ['A', 'B', 'C', 'D'], rows: [],
      sourceReferences: [],
    })).toBe(true);
  });

  it('does NOT mark tables with <= 3 columns as dedicated', () => {
    expect(isDedicatedBlock({
      blockId: 'x', type: 'table', label: 'Small table',
      headers: ['A', 'B', 'C'], rows: [],
      sourceReferences: [],
    })).toBe(false);
  });

  it('marks diagrams with > 4 total nodes as dedicated', () => {
    expect(isDedicatedBlock({
      blockId: 'x', type: 'diagram', label: 'Large diagram',
      diagramRows: [['A', 'B', 'C'], ['D', 'E']],
      sourceReferences: [],
    })).toBe(true);
  });

  it('does NOT mark diagrams with <= 4 total nodes as dedicated', () => {
    expect(isDedicatedBlock({
      blockId: 'x', type: 'diagram', label: 'Small diagram',
      diagramRows: [['A'], ['B'], ['C']],
      sourceReferences: [],
    })).toBe(false);
  });
});

describe('estimateBlockHeight', () => {
  it('returns positive heights for all block types', () => {
    const blocks: LectureBlock[] = [
      { blockId: 'a', type: 'subtitle', text: 'Hello', sourceReferences: [] },
      { blockId: 'b', type: 'paragraph', text: 'A paragraph with some text.', sourceReferences: [] },
      { blockId: 'c', type: 'bullets', items: ['A', 'B', 'C'], sourceReferences: [] },
      { blockId: 'd', type: 'numbered', items: ['Step 1', 'Step 2'], sourceReferences: [] },
      { blockId: 'e', type: 'callout', label: 'Note', text: 'Pay attention.', tone: 'note', sourceReferences: [] },
      {
        blockId: 'f', type: 'table', label: 'T', headers: ['X', 'Y'],
        rows: [['a', 'b'], ['c', 'd']], sourceReferences: [],
      },
      {
        blockId: 'g', type: 'diagram', label: 'D',
        diagramRows: [['Node A'], ['Node B']], sourceReferences: [],
      },
    ];
    for (const b of blocks) {
      expect(estimateBlockHeight(b)).toBeGreaterThan(0);
    }
  });

  it('returns 0 for image blocks (handled separately)', () => {
    expect(estimateBlockHeight({
      blockId: 'img', type: 'image', slotId: 's1', label: 'Photo of cell',
      description: '', important: true, sourceReference: 'p1',
      fit: 'contain', preferredAspect: 'wide', sourceReferences: [],
    })).toBe(0);
  });
});

describe('paginateContent', () => {
  it('produces one content fragment for a few small blocks', () => {
    const slide = makeSlide([
      { blockId: 'b1', type: 'subtitle', text: 'Sub', sourceReferences: [] },
      { blockId: 'b2', type: 'paragraph', text: 'Short text.', sourceReferences: [] },
    ]);
    const fragments = paginateContent(slide);
    expect(fragments.length).toBe(1);
    expect(fragments[0].type).toBe('content');
  });

  it('produces an image fragment for an image block', () => {
    const slide = makeSlide([
      {
        blockId: 'img1', type: 'image', slotId: 'img-x',
        label: 'Glycolysis biochemical pathway', description: 'Detailed pathway diagram',
        important: true, sourceReference: 'p1', fit: 'contain', preferredAspect: 'wide',
        sourceReferences: [],
      },
    ]);
    const fragments = paginateContent(slide);
    expect(fragments.length).toBe(1);
    expect(fragments[0].type).toBe('image');
  });

  it('produces a dedicated-table fragment for a large table', () => {
    const slide = makeSlide([
      {
        blockId: 'tbl1', type: 'table', label: 'Big table',
        headers: ['A', 'B', 'C', 'D', 'E'],
        rows: [['1', '2', '3', '4', '5']],
        sourceReferences: [],
      },
    ]);
    const fragments = paginateContent(slide);
    expect(fragments.length).toBe(1);
    expect(fragments[0].type).toBe('dedicated-table');
  });

  it('produces a dedicated-diagram fragment for a large diagram', () => {
    const slide = makeSlide([
      {
        blockId: 'dia1', type: 'diagram',
        label: 'Signal cascade',
        diagramRows: [['A', 'B', 'C'], ['D', 'E']],
        sourceReferences: [],
      },
    ]);
    const fragments = paginateContent(slide);
    expect(fragments.length).toBe(1);
    expect(fragments[0].type).toBe('dedicated-diagram');
  });

  it('splits image block from surrounding text into separate fragments', () => {
    const slide = makeSlide([
      { blockId: 'b1', type: 'paragraph', text: 'Before image.', sourceReferences: [] },
      {
        blockId: 'img2', type: 'image', slotId: 'img-y',
        label: 'Nephron cross-section', description: 'Kidney anatomy',
        important: true, sourceReference: 'p2', fit: 'contain', preferredAspect: 'square',
        sourceReferences: [],
      },
      { blockId: 'b2', type: 'paragraph', text: 'After image.', sourceReferences: [] },
    ]);
    const fragments = paginateContent(slide);
    expect(fragments.length).toBe(3);
    expect(fragments[0].type).toBe('content');
    expect(fragments[1].type).toBe('image');
    expect(fragments[2].type).toBe('content');
  });

  it('preserves source block order', () => {
    const blocks: LectureBlock[] = [
      { blockId: 'b1', type: 'subtitle', text: 'First', sourceReferences: [] },
      { blockId: 'b2', type: 'subtitle', text: 'Second', sourceReferences: [] },
      { blockId: 'b3', type: 'subtitle', text: 'Third', sourceReferences: [] },
    ];
    const slide = makeSlide(blocks);
    const fragments = paginateContent(slide);
    // All content in one page — check order
    const contentFragments = fragments.filter((f) => f.type === 'content');
    const allBlocks = contentFragments.flatMap((f) => (f.type === 'content' ? f.blocks : []));
    expect(allBlocks.map((b) => b.blockId)).toEqual(['b1', 'b2', 'b3']);
  });
});
