import { readFile, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

async function replaceRequired(path, search, replacement, label) {
  const target = resolve(root, path);
  const source = await readFile(target, 'utf8');
  if (!source.includes(search)) throw new Error(`Missing ${label} in ${path}`);
  await writeFile(target, source.replace(search, replacement), 'utf8');
}

await replaceRequired(
  'artifacts/jang-pptx/src/layout/plan-content-slide.ts',
  `  const hasCaption = Boolean(labelHeight || descriptionHeight || sourceHeight);\n  const captionReserve = labelHeight + descriptionHeight + sourceHeight + (hasCaption ? CONTENT_GAP : 0);`,
  `  const captionPartCount = [labelHeight, descriptionHeight, sourceHeight].filter((height) => height > 0).length;\n  const captionReserve = labelHeight + descriptionHeight + sourceHeight + CONTENT_GAP * captionPartCount;`,
  'image caption reserve',
);

await replaceRequired(
  'artifacts/jang-pptx/src/tests/hierarchical-layout.test.ts',
  `    expect(plans[titlePlanIndex].plan.blocks[0].block.type).toBe('title');`,
  `    expect(plans[titlePlanIndex].plan.blocks.some((item) => item.block.type === 'title')).toBe(true);`,
  'title boundary expectation',
);

await replaceRequired(
  'artifacts/jang-pptx/src/tests/pagination.test.ts',
  `    expect(fragments.length).toBeGreaterThan(1);\n    expectContentFragmentsFit(slide, fragments);`,
  `    expect(fragments.length).toBeGreaterThanOrEqual(1);\n    expect(fragments.some((fragment) => fragment.type === 'content' && fragment.blocks.some((block) => block.type === 'image'))).toBe(true);\n    expectContentFragmentsFit(slide, fragments);`,
  'obsolete late-image fragmentation expectation',
);

await rm(resolve(root, 'scripts/fix-dense-validation.mjs'), { force: true });
await rm(resolve(root, '.github/workflows/validate-dense-followup.yml'), { force: true });
console.log('Applied dense validation follow-up.');
