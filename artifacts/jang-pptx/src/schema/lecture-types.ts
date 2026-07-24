/** Schema version string – must be "1.0" */
export type SchemaVersion = "1.0";

export interface ImportedImage {
  dataUrl: string;
  fileName?: string;
  mimeType?: string;
}

export interface LectureDocument {
  schemaVersion: SchemaVersion;
  documentTitle: string;
  direction: "ltr" | "rtl";
  overview: LectureOverview;
  sections: LectureSection[];
  endNote: string;
  extractionAudit?: ExtractionAudit;
}

export interface LectureOverview {
  title: string;
  introduction: string;
  keyPoints: string[];
}

export interface LectureSection {
  sectionId: string;
  sectionTitle: string;
  slides: LectureSlide[];
}

export interface LectureSlide {
  slideId: string;
  slideTitle: string;
  slideSubtitle: string;
  sourceReferences: string[];
  blocks: LectureBlock[];
}

export type LectureBlock =
  | SubtitleBlock
  | ParagraphBlock
  | BulletsBlock
  | NumberedBlock
  | CalloutBlock
  | TableBlock
  | DiagramBlock
  | ImageBlock;

export interface BaseBlock {
  blockId: string;
  sourceReferences: string[];
}

export interface SubtitleBlock extends BaseBlock {
  type: "subtitle";
  text: string;
}

export interface ParagraphBlock extends BaseBlock {
  type: "paragraph";
  text: string;
}

export interface BulletsBlock extends BaseBlock {
  type: "bullets";
  items: string[];
}

export interface NumberedBlock extends BaseBlock {
  type: "numbered";
  items: string[];
}

export interface CalloutBlock extends BaseBlock {
  type: "callout";
  label: string;
  text: string;
  tone: "note" | "warning" | "info";
}

export interface TableBlock extends BaseBlock {
  type: "table";
  label: string;
  headers: string[];
  rows: string[][];
}

export interface DiagramBlock extends BaseBlock {
  type: "diagram";
  label: string;
  diagramRows: string[][];
}

export interface ImageBlock extends BaseBlock {
  type: "image";
  slotId: string;
  label: string;
  description: string;
  important: boolean;
  sourceReference: string;
  fit: "contain" | "cover";
  preferredAspect: "wide" | "portrait" | "square" | "full" | "automatic";
}

export interface ExtractionAudit {
  sourceType: "pdf" | "pptx";
  sourcePageOrSlideCount: number;
  coveredSourceReferences: string[];
  unmappedSourceReferences: string[];
  warnings: string[];
}
