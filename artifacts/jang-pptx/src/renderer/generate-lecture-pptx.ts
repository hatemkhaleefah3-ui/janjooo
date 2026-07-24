import PptxGenJS from 'pptxgenjs';
import { composeSlides } from './compose-slides';
import type { LectureDocument, ImportedImage } from '../schema/lecture-types';

export interface GenerationResult {
  blob: Blob;
  warnings: string[];
}

/**
 * Generates a native editable .pptx file from a validated lecture document.
 *
 * @param lecture       - Validated LectureDocument (run validateLecture first)
 * @param importedImages - Map of image slotId → ImportedImage (data URLs)
 * @returns             - A Blob containing the .pptx file and any generation warnings
 *
 * Integration example (Jang website):
 * ```ts
 * const { blob, warnings } = await generateLecturePptx(lecture, importedImages);
 * const url = URL.createObjectURL(blob);
 * // ... trigger download ...
 * URL.revokeObjectURL(url);
 * ```
 */
export async function generateLecturePptx(
  lecture: LectureDocument,
  importedImages: Record<string, ImportedImage> = {},
): Promise<GenerationResult> {
  const warnings: string[] = [];

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33" × 7.5" (16:9 widescreen)
  pptx.author = 'Jang PPTX Engine';
  pptx.subject = lecture.documentTitle;
  pptx.title = lecture.documentTitle;

  composeSlides(pptx, lecture, importedImages, warnings);

  // Support both browser (Blob) and Node.js test environments
  let blob: Blob;
  if (typeof window !== 'undefined') {
    blob = await pptx.write({ outputType: 'blob' }) as Blob;
  } else {
    const buffer = await pptx.write({ outputType: 'nodebuffer' });
    blob = new Blob([new Uint8Array(buffer as Buffer)], {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });
  }

  return { blob, warnings };
}
