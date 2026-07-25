import PptxGenJS from 'pptxgenjs';
import { composeSlides } from './compose-slides';
import { validatePresentationGeometry } from './geometry-validation';
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
  /** Enable ZIP compression in the generated PPTX. Default: true. */
  compression?: boolean;
}

export interface GenerationResult {
  blob: Blob;
  warnings: string[];
  slideCount: number;
}

export class LectureValidationError extends Error {
  readonly validationErrors: string[];
  constructor(errors: string[]) {
    super(`Lecture document is invalid:\n${errors.map((error) => `- ${error}`).join('\n')}`);
    this.name = 'LectureValidationError';
    this.validationErrors = errors;
  }
}

export async function generateLecturePptx(
  lecture: LectureDocument,
  importedImages: Record<string, ImportedImage> = {},
  options: GenerationOptions = {},
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
    pptx.layout = 'LAYOUT_WIDE';
    pptx.author = 'Jang PPTX Engine';
    (pptx as unknown as { company: string }).company = 'Jang';
    pptx.subject = lecture.documentTitle;
    pptx.title = lecture.documentTitle;
    (pptx as unknown as { lang: string }).lang = lecture.direction === 'rtl' ? 'ar-SA' : 'en-US';
    (pptx as unknown as { rtlMode: boolean }).rtlMode = lecture.direction === 'rtl';
    (pptx as unknown as { theme: Record<string, string> }).theme = {
      headFontFace: THEME.headingFont,
      bodyFontFace: THEME.bodyFont,
      lang: lecture.direction === 'rtl' ? 'ar-SA' : 'en-US',
    };

    composeSlides(pptx, lecture, importedImages, warnings);
    const geometry = validatePresentationGeometry(pptx);
    if (!geometry.valid) {
      const messages = geometry.violations.map((violation) => `Geometry: ${violation}`);
      if (options.strictGeometry) throw new Error(messages.join('\n'));
      warnings.push(...messages);
    }

    const writeOptions = { compression: options.compression !== false };
    let blob: Blob;
    if (typeof window !== 'undefined') {
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
    return { blob, warnings: [...new Set(warnings)], slideCount: slides.length };
  } finally {
    resetTheme();
  }
}
