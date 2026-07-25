import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const destination = resolve('dist', 'lecture-schema.json');
await mkdir(resolve('dist'), { recursive: true });
await copyFile(resolve('src', 'schema', 'lecture-schema.json'), destination);
console.log(`Copied JSON Schema to ${destination}`);
