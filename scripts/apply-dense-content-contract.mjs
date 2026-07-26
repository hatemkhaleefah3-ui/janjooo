import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

async function read(path) {
  return readFile(resolve(root, path), 'utf8');
}

async function write(path, content) {
  const target = resolve(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, 'utf8');
}

async function replaceRequired(path, search, replacement, label) {
  const source = await read(path);
  if (!source.includes(search)) throw new Error(`Missing ${label} in ${path}`);
  await write(path, source.replace(search, replacement));
}

async function replaceAllRequired(path, search, replacement, label) {
  const source = await read(path);
  if (!source.includes(search)) throw new Error(`Missing ${label} in ${path}`);
  await write(path, source.replaceAll(search, replacement));
}

await replaceRequired(
  'artifacts/jang-pptx/src/layout/title-spacing.ts',
  `/** Three CSS pixels expressed in PowerPoint inches (96 CSS px per inch). */\nexport const TITLE_RULE_GAP = 3 / 96;\n\n/** Places the decorative rule exactly 3 px below the measured title. */`,
  `/** Two CSS pixels expressed in PowerPoint inches (96 CSS px per inch). */\nexport const CONTENT_GAP = 2 / 96;\nexport const TITLE_RULE_GAP = CONTENT_GAP;\n\n/** Places the decorative rule exactly 2 px below the measured title. */`,
  'three-pixel title rule',
);

await replaceRequired(
  'artifacts/jang-pptx/src/template/theme.ts',
  `  BLOCK_GAP: 0.18,\n  TITLE_HEIGHT: 0.62,\n  DIVIDER_HEIGHT: 0.012,\n  DIVIDER_GAP: 0.18,\n  SUBTITLE_HEIGHT: 0.34,\n  SUBTITLE_GAP: 0.15,`,
  `  BLOCK_GAP: 2 / 96,\n  TITLE_HEIGHT: 0.62,\n  DIVIDER_HEIGHT: 0.012,\n  DIVIDER_GAP: 2 / 96,\n  SUBTITLE_HEIGHT: 0.34,\n  SUBTITLE_GAP: 2 / 96,`,
  'theme vertical gaps',
);

await replaceRequired(
  'artifacts/jang-pptx/src/layout/plan-content-slide.ts',
  `import { measureTextBoxHeight, ruleYAfterTitle } from './title-spacing';`,
  `import { CONTENT_GAP, measureTextBoxHeight, ruleYAfterTitle } from './title-spacing';`,
  'content spacing import',
);
await replaceRequired(
  'artifacts/jang-pptx/src/layout/plan-content-slide.ts',
  `const TITLE_DEFINITION_GAP = 0.1;\nconst HEADING_SECTION_GAP = 0.14;\nconst SUBTITLE_DEFINITION_GAP = 0.05;`,
  `const TITLE_DEFINITION_GAP = CONTENT_GAP;\nconst HEADING_SECTION_GAP = CONTENT_GAP;\nconst SUBTITLE_DEFINITION_GAP = CONTENT_GAP;`,
  'content heading gaps',
);
await replaceRequired(
  'artifacts/jang-pptx/src/layout/plan-content-slide.ts',
  `      0.32,\n      0.85,`,
  `      0.52,\n      0.82,`,
  'top-level title definition height',
);
await replaceRequired(
  'artifacts/jang-pptx/src/layout/plan-content-slide.ts',
  `  const definitionHeight = hasText(block.definition)\n      ? measureTextBoxHeight(block.definition!, textWidth, THEME.FONT_CALLOUT_TEXT, 0.3, 0.82, 0.02)`,
  `  const definitionHeight = hasText(block.definition)\n      ? measureTextBoxHeight(block.definition!, textWidth, THEME.FONT_CALLOUT_TEXT, 0.52, 0.82, 0.02)`,
  'inline title definition height',
);
await replaceRequired(
  'artifacts/jang-pptx/src/layout/plan-content-slide.ts',
  `function companionPriority(block: LectureBlock): number {\n  switch (block.type) {\n    case 'image': return 0;\n    case 'table': return 1;\n    case 'bullets':\n    case 'numbered': return 2;\n    case 'callout': return 3;\n    default: return Number.POSITIVE_INFINITY;\n  }\n}\n\nexport function selectRightSideCompanion(blocks: LectureBlock[]): LectureBlock | undefined {\n  let selected: LectureBlock | undefined;\n  let rank = Number.POSITIVE_INFINITY;\n  for (const block of blocks) {\n    const current = companionPriority(block);\n    if (current < rank) {\n      selected = block;\n      rank = current;\n    }\n  }\n  return selected;\n}`,
  `export function selectRightSideCompanion(blocks: LectureBlock[]): LectureBlock | undefined {\n  const image = blocks.find((block) => block.type === 'image');\n  if (image) return image;\n\n  // Lists and notes belong in the normal left reading flow. A table uses the\n  // right column only when related explanatory content can occupy the left.\n  const table = blocks.find((block) => block.type === 'table');\n  return table && blocks.some((block) => block !== table) ? table : undefined;\n}`,
  'right companion priority',
);
await replaceRequired(
  'artifacts/jang-pptx/src/layout/plan-content-slide.ts',
  ` * The planner chooses a right-side companion by image → table → list → note.\n * With no supported companion, all existing content uses the full width.`,
  ` * The planner reserves the right side only for an image or a table with\n * related explanatory content. Lists and notes remain in the left reading flow.`,
  'companion documentation',
);

