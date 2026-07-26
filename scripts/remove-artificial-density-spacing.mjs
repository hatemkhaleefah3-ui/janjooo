import { readFile, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

async function replaceRequired(path, search, replacement, label) {
  const target = resolve(root, path);
  const source = await readFile(target, 'utf8');
  if (!source.includes(search)) throw new Error(`Missing ${label} in ${path}`);
  await writeFile(target, source.replace(search, replacement), 'utf8');
}

async function removeRange(path, startMarker, endMarker, label) {
  const target = resolve(root, path);
  const source = await readFile(target, 'utf8');
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error(`Missing ${label} range in ${path}`);
  await writeFile(target, `${source.slice(0, start)}${source.slice(end)}`, 'utf8');
}

await replaceRequired(
  'artifacts/jang-pptx/src/layout/plan-content-slide.ts',
  `const MIN_CONTENT_UTILIZATION = 0.6;\n`,
  ``,
  'minimum utilization constant',
);

await removeRange(
  'artifacts/jang-pptx/src/layout/plan-content-slide.ts',
  `/**\n * Keeps inherently short pages above the 60% minimum`,
  `/**\n * Converts one already-selected content page`,
  'artificial sparse-plan expansion',
);

await replaceRequired(
  'artifacts/jang-pptx/src/layout/plan-content-slide.ts',
  `  const naturalBottom = plannedBottom(plan);\n  plan.naturalUtilization = Math.max(0, (naturalBottom - contentStartY) / Math.max(0.01, plan.contentBounds.h));\n  expandSparsePlan(plan);\n  const finalBottom = plannedBottom(plan);\n  plan.utilization = Math.max(0, (finalBottom - contentStartY) / Math.max(0.01, plan.contentBounds.h));`,
  `  const naturalBottom = plannedBottom(plan);\n  plan.naturalUtilization = Math.max(0, (naturalBottom - contentStartY) / Math.max(0.01, plan.contentBounds.h));\n  // Never fake density by stretching gaps or text boxes. Compaction and the\n  // extraction contract create real content density; quality checks flag any\n  // remaining sparse page while the exact two-pixel rhythm remains intact.\n  plan.utilization = plan.naturalUtilization;`,
  'final utilization calculation',
);

await replaceRequired(
  'artifacts/jang-pptx/src/layout/slide-render-plan.ts',
  `  if (plan.utilization < 0.599 || plan.utilization > 1.001) {\n    violations.push(\`Content utilization ${'${plan.utilization.toFixed(3)}'} is outside the required 0.60–1.00 range.\`);\n  }`,
  `  if (plan.utilization > 1.001) {\n    violations.push(\`Content utilization ${'${plan.utilization.toFixed(3)}'} exceeds the physical 1.00 limit.\`);\n  }`,
  'render-plan utilization validation',
);

await replaceRequired(
  'artifacts/jang-pptx/src/tests/hierarchical-layout.test.ts',
  `  it('keeps final normal-slide utilization between 60% and 100%', () => {\n    const plan = createContentSlideRenderPlan([paragraph()], input);\n    expect(plan.naturalUtilization).toBeLessThan(plan.utilization);\n    expect(plan.utilization).toBeGreaterThanOrEqual(0.6 - 0.001);\n    expect(plan.utilization).toBeLessThanOrEqual(1 + 0.001);\n    expect(validateContentSlideRenderPlan(plan)).toEqual([]);\n  });`,
  `  it('preserves exact spacing instead of faking density on an inherently short topic', () => {\n    const plan = createContentSlideRenderPlan([paragraph()], input);\n    expect(plan.utilization).toBeCloseTo(plan.naturalUtilization, 10);\n    expect(plan.utilization).toBeLessThan(0.6);\n    expect(validateContentSlideRenderPlan(plan)).toEqual([]);\n  });`,
  'natural density regression',
);

await replaceRequired(
  'artifacts/jang-pptx/src/tests/dense-content-contract.test.ts',
  `import { CONTENT_GAP, TITLE_RULE_GAP } from '../layout/title-spacing';`,
  `import { CONTENT_GAP, TITLE_RULE_GAP } from '../layout/title-spacing';\nimport { THEME } from '../template/theme';`,
  'theme import',
);
await replaceRequired(
  'artifacts/jang-pptx/src/tests/dense-content-contract.test.ts',
  `    expect(TITLE_RULE_GAP).toBeCloseTo(2 / 96, 10);`,
  `    expect(TITLE_RULE_GAP).toBeCloseTo(2 / 96, 10);\n    expect(THEME.BLOCK_GAP).toBeCloseTo(2 / 96, 10);\n    expect(THEME.SUBTITLE_GAP).toBeCloseTo(2 / 96, 10);`,
  'exact block gap assertions',
);

await rm(resolve(root, 'scripts/remove-artificial-density-spacing.mjs'), { force: true });
await rm(resolve(root, '.github/workflows/verify-exact-density-spacing.yml'), { force: true });
