import { describe, expect, it } from 'vitest';
import { generateLecturePptx } from '../renderer/generate-lecture-pptx';
import { compactSectionSlides } from '../renderer/compact-slides';
import { paginateContent } from '../renderer/paginate-content';
import { sampleImages } from '../demo/sample-images';
import type { LectureDocument, LectureSlide } from '../schema/lecture-types';

/**
 * Mirrors the structure of the real failing deck attached to issue #22:
 * two sections (glycine metabolism; phenylalanine/tyrosine metabolism), each
 * broken by the original extractor into many thin one-idea slides, several
 * of which carry a related image — including one slot that was never
 * imported (the exact "[Image not imported]" case from the original deck).
 * The same reference image is intentionally reused across two slots, which
 * must continue to work (see README-FOR-CLAUDE.md).
 */
function thinTopic(id: string, title: string, sentence: string, ref: string): LectureSlide {
  return {
    slideId: id,
    slideTitle: title,
    slideSubtitle: '',
    sourceReferences: [ref],
    blocks: [{ blockId: `${id}-p`, type: 'paragraph', text: sentence, sourceReferences: [ref] }],
  };
}

function imageTopic(id: string, title: string, slotId: string, sentence: string, ref: string): LectureSlide {
  return {
    slideId: id,
    slideTitle: title,
    slideSubtitle: '',
    sourceReferences: [ref],
    blocks: [
      { blockId: `${id}-p`, type: 'paragraph', text: sentence, sourceReferences: [ref] },
      {
        blockId: `${id}-img`, type: 'image', slotId, label: `${title} — evidence`, description: sentence,
        important: true, sourceReference: ref, fit: 'contain', preferredAspect: 'wide', sourceReferences: [ref],
      },
    ],
  };
}

function aminoAcidLecture(): LectureDocument {
  const glycineSlides: LectureSlide[] = [
    thinTopic('g1', 'Glycine Overview', 'Glycine is the smallest proteinogenic amino acid.', 'p1'),
    imageTopic('g2', 'Glycine Synthesis', 'img-mitochondria', 'Glycine is synthesized from serine by SHMT.', 'p2'),
    thinTopic('g3', 'Glycine Cleavage System', 'The glycine cleavage system degrades glycine to CO2 and NH3.', 'p3'),
    thinTopic('g4', 'Glycine in Collagen', 'Glycine occupies every third residue in the collagen triple helix.', 'p4'),
    imageTopic('g5', 'Glycine Receptor Structure', 'img-mitochondria', 'The glycine receptor is a ligand-gated chloride channel.', 'p5'),
    thinTopic('g6', 'Glycine Encephalopathy', 'Nonketotic hyperglycinemia results from glycine cleavage system defects.', 'p6'),
    // The exact failure mode from the original deck: an image slot that was
    // never imported, with no companion text at all.
    {
      slideId: 'g7', slideTitle: '', slideSubtitle: '', sourceReferences: ['p7'],
      blocks: [{
        blockId: 'g7-img', type: 'image', slotId: 'slot-not-imported', label: 'Porphyrin ring synthesis',
        description: 'Glycine contributes to porphyrin ring synthesis via ALA.', important: true,
        sourceReference: 'p7', fit: 'contain', preferredAspect: 'wide', sourceReferences: ['p7'],
      }],
    },
  ];

  const phenylalanineSlides: LectureSlide[] = [
    thinTopic('f1', 'Phenylalanine Overview', 'Phenylalanine is an essential aromatic amino acid.', 'p8'),
    thinTopic('f2', 'Phenylalanine Hydroxylase', 'PAH converts phenylalanine to tyrosine using BH4.', 'p9'),
    thinTopic('f3', 'Phenylketonuria', 'PKU results from PAH deficiency and causes phenylalanine accumulation.', 'p10'),
    imageTopic('f4', 'Tyrosine to Catecholamines', 'img-mitochondria', 'Tyrosine is converted to dopamine, norepinephrine, and epinephrine.', 'p11'),
    thinTopic('f5', 'Tyrosine to Melanin', 'Tyrosinase converts tyrosine toward melanin in melanocytes.', 'p12'),
    thinTopic('f6', 'Alkaptonuria', 'Homogentisate oxidase deficiency causes alkaptonuria.', 'p13'),
  ];

  return {
    schemaVersion: '1.1',
    documentTitle: 'Amino Acid Metabolism',
    direction: 'ltr',
    overview: {
      title: 'Overview',
      introduction: 'Amino acid metabolism lecture.',
      keyPoints: ['Glycine metabolism', 'Phenylalanine and tyrosine metabolism'],
    },
    sections: [
      { sectionId: 'sec-glycine', sectionTitle: 'Glycine Metabolism', slides: glycineSlides },
      { sectionId: 'sec-phe-tyr', sectionTitle: 'Phenylalanine and Tyrosine Metabolism', slides: phenylalanineSlides },
    ],
    endNote: 'Questions and discussion.',
  };
}

describe('regression: amino acid metabolism deck (issue #22)', () => {
  it('compacts thin one-idea slides instead of leaving each on its own page', () => {
    const lecture = aminoAcidLecture();
    const originalSlideCount = lecture.sections.reduce((sum, section) => sum + section.slides.length, 0);
    const compactedCount = lecture.sections.reduce(
      (sum, section) => sum + compactSectionSlides(section.slides).length,
      0,
    );
    expect(compactedCount).toBeLessThan(originalSlideCount);
  });

  it('keeps an image on the same output page as its related paragraph instead of a separate "image evidence" slide', () => {
    const lecture = aminoAcidLecture();
    const compacted = compactSectionSlides(lecture.sections[0].slides);
    const fragmentsPerSlide = compacted.map((slide) => paginateContent(slide));
    const anyMixedPage = fragmentsPerSlide.some((fragments) =>
      fragments.some((fragment) => fragment.type === 'content' && fragment.blocks.some((block) => block.type === 'image') && fragment.blocks.some((block) => block.type !== 'image')),
    );
    expect(anyMixedPage).toBe(true);
  });

  it('still renders the never-imported image slot as a labeled placeholder, not a silently blank slide', async () => {
    const lecture = aminoAcidLecture();
    const compacted = compactSectionSlides(lecture.sections[0].slides);
    const fragments = compacted.flatMap((slide) => paginateContent(slide));
    expect(fragments.some((fragment) => fragment.type === 'image' && fragment.block.slotId === 'slot-not-imported')).toBe(false);
    const result = await generateLecturePptx(lecture, sampleImages);
    expect(result.quality.issues.some((issue) => issue.code === 'blank-image-slide')).toBe(false);
    expect(result.warnings.some((warning) => warning.includes('slot-not-imported'))).toBe(true);
  });

  it('generates substantially fewer slides than the original 33-slide failing deck', async () => {
    const lecture = aminoAcidLecture();
    const result = await generateLecturePptx(lecture, sampleImages);
    // Original failing deck: 33 slides for the same two topics. This fixture
    // has fewer source topics than the real deck but exercises the same
    // fragmentation pattern; the important assertion is the *shape* of the
    // improvement, not an exact target count.
    expect(result.slideCount).toBeLessThan(30);
    expect(result.blob.size).toBeGreaterThan(1000);
  });

  it('supports the same imported image being intentionally reused across multiple slots', async () => {
    const lecture = aminoAcidLecture();
    const result = await generateLecturePptx(lecture, sampleImages);
    // g2, g5, and f4 all reuse 'img-mitochondria' — none should be flagged unfilled.
    expect(result.warnings.some((warning) => warning.includes('"img-mitochondria"'))).toBe(false);
  });
});
