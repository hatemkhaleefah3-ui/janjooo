/** Schema version string. Version 1.0 remains accepted for migration compatibility. */
export type SchemaVersion = "1.0" | "1.1";

export type TextEmphasis = "none" | "bold" | "italic" | "accent" | "highlight";

export interface RichTextRun {
  text: string;
  emphasis?: TextEmphasis;
}

export type RichText = string | RichTextRun[];

export interface ListItem {
  text: RichText;
  level?: number;
}

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
  endNote: RichText;
  extractionAudit?: ExtractionAudit;
}

export interface LectureOverview {
  title: string;
  introduction: RichText;
  keyPoints: RichText[];
}

export interface LectureSection {
  sectionId: string;
  sectionTitle: string;
  slides: LectureSlide[];
}

export interface LectureSlide {
  slideId: string;
  slideTitle: string;
  slideSubtitle: RichText;
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
  text: RichText;
}

export interface ParagraphBlock extends BaseBlock {
  type: "paragraph";
  text: RichText;
}

export interface BulletsBlock extends BaseBlock {
  type: "bullets";
  items: Array<string | ListItem>;
}

export interface NumberedBlock extends BaseBlock {
  type: "numbered";
  items: Array<string | ListItem>;
}

export interface CalloutBlock extends BaseBlock {
  type: "callout";
  label: RichText;
  text: RichText;
  tone: "note" | "warning" | "info";
}

export interface TableBlock extends BaseBlock {
  type: "table";
  label: RichText;
  tableType?: "standard" | "comparison" | "highlight" | "heatmap";
  headers: RichText[];
  rows: RichText[][];
  heatmap?: {
    min: number;
    max: number;
    values: number[][];
  };
}

export interface DiagramBlock extends BaseBlock {
  type: "diagram";
  label: RichText;
  diagramType?:
    | "generic"
    | "metabolic"
    | "signal-transduction"
    | "gene-regulatory"
    | "disease-pharmacology";
  diagramRows: Array<Array<string | RichTextRun[]>>;
  pathways?: DiagramPathway[];
}

export interface DiagramPathway {
  pathwayId: string;
  label: RichText;
  nodeIds: string[];
}

export interface ImageBlock extends BaseBlock {
  type: "image";
  slotId: string;
  label: RichText;
  description: RichText;
  important: boolean;
  sourceReference: string;
  fit: "contain" | "cover";
  preferredAspect: "wide" | "portrait" | "square" | "full" | "automatic";
  orientation?:
    | "automatic"
    | "transverse"
    | "longitudinal"
    | "portrait"
    | "landscape";
}

export interface ExtractionAudit {
  sourceType: "pdf" | "pptx";
  sourcePageOrSlideCount: number;
  coveredSourceReferences: string[];
  unmappedSourceReferences: string[];
  warnings: string[];
}