await replaceRequired(
  'artifacts/jang-pptx/src/renderer/compact-slides.ts',
  `const MERGE_BUDGET_RATIO = 0.85;`,
  `const MERGE_BUDGET_RATIO = 0.95;`,
  'merge budget ratio',
);
await replaceRequired(
  'artifacts/jang-pptx/src/renderer/compact-slides.ts',
  `return Math.max(0.5, getAvailableHeight(true, true) - 0.55) * MERGE_BUDGET_RATIO;`,
  `return Math.max(0.5, getAvailableHeight(true, true) - 0.25) * MERGE_BUDGET_RATIO;`,
  'merge budget headroom',
);
await replaceRequired(
  'artifacts/jang-pptx/src/renderer/compact-slides.ts',
  ` * Leaves headroom so a merge doesn't immediately force an awkward\n * continuation split right after compaction.`,
  ` * Targets a dense page near 90% utilization while retaining a small safety\n * reserve so the immutable physical planner remains the final authority.`,
  'merge budget documentation',
);

await replaceRequired(
  'artifacts/jang-pptx/src/layout/plan-lecture-slide.ts',
  `      // A new logical title may remain on this physical slide only when the\n      // preceding natural content footprint uses 50% or less of the available\n      // content area. Sub-titles do not trigger this boundary rule.`,
  `      // Keep compatible title groups together until the preceding natural\n      // content footprint exceeds the preferred 90% utilization target.`,
  'title boundary documentation',
);
await replaceRequired(
  'artifacts/jang-pptx/src/layout/plan-lecture-slide.ts',
  `if (prior && prior.naturalUtilization > 0.5 + 0.001) break;`,
  `if (prior && prior.naturalUtilization > 0.9 + 0.001) break;`,
  'title boundary threshold',
);

await write(
  'artifacts/jang-pptx/src/schema/lecture-title-terms.ts',
  `import type { LectureDocument } from './lecture-types';\nimport { richTextToPlain } from '../renderer/rich-text';\n\n/** Ordered, unique user-facing titles only — never section titles or sub-titles. */\nexport function collectOrderedTitleTerms(lecture: LectureDocument): string[] {\n  const terms: string[] = [];\n  const seen = new Set<string>();\n  const remember = (value: unknown): void => {\n    const text = richTextToPlain(value as never).trim();\n    const key = text.toLocaleLowerCase();\n    if (!text || seen.has(key)) return;\n    seen.add(key);\n    terms.push(text);\n  };\n\n  for (const section of lecture.sections) {\n    for (const slide of section.slides) {\n      remember(slide.slideTitle);\n      for (const block of slide.blocks) {\n        if (block.type === 'title') remember(block.text);\n      }\n    }\n  }\n  return terms;\n}\n`,
);

await replaceRequired(
  'artifacts/jang-pptx/src/layout/plan-presentation.ts',
  `import { planLectureSlide, type PlannedLectureSlideFragment } from './plan-lecture-slide';`,
  `import { planLectureSlide, type PlannedLectureSlideFragment } from './plan-lecture-slide';\nimport { collectOrderedTitleTerms } from '../schema/lecture-title-terms';`,
  'title terms import in presentation planner',
);
await replaceRequired(
  'artifacts/jang-pptx/src/layout/plan-presentation.ts',
  `      // Key terms are deterministic: exactly one item per section title.\n      keyPoints: lecture.sections.map((section) => section.sectionTitle),`,
  `      // Overview key terms are all ordered user-facing titles, excluding\n      // section titles and sub-titles.\n      keyPoints: collectOrderedTitleTerms(lecture),`,
  'presentation key terms',
);

