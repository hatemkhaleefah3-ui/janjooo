import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import JSZip from 'jszip';

const input = resolve(process.argv[2] ?? 'generated/jang-pptx-engine-sample.pptx');
const bytes = await readFile(input);
const zip = await JSZip.loadAsync(bytes);
const required = ['[Content_Types].xml', 'ppt/presentation.xml', 'ppt/theme/theme1.xml'];
for (const path of required) {
  if (!zip.file(path)) throw new Error(`Missing required PPTX part: ${path}`);
}

const slideNames = Object.keys(zip.files)
  .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
  .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));
if (slideNames.length < 6) throw new Error(`Expected at least 6 slides, found ${slideNames.length}`);

const slideXml = (await Promise.all(slideNames.map((name) => zip.file(name).async('string')))).join('\n');
const checks = {
  editableText: /<a:t>/.test(slideXml),
  nativeBullets: /<a:buChar\b/.test(slideXml),
  nativeNumbering: /<a:buAutoNum\b/.test(slideXml),
  editableTable: /<a:tbl>/.test(slideXml),
  editableArrowLine: /<(?:p:sp|p:cxnSp)\b/.test(slideXml) && /(?:headEnd|tailEnd)[^>]*type="(?:triangle|arrow|stealth)"/.test(slideXml),
  embeddedPicture: /<p:pic>/.test(slideXml),
};
for (const [name, passed] of Object.entries(checks)) {
  if (!passed) throw new Error(`PPTX structural check failed: ${name}`);
}

const presentationXml = await zip.file('ppt/presentation.xml').async('string');
const size = /<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/.exec(presentationXml);
if (!size) throw new Error('Could not read slide dimensions from ppt/presentation.xml');
const widthInches = Number(size[1]) / 914400;
const heightInches = Number(size[2]) / 914400;
if (Math.abs(widthInches - 13.33) > 0.01 || Math.abs(heightInches - 7.5) > 0.01) {
  throw new Error(`Unexpected slide size ${widthInches.toFixed(3)} × ${heightInches.toFixed(3)} inches`);
}

console.log(JSON.stringify({ input, bytes: bytes.length, slideCount: slideNames.length, widthInches, heightInches, checks }, null, 2));
