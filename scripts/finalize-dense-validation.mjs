import { readFile, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const path = 'artifacts/jang-pptx/src/layout/plan-content-slide.ts';
const target = resolve(root, path);
const source = await readFile(target, 'utf8');
const search = `  const imageAreaH = Math.max(1.2, SAFE_BOTTOM - imageAreaY - captionReserve);`;
const replacement = `  const imageAreaH = Math.max(1.2, SAFE_BOTTOM - imageAreaY - captionReserve - 0.01);`;
if (!source.includes(search)) throw new Error('Missing image-area safety calculation.');
await writeFile(target, source.replace(search, replacement), 'utf8');
await rm(resolve(root, 'scripts/finalize-dense-validation.mjs'), { force: true });
await rm(resolve(root, '.github/workflows/finalize-dense-validation.yml'), { force: true });
console.log('Applied final dense geometry reserve.');
