/** Schema version string. Version 1.0 remains accepted for migration compatibility. */
export type SchemaVersion = '1.0' | '1.1' | '1.2';
export type TextEmphasis = 'none' | 'bold' | 'italic' | 'accent' | 'highlight';

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
  direction: 'ltr' | 'rtl';
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
  /** Short explanatory paragraph shown beneath the section-title rule. */
  sectionDefinition?: RichText;
  slides: LectureSlide[];
}
export interface LectureSlide {
  slideId: string;
  /** User-facing title. The legacy property name is retained for compatibility. */
  slideTitle: string;
  /** Short definition paragraph rendered below the title rule. */
  titleDefinition?: RichText;
  slideSubtitle: RichText;
  /** Short definition paragraph rendered directly below the top-level sub-title. */
  subtitleDefinition?: RichText;
  sourceReferences: string[];
  blocks: LectureBlock[];
}

export type LectureBlock = TitleBlock | SubtitleBlock | ParagraphBlock | BulletsBlock | NumberedBlock | CalloutBlock | TableBlock | DiagramBlock | ImageBlock;
export interface BaseBlock { blockId: string; sourceReferences: string[]; }
/** A logical title group retained when adjacent source topics share one physical slide. */
export interface TitleBlock extends BaseBlock { type: 'title'; text: RichText; definition?: RichText; }
export interface SubtitleBlock extends BaseBlock { type: 'subtitle'; text: RichText; definition?: RichText; }
export interface ParagraphBlock extends BaseBlock { type: 'paragraph'; text: RichText; }
export interface BulletsBlock extends BaseBlock { type: 'bullets'; items: Array<string | ListItem>; }
export interface NumberedBlock extends BaseBlock {
  type: 'numbered';
  items: Array<string | ListItem>;
  /** First visible number. Pagination updates this so numbering continues. */
  startAt?: number;
}
export interface CalloutBlock extends BaseBlock { type: 'callout'; label: RichText; text: RichText; tone: 'note' | 'warning' | 'info'; }
export interface TableBlock extends BaseBlock {
  type: 'table';
  label: RichText;
  tableType?: 'standard' | 'comparison' | 'highlight' | 'heatmap';
  headers: RichText[];
  rows: RichText[][];
  heatmap?: { min: number; max: number; values: number[][]; };
}
export interface DiagramBlock extends BaseBlock {
  type: 'diagram';
  label: RichText;
  diagramType?: 'generic' | 'metabolic' | 'signal-transduction' | 'gene-regulatory' | 'disease-pharmacology';
  diagramRows: Array<Array<string | RichTextRun[]>>;
  pathways?: DiagramPathway[];
}
export interface DiagramPathway { pathwayId: string; label: RichText; nodeIds: string[]; }
export interface ImageBlock extends BaseBlock {
  type: 'image';
  slotId: string;
  label: RichText;
  description: RichText;
  important: boolean;
  sourceReference: string;
  fit: 'contain' | 'cover';
  preferredAspect: 'wide' | 'portrait' | 'square' | 'full' | 'automatic';
  orientation?: 'automatic' | 'transverse' | 'longitudinal' | 'portrait' | 'landscape';
  /** Controls whether filling the frame is safe or whether labels must remain uncropped. */
  visualType?: 'photo' | 'decorative' | 'pathway' | 'chart' | 'microscopy' | 'radiology' | 'anatomy' | 'diagram' | 'other';
}

export interface ExtractionAudit {
  sourceType: 'pdf' | 'pptx';
  sourcePageOrSlideCount: number;
  coveredSourceReferences: string[];
  unmappedSourceReferences: string[];
  warnings: string[];
}
