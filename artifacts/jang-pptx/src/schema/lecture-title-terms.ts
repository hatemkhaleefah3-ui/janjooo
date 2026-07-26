import type { LectureDocument, RichText } from './lecture-types';
import { richTextToPlain } from '../renderer/rich-text';

/** Ordered, unique user-facing titles only — never section titles or sub-titles. */
export function collectOrderedTitleTerms(lecture: LectureDocument): string[] {
  const terms: string[] = [];
  const seen = new Set<string>();

  const remember = (value: RichText): void => {
    const text = richTextToPlain(value).trim();
    const key = text.toLocaleLowerCase();
    if (!text || seen.has(key)) return;
    seen.add(key);
    terms.push(text);
  };

  for (const section of lecture.sections) {
    for (const slide of section.slides) {
      remember(slide.slideTitle);
      for (const block of slide.blocks) {
        if (block.type === 'title') remember(block.text);
      }
    }
  }

  return terms;
}
