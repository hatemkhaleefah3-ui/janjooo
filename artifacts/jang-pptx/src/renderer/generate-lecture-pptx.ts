import PptxGenJS from 'pptxgenjs';
import { composeSlides } from './compose-slides';
import { validatePresentationGeometry } from './geometry-validation';
import { evaluateSlideQuality, type SlideQualityReport } from './slide-quality';
import { validateLecture } from '../schema/validate-lecture';
import { configureTheme, resetTheme, THEME, type ThemeOverrides } from '../template/theme';
import type { LectureDocument, ImportedImage } from '../schema/lecture-types';

export interface GenerationOptions {
  /** Visual-role overrides. Geometry defaults remain the preserved Jang design. */
  theme?: ThemeOverrides;
  /** Validate JSON Schema and semantic rules before rendering. Default: true. */
  validateInput?: boolean;
  /** Throw instead of warning when an object exceeds slide boundaries. */
  strictGeometry?: boolean;
  /** Throw instead of warning when slide-density/placeholder/content-preservation checks fail. */
  strictQuality?: boolean;
  /** Enable ZIP compression in the generated PPTX. Default: true. */
  compression?: boolean;
}

export interface GenerationResult {
  blob: Blob;
  warnings: string[];
  slideCount: number;
  quality: SlideQualityReport;
}

export class LectureValidationError extends Error {
  readonly validationErrors: string[];
  constructor(errors: string[]) {
    super(`Lecture document is invalid:\n${errors.map((error) => `- ${error}`).join('\n')}`);
    this.name = 'LectureValidationError';
    this.validationErrors = errors;
  }
}

let generationQueue: Promise<void> = Promise.resolve();

/**
 * Theme tokens are held in a shared mutable object for compatibility with the
 * existing renderer modules. Serialize generation so concurrent callers cannot
 * leak one presentation's fonts or colours into another presentation.
 */
function enqueueGeneration<T>(operation: () => Promise<T>): Promise<T> {
  const run = generationQueue.then(operation, operation);
  generationQueue = run.then(() => undefined, () => undefined);
  return run;
}

export function generateLecturePptx(
  lecture: LectureDocument,
  importedImages: Record<string, ImportedImage> = {},
  options: GenerationOptions = {},
): Promise<GenerationResult> {
  return enqueueGeneration(() => generateLecturePptxInternal(lecture, importedImages, options));
}

async function generateLecturePptxInternal(
  lecture: LectureDocument,
  importedImages: Record<string, ImportedImage>,
  options: GenerationOptions,
): Promise<GenerationResult> {
  const warnings: string[] = [];
  if (options.validateInput !== false) {
    const validation = validateLecture(lecture);
    warnings.push(...validation.warnings);
    if (!validation.valid) throw new LectureValidationError(validation.errors);
  }

  resetTheme();
  configureTheme(options.theme);
  try {
    const pptx = new PptxGenJS();
    const layoutName = 'JANG_WIDE';
    pptx.defineLayout({ name: layoutName, width: THEME.SLIDE_WIDTH, height: THEME.SLIDE_HEIGHT });
    pptx.layout = layoutName;
    pptx.author = 'Jang PPTX Engine';
    pptx.company = 'Jang';
    pptx.subject = lecture.documentTitle;
    pptx.title = lecture.documentTitle;
    (pptx as unknown as { lang: string }).lang = lecture.direction === 'rtl' ? 'ar-SA' : 'en-US';
    pptx.rtlMode = lecture.direction === 'rtl';
    pptx.theme = {
      headFontFace: THEME.headingFont,
      bodyFontFace: THEME.bodyFont,
      lang: lecture.direction === 'rtl' ? 'ar-SA' : 'en-US',
    } as PptxGenJS.ThemeProps;

    composeSlides(pptx, lecture, importedImages, warnings);
    const geometry = validatePresentationGeometry(pptx);
    if (geometry.checkedObjects === 0) {
      warnings.push('Geometry validation could not inspect any generated slide objects.');
    }
    if (!geometry.valid) {
      const messages = geometry.violations.map((violation) => `Geometry: ${violation}`);
      if (options.strictGeometry) throw new Error(messages.join('\n'));
      warnings.push(...messages);
    }

    const quality = evaluateSlideQuality(lecture, importedImages);
    if (!quality.valid) {
      const messages = quality.issues
        .filter((issue) => issue.code !== 'unfilled-image-slot')
        .map((issue) => `Quality: ${issue.message}`);
      if (options.strictQuality && messages.length > 0) throw new Error(messages.join('\n'));
      warnings.push(...messages);
    }
    warnings.push(...quality.issues.filter((issue) => issue.code === 'unfilled-image-slot').map((issue) => `Quality: ${issue.message}`));

    const writeOptions = { compression: options.compression !== false };
    let blob: Blob;
    const isBrowser = typeof globalThis === 'object' && 'document' in globalThis;
    if (isBrowser) {
      blob = await pptx.write({ outputType: 'blob', ...writeOptions } as never) as Blob;
    } else {
      const buffer = await pptx.write({ outputType: 'nodebuffer', ...writeOptions } as never);
      blob = new Blob([new Uint8Array(buffer as Buffer)], {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      });
    }
    const slides = (pptx as unknown as { slides?: unknown[]; _slides?: unknown[] }).slides
      ?? (pptx as unknown as { _slides?: unknown[] })._slides
      ?? [];
    return { blob, warnings: [...new Set(warnings)], slideCount: slides.length, quality };
  } finally {
    resetTheme();
  }
}
