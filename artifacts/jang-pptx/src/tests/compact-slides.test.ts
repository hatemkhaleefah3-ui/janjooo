import { describe, expect, it } from 'vitest';
import { compactSectionSlides, verifyNoContentLoss } from '../renderer/compact-slides';
import { richTextToPlain } from '../renderer/rich-text';
import type { LectureSlide } from '../schema/lecture-types';

function thinSlide(id: string, title: string, sentence: string, ref: string): LectureSlide {
  return {
    slideId: id,
    slideTitle: title,
    slideSubtitle: '',
    sourceReferences: [ref],
    blocks: [{ blockId: `${id}-p`, type: 'paragraph', text: sentence, sourceReferences: [ref] }],
  };
}

describe('compactSectionSlides', () => {
  it('merges several thin slides onto one page when they comfortably fit', () => {
    const slides = [
      thinSlide('s1', 'Amino Acid Overview', 'Amino acids share a common backbone structure.', 'p1'),
      thinSlide('s2', 'Glycine Synthesis', 'Glycine is synthesized from serine via SHMT.', 'p2'),
      thinSlide('s3', 'Glycine Degradation', 'The glycine cleavage system degrades glycine.', 'p3'),
    ];
    const compacted = compactSectionSlides(slides);
    expect(compacted.length).toBeLessThan(slides.length);
    expect(compacted.length).toBeGreaterThanOrEqual(1);
  });

  it('never drops a block, source reference, or title while compacting', () => {
    const slides = [
      thinSlide('s1', 'Topic One', 'First short topic sentence.', 'p1'),
      thinSlide('s2', 'Topic Two', 'Second short topic sentence.', 'p2'),
      thinSlide('s3', 'Topic Three', 'Third short topic sentence.', 'p3'),
    ];
    const compacted = compactSectionSlides(slides);
    expect(verifyNoContentLoss(slides, compacted)).toEqual([]);

    const compactedText = compacted
      .flatMap((slide) => [slide.slideTitle, ...slide.blocks.map((block) => ('text' in block ? richTextToPlain(block.text) : ''))])
      .join(' ');
    for (const slide of slides) {
      expect(compactedText).toContain(slide.slideTitle);
      const original = slide.blocks[0];
      expect(compactedText).toContain(original.type === 'paragraph' ? richTextToPlain(original.text) : '');
    }
  });

  it('does not merge a slide dominated by a large table or diagram into a text-heavy neighbor beyond budget', () => {
    const bigTable = Array.from({ length: 40 }, (_, index) => [`Row ${index}`, `Value ${index}`]);
    const slides: LectureSlide[] = [
      {
        slideId: 'text-heavy',
        slideTitle: 'Long Discussion',
        slideSubtitle: '',
        sourceReferences: ['p1'],
        blocks: [{
          blockId: 'long-p', type: 'paragraph',
          text: Array.from({ length: 60 }, (_, i) => `Sentence ${i} about the pathway in detail. `).join(''),
          sourceReferences: ['p1'],
        }],
      },
      {
        slideId: 'table-heavy',
        slideTitle: 'Reference Table',
        slideSubtitle: '',
        sourceReferences: ['p2'],
        blocks: [{ blockId: 'big-table', type: 'table', label: 'Big table', headers: ['A', 'B'], rows: bigTable, sourceReferences: ['p2'] }],
      },
    ];
    const compacted = compactSectionSlides(slides);
    // The long paragraph alone should already exceed the merge budget, so it
    // must not silently absorb the next topic.
    expect(compacted.length).toBeGreaterThanOrEqual(2);
    expect(verifyNoContentLoss(slides, compacted)).toEqual([]);
  });

  it('does not merge a second inline image into the same compacted slide', () => {
    const imageSlide = (id: string, slotId: string, ref: string): LectureSlide => ({
      slideId: id,
      slideTitle: `Image topic ${id}`,
      slideSubtitle: '',
      sourceReferences: [ref],
      blocks: [{
        blockId: `${id}-img`, type: 'image', slotId, label: `Image ${id}`, description: `Description ${id}`,
        important: true, sourceReference: ref, fit: 'contain', preferredAspect: 'wide', sourceReferences: [ref],
      }],
    });
    const slides = [imageSlide('a', 'slot-a', 'p1'), imageSlide('b', 'slot-b', 'p2')];
    const compacted = compactSectionSlides(slides);
    expect(compacted).toHaveLength(2);
    expect(verifyNoContentLoss(slides, compacted)).toEqual([]);
  });

  it('never merges across sections (only ever receives one section at a time)', () => {
    // compactSectionSlides operates on a single section's slides; composing
    // multiple sections and calling it once per section (as compose-slides.ts
    // does) is what guarantees no cross-section merge. A single call with one
    // section's slides never introduces a foreign section's title.
    const slides = [thinSlide('a', 'Section A Topic', 'Sentence.', 'p1')];
    const compacted = compactSectionSlides(slides);
    expect(compacted).toHaveLength(1);
    expect(compacted[0].slideTitle).toBe('Section A Topic');
  });
});
