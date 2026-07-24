/**
 * Jang PPTX Template Engine — Integration Module
 *
 * Usage in the Jang website:
 * ```ts
 * import { generateLecturePptx, validateLecture, lectureSchema } from './jang-pptx-engine';
 *
 * // 1. Validate extracted Gemini output
 * const result = validateLecture(geminiOutput);
 * if (!result.valid) throw new Error(result.errors.join('\n'));
 *
 * // 2. Generate the PPTX after user imports images
 * const { blob, warnings } = await generateLecturePptx(lecture, importedImages);
 *
 * // 3. Trigger download
 * const url = URL.createObjectURL(blob);
 * const a = document.createElement('a');
 * a.href = url;
 * a.download = `${lecture.documentTitle}.pptx`;
 * a.click();
 * URL.revokeObjectURL(url);
 * ```
 *
 * See README.md for instructions on exporting this engine to another project.
 */

export { generateLecturePptx } from './renderer/generate-lecture-pptx';
export type { GenerationResult } from './renderer/generate-lecture-pptx';

export { validateLecture, lectureSchema } from './schema/validate-lecture';
export type { ValidationResult } from './schema/validate-lecture';

export type {
  LectureDocument,
  LectureSection,
  LectureSlide,
  LectureBlock,
  LectureOverview,
  ImportedImage,
  ExtractionAudit,
  BaseBlock,
  SubtitleBlock,
  ParagraphBlock,
  BulletsBlock,
  NumberedBlock,
  CalloutBlock,
  TableBlock,
  DiagramBlock,
  ImageBlock,
  SchemaVersion,
} from './schema/lecture-types';