await replaceRequired(
  'artifacts/jang-pptx/src/schema/validate-lecture.ts',
  `import { listItemLevel, normalizeRichText, richTextToPlain } from '../renderer/rich-text';`,
  `import { listItemLevel, normalizeRichText, richTextToPlain } from '../renderer/rich-text';\nimport { collectOrderedTitleTerms } from './lecture-title-terms';`,
  'title terms validator import',
);
await replaceRequired(
  'artifacts/jang-pptx/src/schema/validate-lecture.ts',
  `    const expectedKeyTerms = doc.sections.map((section) => section.sectionTitle.trim());`,
  `    const expectedKeyTerms = collectOrderedTitleTerms(doc).map((title) => title.trim());`,
  'validator expected key terms',
);
await replaceRequired(
  'artifacts/jang-pptx/src/schema/validate-lecture.ts',
  `errors.push('overview.keyPoints must exactly match the ordered section titles in schema 1.2');`,
  `errors.push('overview.keyPoints must exactly match all ordered titles, excluding section titles and sub-titles, in schema 1.2');`,
  'validator key term message',
);

await replaceRequired(
  'artifacts/jang-pptx/src/renderer/render-overview.ts',
  `import { measureTextBoxHeight } from '../layout/title-spacing';`,
  `import { CONTENT_GAP, measureTextBoxHeight, ruleYAfterTitle } from '../layout/title-spacing';`,
  'overview spacing import',
);
await replaceRequired(
  'artifacts/jang-pptx/src/renderer/render-overview.ts',
  `  const introY = OVERVIEW_LAYOUT.TITLE_Y + titleHeight + 0.18;`,
  `  const titleRuleY = ruleYAfterTitle(OVERVIEW_LAYOUT.TITLE_Y, titleHeight);\n  const introY = titleRuleY + CONTENT_GAP;`,
  'overview intro position',
);
await replaceRequired(
  'artifacts/jang-pptx/src/renderer/render-overview.ts',
  `  if (hasIntroduction) {`,
  `  slide.addShape('line' as PptxGenJS.SHAPE_NAME, {\n    x: OVERVIEW_LAYOUT.TITLE_X, y: titleRuleY, w: 1.12, h: 0,\n    line: { color: THEME.DARK_TEXT, width: 1.4 },\n  });\n\n  if (hasIntroduction) {`,
  'overview title rule',
);
await replaceRequired(
  'artifacts/jang-pptx/src/renderer/render-overview.ts',
  `const sectionListY = Math.max(2.82, introY + introHeight + 0.18);`,
  `const sectionListY = Math.max(2.82, introY + introHeight + CONTENT_GAP);`,
  'overview section gap',
);
await replaceRequired(
  'artifacts/jang-pptx/src/renderer/render-overview.ts',
  `  const keyTerms = lecture.sections.map((section) => section.sectionTitle);`,
  `  const keyTerms = lecture.overview.keyPoints.map((item) => richTextToPlain(item)).filter(Boolean);`,
  'overview title terms',
);
await replaceRequired(
  'artifacts/jang-pptx/src/renderer/render-overview.ts',
  `paraSpaceAfter: 9,`,
  `paraSpaceAfter: 2,`,
  'overview key term spacing',
);

await replaceRequired(
  'artifacts/jang-pptx/src/renderer/render-section.ts',
  `import { measureTextBoxHeight, ruleYAfterTitle } from '../layout/title-spacing';`,
  `import { CONTENT_GAP, measureTextBoxHeight, ruleYAfterTitle } from '../layout/title-spacing';`,
  'section spacing import',
);
await replaceRequired(
  'artifacts/jang-pptx/src/renderer/render-section.ts',
  `addEditorialHeader(slide, \`Section \${String(sectionIndex + 1).padStart(2, '0')}\`, section.sectionTitle, true);`,
  `addEditorialHeader(slide, section.sectionTitle, \`Section \${String(sectionIndex + 1).padStart(2, '0')}\`, true);`,
  'section header title',
);
await replaceRequired(
  'artifacts/jang-pptx/src/renderer/render-section.ts',
  `    const definitionY = ruleY + 0.12;`,
  `    const definitionY = ruleY + CONTENT_GAP;`,
  'section definition gap',
);
await replaceRequired(
  'artifacts/jang-pptx/src/renderer/render-section.ts',
  `      0.38,\n      1.05,`,
  `      0.84,\n      1.42,`,
  'section definition height',
);

