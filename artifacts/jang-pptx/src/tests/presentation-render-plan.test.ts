import { describe, expect, it } from 'vitest';
import { planPresentation } from '../layout/plan-presentation';
import type { LectureDocument } from '../schema/lecture-types';

function lecture(): LectureDocument {
  return {
    schemaVersion: '1.1',
    documentTitle: 'Amino acids metabolism',
    direction: 'ltr',
    overview: {
      title: 'Overview',
      introduction: 'A structured academic lecture.',
      keyPoints: ['Metabolic roles', 'Clinical pathways'],
    },
    sections: [
      {
        sectionId: 's1',
        sectionTitle: 'Glycine',
        slides: [
          {
            slideId: 'glycine-a',
            slideTitle: 'Biosynthesis',
            slideSubtitle: 'Core route',
            sourceReferences: ['p1'],
            blocks: [{ blockId: 'p1', type: 'paragraph', text: 'Short explanation.', sourceReferences: ['p1'] }],
          },
          {
            slideId: 'glycine-b',
            slideTitle: 'Clinical relevance',
            slideSubtitle: '',
            sourceReferences: ['p2'],
            blocks: [{ blockId: 'p2', type: 'paragraph', text: 'Another short explanation.', sourceReferences: ['p2'] }],
          },
        ],
      },
    ],
    endNote: 'Questions',
  };
}

describe('presentation render plan', () => {
  it('produces the complete deck order before rendering', () => {
    const plan = planPresentation(lecture());

    expect(plan.slides[0].type).toBe('cover');
    expect(plan.slides[1].type).toBe('overview');
    expect(plan.slides[2].type).toBe('section');
    expect(plan.slides.at(-1)?.type).toBe('ending');
    expect(plan.sourceLectureSlideCount).toBe(2);
    expect(plan.compactedLectureSlideCount).toBeLessThanOrEqual(2);
    expect(plan.semanticBlockCount).toBe(2);
    expect(plan.slides.filter((slide) => slide.type === 'content').length).toBeGreaterThan(0);
  });
});
