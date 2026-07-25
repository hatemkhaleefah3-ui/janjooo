/** Public API for the deterministic Jang PPTX engine. */
export { generateLecturePptx, LectureValidationError } from './renderer/generate-lecture-pptx';
export type {
  GenerationOptions,
  GenerationResult,
} from './renderer/generate-lecture-pptx';

export { validateLecture, lectureSchema } from './schema/validate-lecture';
export type { ValidationResult } from './schema/validate-lecture';

export {
  DEFAULT_THEME,
  THEME,
  configureTheme,
  resetTheme,
} from './template/theme';
export type { JangTheme, ThemeOverrides } from './template/theme';

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
  DiagramPathway,
  ImageBlock,
  ListItem,
  RichText,
  RichTextRun,
  TextEmphasis,
  SchemaVersion,
} from './schema/lecture-types';
