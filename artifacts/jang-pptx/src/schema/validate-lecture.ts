import Ajv, { type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import lectureSchemaJson from './lecture-schema.json';
import type { LectureDocument, ImageBlock, TableBlock, DiagramBlock, RichText, ListItem } from './lecture-types';
import { listItemLevel, normalizeRichText, richTextToPlain } from '../renderer/rich-text';

export const lectureSchema: object = lectureSchemaJson;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const ajv = new Ajv({ allErrors: true, strict: false });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(addFormats as any)(ajv);
const ajvValidate = ajv.compile(lectureSchemaJson);

const GENERIC_LABEL_RE = [
  /^image$/i,
  /^figure$/i,
  /^picture$/i,
  /^lecture image$/i,
  /^important image$/i,
  /^diagram$/i,
  /^page image$/i,
  /^image\s*\d+$/i,
  /^figure\s*\d+$/i,
  /^img$/i,
  /^pic$/i,
];

function isGenericLabel(label: string): boolean {
  return GENERIC_LABEL_RE.some((re) => re.test(label.trim()));
}

function formatAjvError(error: ErrorObject): string {
  const path = error.instancePath || '(root)';
  if (error.keyword === 'minItems') {
    if (path.endsWith('/slides')) return `${path}: section has no slides`;
    if (path.endsWith('/blocks')) return `${path}: slide has no blocks`;
    if (path.includes('/diagramRows/')) return `${path}: diagram has an empty row`;
  }
  if (error.keyword === 'minLength' && path.includes('/diagramRows/')) {
    return `${path}: diagram has an empty node`;
  }
  return `${path}: ${error.message}`;
}

/**
 * Validates a raw lecture object against the JSON Schema and semantic rules.
 * Returns a structured result with errors (blocking) and warnings (non-blocking).
 */
export function validateLecture(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ─── JSON Schema validation ───────────────────────────────────────────────
  const schemaValid = ajvValidate(data);
  if (!schemaValid && ajvValidate.errors) {
    for (const err of ajvValidate.errors) {
      errors.push(formatAjvError(err));
    }
    return { valid: false, errors, warnings };
  }

  // ─── Semantic validation ──────────────────────────────────────────────────
  const doc = data as LectureDocument;

  if (!doc.documentTitle.trim()) {
    errors.push('documentTitle must not be empty');
  }

  const sectionIds = new Set<string>();
  const slideIds = new Set<string>();
  const blockIds = new Set<string>();
  const imageSlotIds = new Set<string>();
  const imageLabels = new Set<string>();
  const nonEmptySlideTitles = new Set<string>();

  for (const section of doc.sections) {
    if (sectionIds.has(section.sectionId)) {
      errors.push(`Duplicate sectionId: "${section.sectionId}"`);
    }
    sectionIds.add(section.sectionId);

    if (!section.sectionTitle.trim()) {
      errors.push(`Section "${section.sectionId}" has an empty sectionTitle`);
    }

    if (section.slides.length === 0) {
      errors.push(`Section "${section.sectionId}" has no slides`);
    }

    for (const slide of section.slides) {
      if (slideIds.has(slide.slideId)) {
        errors.push(`Duplicate slideId: "${slide.slideId}"`);
      }
      slideIds.add(slide.slideId);

      const titleTrimmed = slide.slideTitle.trim();
      if (titleTrimmed) {
        if (nonEmptySlideTitles.has(titleTrimmed)) {
          errors.push(`Repeated non-empty slide title: "${titleTrimmed}"`);
        }
        nonEmptySlideTitles.add(titleTrimmed);
      }

      if (slide.blocks.length === 0) {
        errors.push(`Slide "${slide.slideId}" has no blocks`);
      }

      for (const block of slide.blocks) {
        if (blockIds.has(block.blockId)) {
          errors.push(`Duplicate blockId: "${block.blockId}"`);
        }
        blockIds.add(block.blockId);

        if (block.type === 'image') {
          const img = block as ImageBlock;

          if (imageSlotIds.has(img.slotId)) {
            errors.push(`Duplicate image slotId: "${img.slotId}"`);
          }
          imageSlotIds.add(img.slotId);

          if (!richTextToPlain(img.label).trim()) {
            errors.push(`Image block "${img.blockId}" has no label`);
          } else {
            if (isGenericLabel(richTextToPlain(img.label))) {
              warnings.push(
              `Image block "${img.blockId}" has a generic label: "${richTextToPlain(img.label)}". Use a specific descriptive label (e.g. "Mitochondria electron micrograph").`,
              );
            }
            const labelLower = richTextToPlain(img.label).toLowerCase().trim();
            if (imageLabels.has(labelLower)) {
              warnings.push(`Duplicate image label: "${richTextToPlain(img.label)}"`);
            }
            imageLabels.add(labelLower);
          }
        }

        if (block.type === 'table') {
          const tbl = block as TableBlock;
          if (!richTextToPlain(tbl.label).trim()) {
            errors.push(`Table block "${tbl.blockId}" has no label`);
          }
          for (let ri = 0; ri < tbl.rows.length; ri++) {
            if (tbl.rows[ri].length !== tbl.headers.length) {
              errors.push(
                `Table block "${tbl.blockId}" row ${ri} has ${tbl.rows[ri].length} cells but ${tbl.headers.length} headers`,
              );
            }
          }
        }

        if (block.type === 'diagram') {
          const dia = block as DiagramBlock;
          if (!richTextToPlain(dia.label).trim()) {
            errors.push(`Diagram block "${dia.blockId}" has no label`);
          }
          for (let ri = 0; ri < dia.diagramRows.length; ri++) {
            for (let ni = 0; ni < dia.diagramRows[ri].length; ni++) {
              if (!richTextToPlain(dia.diagramRows[ri][ni]).trim()) {
                errors.push(
                  `Diagram block "${dia.blockId}" has an empty node at row ${ri}, position ${ni}`,
                );
              }
            }
          }
        }
      }
    }
  }

  // Rich text and list semantics are validated separately so errors point to
  // the exact lecture location instead of AJV's nested oneOf branches.
  for (const section of doc.sections) {
    for (const slide of section.slides) {
      for (const block of slide.blocks) {
        const richValues: Array<[string, RichText]> = [];
        if (block.type === 'paragraph' || block.type === 'subtitle') richValues.push(['text', block.text]);
        if (block.type === 'callout') richValues.push(['label', block.label], ['text', block.text]);
        if (block.type === 'image') richValues.push(['label', block.label], ['description', block.description]);
        if (block.type === 'table') richValues.push(['label', block.label], ...block.headers.map((v, i) => [`headers[${i}]`, v] as [string, RichText]), ...block.rows.flatMap((r, ri) => r.map((v, ci) => [`rows[${ri}][${ci}]`, v] as [string, RichText])));
        if (block.type === 'diagram') richValues.push(['label', block.label], ...block.diagramRows.flatMap((r, ri) => r.map((v, ni) => [`diagramRows[${ri}][${ni}]`, v] as [string, RichText])));
        for (const [path, value] of richValues) {
          for (const [index, run] of normalizeRichText(value).entries()) {
            if (!run.text) errors.push(`${block.blockId}.${path}[${index}].text must not be empty`);
          }
        }
        if (block.type === 'bullets' || block.type === 'numbered') {
          let previousLevel = 0;
          block.items.forEach((item: string | ListItem, index) => {
            const level = listItemLevel(item);
            if (!Number.isInteger(level) || level < 0) errors.push(`${block.blockId}.items[${index}].level must be a non-negative integer`);
            if (level - previousLevel > 1) warnings.push(`${block.blockId}.items[${index}] jumps more than one nesting level`);
            previousLevel = level;
          });
        }
        if (block.type === 'table' && block.tableType === 'heatmap' && block.heatmap) {
          if (block.heatmap.max <= block.heatmap.min) errors.push(`${block.blockId}.heatmap.max must be greater than min`);
          if (block.heatmap.values.length !== block.rows.length) {
            errors.push(`${block.blockId}.heatmap.values must match row count`);
          }
          block.heatmap.values.forEach((row, rowIndex) => {
            if (row.length !== block.headers.length) {
              errors.push(`${block.blockId}.heatmap.values[${rowIndex}] must match column count`);
            }
          });
        }
      }
    }
  }

  if (doc.extractionAudit) {
    const covered = new Set(doc.extractionAudit.coveredSourceReferences);
    const unmapped = new Set(doc.extractionAudit.unmappedSourceReferences);
    for (const ref of unmapped) if (covered.has(ref)) errors.push(`Source reference "${ref}" cannot be both covered and unmapped`);
    const allRefs = new Set<string>();
    for (const section of doc.sections) {
      for (const slide of section.slides) {
        slide.sourceReferences.forEach((ref) => allRefs.add(ref));
        slide.blocks.forEach((block) => block.sourceReferences.forEach((ref) => allRefs.add(ref)));
      }
    }
    for (const ref of allRefs) {
      if (!covered.has(ref) && !unmapped.has(ref)) {
        warnings.push(`Extraction audit: source reference "${ref}" is not covered or unmapped`);
      }
    }
  }

  // ─── Extraction audit warnings ────────────────────────────────────────────
  if (doc.extractionAudit) {
    for (const ref of doc.extractionAudit.unmappedSourceReferences) {
      warnings.push(`Source reference not mapped to any block: "${ref}"`);
    }
    for (const w of doc.extractionAudit.warnings) {
      warnings.push(`Extraction audit: ${w}`);
    }
  }

  const uniqueErrors = [...new Set(errors)];
  const uniqueWarnings = [...new Set(warnings)];
  return { valid: uniqueErrors.length === 0, errors: uniqueErrors, warnings: uniqueWarnings };
}

