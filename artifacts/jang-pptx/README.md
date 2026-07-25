# Jang PPTX Engine

A deterministic TypeScript renderer that converts structured lecture JSON into a native, editable `.pptx` file. It uses PptxGenJS directly; it does not convert HTML or screenshots into slides.

The existing Jang visual design is preserved: navy section bands, gold accents, editable cover/overview/section/content/ending slides, callouts, tables, pathway diagrams, image slides, and consistent spacing.

## Installation

```bash
pnpm add @jang/pptx-engine
```

The package supports Node.js 20+ and modern browsers.

## Public API

```ts
import {
  generateLecturePptx,
  validateLecture,
  type LectureDocument,
  type ImportedImage,
} from '@jang/pptx-engine';

const validation = validateLecture(rawLecture);
if (!validation.valid) {
  throw new Error(validation.errors.join('\n'));
}

const images: Record<string, ImportedImage> = {
  'image-slot-1': {
    dataUrl: 'data:image/png;base64,...',
    fileName: 'figure.png',
    mimeType: 'image/png',
  },
};

const { blob, warnings, slideCount } = await generateLecturePptx(
  rawLecture as LectureDocument,
  images,
  {
    strictGeometry: true,
    theme: {
      bodyFont: 'Aptos',
      headingFont: 'Aptos Display',
      NAVY: '1E3A5F',
      GOLD: 'C9922A',
    },
  },
);
```

In a browser, download `blob` with `URL.createObjectURL`. In Node.js, write `Buffer.from(await blob.arrayBuffer())`.

## Rendering guarantees

- Source blocks remain in deterministic order.
- Long paragraphs, callouts, bullets, numbered lists, inline tables, and diagrams are split into continuation pages rather than discarded.
- Numbered-list continuations retain their starting number.
- Wide tables repeat the header and continue across dedicated slides.
- Large diagrams continue across slides and use editable PowerPoint line shapes with arrowheads.
- Image `contain` and `cover` modes preserve aspect ratio. PNG, JPEG, GIF, WebP, and SVG data URLs are validated before embedding.
- Missing or malformed images produce editable placeholders and warnings.
- Rendered object geometry is inspected before serialization; strict mode converts boundary violations into errors.
- Text, shapes, table cells, connectors, and captions remain editable.

## Schema

The JSON Schema is exported as `lectureSchema` and is also published at:

```text
@jang/pptx-engine/schema
```

Schema versions `1.0` and `1.1` are accepted. Version `1.1` adds structured rich text, nested list items, table display roles, domain diagram metadata, image orientation metadata, and extraction auditing. Plain strings remain valid for migration compatibility.

## Rich text

A rich text value can remain a string or use editable runs:

```json
[
  { "text": "Important ", "emphasis": "bold" },
  { "text": "concept", "emphasis": "accent" }
]
```

Supported emphasis values are `none`, `bold`, `italic`, `accent`, and `highlight`.

## Development

From the repository root:

```bash
pnpm install
pnpm --filter @jang/pptx-engine typecheck
pnpm --filter @jang/pptx-engine test
pnpm --filter @jang/pptx-engine build
pnpm --filter @jang/pptx-engine sample
```

Generated output appears in `artifacts/jang-pptx/generated/`.

The React demo is retained and built separately into `dist/demo`. The reusable library is emitted to `dist/` with JavaScript, source maps, and TypeScript declarations.

## Package verification

```bash
pnpm --filter @jang/pptx-engine pack:check
```

GitHub Actions also installs the packed tarball into a clean consumer project, imports the public API, validates lecture JSON, generates a real PPTX, and inspects the OOXML ZIP structure.

## Known limits

PowerPoint performs final font substitution according to fonts installed on the viewing machine. The engine does not embed font binaries. Very complex free-form diagrams are represented through the deterministic row/pathway model rather than arbitrary graph layout.