await replaceAllRequired(
  'artifacts/jang-pptx/src/tests/hierarchical-layout.test.ts',
  `three pixels`,
  `two pixels`,
  'hierarchical two-pixel test name',
);
await replaceAllRequired(
  'artifacts/jang-pptx/src/tests/hierarchical-layout.test.ts',
  `3 / 96`,
  `2 / 96`,
  'hierarchical gap assertions',
);
await replaceRequired(
  'artifacts/jang-pptx/src/tests/hierarchical-layout.test.ts',
  `  it('selects the right companion by image, table, list, then note', () => {\n    const blocks = [paragraph(), note(), list(), table(), image()];\n    expect(selectRightSideCompanion(blocks)?.type).toBe('image');\n    expect(selectRightSideCompanion(blocks.filter((block) => block.type !== 'image'))?.type).toBe('table');\n    expect(selectRightSideCompanion([paragraph(), note(), list()])?.type).toBe('bullets');\n    expect(selectRightSideCompanion([paragraph(), note()])?.type).toBe('callout');\n  });`,
  `  it('keeps lists and notes in the left flow unless an image or supported table is present', () => {\n    const blocks = [paragraph(), note(), list(), table(), image()];\n    expect(selectRightSideCompanion(blocks)?.type).toBe('image');\n    expect(selectRightSideCompanion(blocks.filter((block) => block.type !== 'image'))?.type).toBe('table');\n    expect(selectRightSideCompanion([paragraph(), note(), list()])).toBeUndefined();\n    expect(selectRightSideCompanion([note()])).toBeUndefined();\n    expect(selectRightSideCompanion([list()])).toBeUndefined();\n  });`,
  'companion behavior test',
);
await replaceRequired(
  'artifacts/jang-pptx/src/tests/hierarchical-layout.test.ts',
  `starts a new physical slide for a title after more than 50% prior use`,
  `starts a new physical slide for a title after more than 90% prior use`,
  '90 percent title boundary test name',
);
await replaceRequired(
  'artifacts/jang-pptx/src/tests/hierarchical-layout.test.ts',
  `.repeat(18)`,
  `.repeat(40)`,
  'long density fixture',
);
await replaceRequired(
  'artifacts/jang-pptx/src/tests/hierarchical-layout.test.ts',
  `toBeGreaterThan(0.5);`,
  `toBeGreaterThan(0.9);`,
  '90 percent density assertion',
);
await replaceRequired(
  'artifacts/jang-pptx/src/tests/hierarchical-layout.test.ts',
  `allows a title to remain mid-slide after 50% or less prior use`,
  `allows a title to remain mid-slide at 90% or less prior use`,
  'inline title density test name',
);
await replaceRequired(
  'artifacts/jang-pptx/src/tests/hierarchical-layout.test.ts',
  `expect(overview.lecture.overview.keyPoints).toEqual(['First section', 'Second section']);`,
  `expect(overview.lecture.overview.keyPoints).toEqual(['A', 'B']);`,
  'overview title terms assertion',
);

await replaceRequired(
  'artifacts/jang-pptx/src/tests/schema.test.ts',
  `overview: { title: 'Overview', introduction: 'Sequence', keyPoints: ['Metabolism'] },`,
  `overview: { title: 'Overview', introduction: 'Sequence', keyPoints: ['Glycine pathways', 'Clinical consequences'] },`,
  'valid schema title terms',
);
await replaceRequired(
  'artifacts/jang-pptx/src/tests/schema.test.ts',
  `requires definitions and exact section-title key terms for schema 1.2`,
  `requires definitions and exact ordered title terms for schema 1.2`,
  'schema test title',
);

await write(
  'artifacts/jang-pptx/src/tests/dense-content-contract.test.ts',
  `import { describe, expect, it } from 'vitest';\nimport { CONTENT_GAP, TITLE_RULE_GAP } from '../layout/title-spacing';\nimport { collectOrderedTitleTerms } from '../schema/lecture-title-terms';\nimport type { LectureDocument } from '../schema/lecture-types';\n\ndescribe('dense content contract', () => {\n  it('uses an exact two-pixel vertical rhythm', () => {\n    expect(CONTENT_GAP).toBeCloseTo(2 / 96, 10);\n    expect(TITLE_RULE_GAP).toBeCloseTo(2 / 96, 10);\n  });\n\n  it('collects every ordered title without section titles or sub-titles', () => {\n    const lecture: LectureDocument = {\n      schemaVersion: '1.2', documentTitle: 'Lecture', direction: 'ltr',\n      overview: { title: 'Overview', introduction: 'Intro', keyPoints: [] },\n      sections: [{\n        sectionId: 's', sectionTitle: 'Excluded section', sectionDefinition: 'A complete section definition explaining the scope in multiple sentences.',\n        slides: [{\n          slideId: 'a', slideTitle: 'First title', titleDefinition: 'Definition for the first title.',\n          slideSubtitle: 'Excluded sub-title', subtitleDefinition: 'Definition for the sub-title.', sourceReferences: ['p1'],\n          blocks: [\n            { blockId: 'p', type: 'paragraph', text: 'Text', sourceReferences: ['p1'] },\n            { blockId: 't', type: 'title', text: 'Second title', definition: 'Definition for the second title.', sourceReferences: ['p1'] },\n          ],\n        }],\n      }], endNote: 'End',\n    };\n    expect(collectOrderedTitleTerms(lecture)).toEqual(['First title', 'Second title']);\n  });\n});\n`,
);

await rm(resolve(root, 'scripts/apply-dense-content-contract.mjs'), { force: true });
await rm(resolve(root, '.github/workflows/apply-dense-content-contract.yml'), { force: true });
console.log('Applied dense content and spacing contract.');
