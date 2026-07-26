import { describe, expect, it } from 'vitest';
import { CONTENT_GAP, TITLE_RULE_GAP } from '../layout/title-spacing';
import { THEME } from '../template/theme';
import { collectOrderedTitleTerms } from '../schema/lecture-title-terms';
import type { LectureDocument } from '../schema/lecture-types';

describe('dense content contract', () => {
  it('uses an exact two-pixel vertical rhythm', () => {
    expect(CONTENT_GAP).toBeCloseTo(2 / 96, 10);
    expect(TITLE_RULE_GAP).toBeCloseTo(2 / 96, 10);
    expect(THEME.BLOCK_GAP).toBeCloseTo(2 / 96, 10);
    expect(THEME.SUBTITLE_GAP).toBeCloseTo(2 / 96, 10);
  });

  it('collects all ordered titles without section titles or sub-titles', () => {
    const lecture: LectureDocument = {
      schemaVersion: '1.2',
      documentTitle: 'Lecture',
      direction: 'ltr',
      overview: { title: 'Overview', introduction: 'Intro', keyPoints: ['First title', 'Second title'] },
      sections: [{
        sectionId: 's',
        sectionTitle: 'Excluded section',
        sectionDefinition: 'This section explains the major concepts, mechanisms, applications, and clinical relationships included in the lecture sequence.',
        slides: [{
          slideId: 'a',
          slideTitle: 'First title',
          titleDefinition: 'This title introduces the first complete teaching topic and explains its relevant mechanisms, functions, and relationships.',
          slideSubtitle: 'Excluded sub-title',
          subtitleDefinition: 'This sub-title narrows the topic to one specific aspect.',
          sourceReferences: ['p1'],
          blocks: [
            { blockId: 'p', type: 'paragraph', text: 'Text', sourceReferences: ['p1'] },
            { blockId: 't', type: 'title', text: 'Second title', definition: 'This title introduces the next complete teaching topic and its source-supported clinical meaning.', sourceReferences: ['p1'] },
          ],
        }],
      }],
      endNote: 'End',
    };

    expect(collectOrderedTitleTerms(lecture)).toEqual(['First title', 'Second title']);
  });
});
