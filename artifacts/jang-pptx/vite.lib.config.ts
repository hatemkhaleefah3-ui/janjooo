import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(root, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    outDir: path.resolve(root, 'dist'),
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external: ['ajv', 'ajv-formats', 'pptxgenjs'],
    },
  },
});
