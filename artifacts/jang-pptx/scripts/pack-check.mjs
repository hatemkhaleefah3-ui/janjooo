import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function run(command, args, cwd, options = {}) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', stdio: options.capture ? 'pipe' : 'inherit' });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed${result.stderr ? `\n${result.stderr}` : ''}`);
  }
  return result.stdout ?? '';
}

const packageRoot = resolve('.');
const packDir = resolve('generated', 'package');
await rm(packDir, { recursive: true, force: true });
await mkdir(packDir, { recursive: true });
run('pnpm', ['pack', '--pack-destination', packDir], packageRoot);
const tarballs = (await readdir(packDir)).filter((name) => name.endsWith('.tgz'));
if (tarballs.length !== 1) throw new Error(`Expected one package tarball, found ${tarballs.length}`);
const tarball = resolve(packDir, tarballs[0]);

const consumer = await mkdtemp(resolve(tmpdir(), 'jang-pptx-consumer-'));
try {
  await writeFile(resolve(consumer, 'package.json'), JSON.stringify({ name: 'jang-pptx-clean-consumer', private: true, type: 'module' }, null, 2));
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball], consumer);
  await writeFile(resolve(consumer, 'verify.mjs'), `
import { writeFile } from 'node:fs/promises';
import schema from '@jang/pptx-engine/schema' with { type: 'json' };
import { generateLecturePptx, validateLecture, LectureValidationError } from '@jang/pptx-engine';

if (!schema.$schema || typeof generateLecturePptx !== 'function' || typeof LectureValidationError !== 'function') {
  throw new Error('Public package exports are incomplete');
}
const lecture = {
  schemaVersion: '1.1', documentTitle: 'Clean consumer test', direction: 'ltr',
  overview: { title: 'Overview', introduction: 'Installed tarball', keyPoints: ['Works'] },
  sections: [{ sectionId: 's', sectionTitle: 'Section', slides: [{
    slideId: 'sl', slideTitle: 'Consumer slide', slideSubtitle: '', sourceReferences: [],
    blocks: [{ blockId: 'p', type: 'paragraph', text: 'Generated from a clean consumer.', sourceReferences: [] }],
  }] }], endNote: 'Done',
};
const validation = validateLecture(lecture);
if (!validation.valid) throw new Error(validation.errors.join('\\n'));
const result = await generateLecturePptx(lecture, {}, { strictGeometry: true });
if (result.blob.size < 4000 || result.slideCount < 5) throw new Error('Generated package output is incomplete');
await writeFile('consumer-output.pptx', Buffer.from(await result.blob.arrayBuffer()));
console.log(JSON.stringify({ slideCount: result.slideCount, bytes: result.blob.size }));
`);
  run('node', ['verify.mjs'], consumer);
  const output = await readFile(resolve(consumer, 'consumer-output.pptx'));
  if (output.length < 4000) throw new Error('Clean consumer output was not written');
  console.log(`Verified ${basename(tarball)} in clean consumer (${output.length} bytes)`);
} finally {
  await rm(consumer, { recursive: true, force: true });
}
