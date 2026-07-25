import { describe, expect, it } from 'vitest';
import { paginateContent, isDedicatedBlock } from '../renderer/paginate-content';
import { richTextToPlain } from '../renderer/rich-text';
import type { LectureBlock, LectureSlide } from '../schema/lecture-types';

function makeSlide(blocks: LectureBlock[]): LectureSlide {
  return { slideId: 'slide', slideTitle: 'A title', slideSubtitle: 'A subtitle', sourceReferences: [], blocks };
}

describe('deterministic pagination', () => {
  it('routes image, wide table, and large diagram to dedicated renderers', () => {
    expect(isDedicatedBlock({ blockId: 'i', type: 'image', slotId: 's', label: 'Specific image', description: '', important: true, sourceReference: 'p1', fit: 'contain', preferredAspect: 'automatic', sourceReferences: [] })).toBe(true);
    expect(isDedicatedBlock({ blockId: 't', type: 'table', label: 'T', headers: ['1','2','3','4'], rows: [], sourceReferences: [] })).toBe(true);
    expect(isDedicatedBlock({ blockId: 'd', type: 'diagram', label: 'D', diagramRows: [['1','2','3'],['4','5']], sourceReferences: [] })).toBe(true);
  });

  it('splits a long paragraph without losing or reordering characters', () => {
    const source = Array.from({ length: 180 }, (_, index) => `Sentence ${index}. `).join('');
    const fragments = paginateContent(makeSlide([{ blockId: 'p', type: 'paragraph', text: source, sourceReferences: [] }]));
    const reconstructed = fragments.flatMap((fragment) => fragment.type === 'content' ? fragment.blocks : [])
      .filter((block): block is Extract<LectureBlock, { type: 'paragraph' }> => block.type === 'paragraph')
      .map((block) => richTextToPlain(block.text)).join('');
    expect(fragments.length).toBeGreaterThan(1);
    expect(reconstructed).toBe(source);
  });

  it('continues numbered lists with the correct starting number', () => {
    const items = Array.from({ length: 60 }, (_, index) => `Step ${index + 1}`);
    const fragments = paginateContent(makeSlide([{ blockId: 'n', type: 'numbered', items, sourceReferences: [] }]));
    const blocks = fragments.flatMap((fragment) => fragment.type === 'content' ? fragment.blocks : [])
      .filter((block): block is Extract<LectureBlock, { type: 'numbered' }> => block.type === 'numbered');
    expect(blocks.length).toBeGreaterThan(1);
    expect(blocks.flatMap((block) => block.items.map((item) => typeof item === 'string' ? item : richTextToPlain(item.text)))).toEqual(items);
    let consumed = 0;
    for (const block of blocks) {
      expect(block.startAt ?? 1).toBe(consumed + 1);
      consumed += block.items.length;
    }
  });

  it('creates real inline table continuations with every source row', () => {
    const rows = Array.from({ length: 45 }, (_, index) => [`row-${index}`, String(index)]);
    const fragments = paginateContent(makeSlide([{ blockId: 't', type: 'table', label: 'Long table', headers: ['Name','Value'], rows, sourceReferences: [] }]));
    const tables = fragments.flatMap((fragment) => fragment.type === 'content' ? fragment.blocks : [])
      .filter((block): block is Extract<LectureBlock, { type: 'table' }> => block.type === 'table');
    expect(tables.length).toBeGreaterThan(1);
    expect(tables.flatMap((table) => table.rows)).toEqual(rows);
  });
});

describe('paginateContent — zero content loss', () => {
  it('splits a long paragraph and preserves every character', () => {
    const text = Array.from({ length: 80 }, (_, index) => `Sentence ${index} explains a deterministic lecture concept. `).join('');
    const fragments = paginateContent(makeSlide([
      { blockId: 'long-paragraph', type: 'paragraph', text, sourceReferences: [] },
    ], 'Long lecture title', 'Long lecture subtitle'));
    const output = fragments.flatMap((fragment) => fragment.type === 'content' ? fragment.blocks : [])
      .filter((block) => block.type === 'paragraph')
      .map((block) => typeof block.text === 'string' ? block.text : block.text.map((run) => run.text).join(''))
      .join('');
    expect(fragments.length).toBeGreaterThan(1);
    expect(output).toBe(text);
  });

  it('splits long bullet lists without dropping or reordering items', () => {
    const items = Array.from({ length: 70 }, (_, index) => `Bullet ${index}: ${'detail '.repeat(6)}`);
    const fragments = paginateContent(makeSlide([
      { blockId: 'long-bullets', type: 'bullets', items, sourceReferences: [] },
    ]));
    const output = fragments.flatMap((fragment) => fragment.type === 'content' ? fragment.blocks : [])
      .filter((block) => block.type === 'bullets')
      .flatMap((block) => block.items)
      .map((item) => typeof item === 'string'
        ? item
        : typeof item.text === 'string' ? item.text : item.text.map((run) => run.text).join(''));
    expect(output).toEqual(items);
  });

  it('continues numbered-list numbering across slides', () => {
    const items = Array.from({ length: 60 }, (_, index) => `Step ${index + 1}: ${'explanation '.repeat(4)}`);
    const fragments = paginateContent(makeSlide([
      { blockId: 'long-numbered', type: 'numbered', items, startAt: 4, sourceReferences: [] },
    ]));
    const numbered = fragments.flatMap((fragment) => fragment.type === 'content' ? fragment.blocks : [])
      .filter((block) => block.type === 'numbered');
    expect(numbered.length).toBeGreaterThan(1);
    let expectedStart = 4;
    for (const block of numbered) {
      expect(block.startAt).toBe(expectedStart);
      expectedStart += block.items.filter((item) =>
        !(typeof item !== 'string' && (item as { __continued?: boolean }).__continued),
      ).length;
    }
  });

  it('splits a tall inline table into real continuation blocks', () => {
    const rows = Array.from({ length: 48 }, (_, index) => [`Row ${index}`, `Value ${index}`]);
    const fragments = paginateContent(makeSlide([
      {
        blockId: 'tall-inline-table', type: 'table', label: 'Tall table',
        headers: ['Name', 'Value'], rows, sourceReferences: [],
      },
    ]));
    const tables = fragments.flatMap((fragment) => fragment.type === 'content' ? fragment.blocks : [])
      .filter((block) => block.type === 'table');
    expect(tables.length).toBeGreaterThan(1);
    expect(tables.flatMap((block) => block.rows)).toEqual(rows);
    expect(tables.slice(1).every((block) =>
      (typeof block.label === 'string' ? block.label : block.label.map((run) => run.text).join('')).includes('continued'),
    )).toBe(true);
  });
});
