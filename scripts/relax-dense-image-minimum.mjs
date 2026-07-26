import { readFile, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const target = resolve(root, 'artifacts/jang-pptx/src/layout/plan-content-slide.ts');
const source = await readFile(target, 'utf8');
const search = `  const imageAreaH = Math.max(1.2, SAFE_BOTTOM - imageAreaY - captionReserve - 0.01);`;
const replacement = `  const imageAreaH = Math.max(1.1, SAFE_BOTTOM - imageAreaY - captionReserve - 0.01);`;
if (!source.includes(search)) throw new Error('Missing wrapped-title image minimum.');
await writeFile(target, source.replace(search, replacement), 'utf8');
await rm(resolve(root, 'scripts/relax-dense-image-minimum.mjs'), { force: true });
await rm(resolve(root, '.github/workflows/relax-dense-image-minimum.yml'), { force: true });
