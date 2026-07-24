import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import lectureSchemaJson from './lecture-schema.json';
import type { LectureDocument, ImageBlock, TableBlock, DiagramBlock } from './lecture-types';

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
      const path = err.instancePath || '(root)';
      errors.push(`${path}: ${err.message}`);
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

          if (!img.label || !img.label.trim()) {
            errors.push(`Image block "${img.blockId}" has no label`);
          } else {
            if (isGenericLabel(img.label)) {
              warnings.push(
                `Image block "${img.blockId}" has a generic label: "${img.label}". Use a specific descriptive label (e.g. "Mitochondria electron micrograph").`,
              );
            }
            const labelLower = img.label.toLowerCase().trim();
            if (imageLabels.has(labelLower)) {
              warnings.push(`Duplicate image label: "${img.label}"`);
            }
            imageLabels.add(labelLower);
          }
        }

        if (block.type === 'table') {
          const tbl = block as TableBlock;
          if (!tbl.label || !tbl.label.trim()) {
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
          if (!dia.label || !dia.label.trim()) {
            errors.push(`Diagram block "${dia.blockId}" has no label`);
          }
          for (let ri = 0; ri < dia.diagramRows.length; ri++) {
            for (let ni = 0; ni < dia.diagramRows[ri].length; ni++) {
              if (!dia.diagramRows[ri][ni].trim()) {
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

  // ─── Extraction audit warnings ────────────────────────────────────────────
  if (doc.extractionAudit) {
    for (const ref of doc.extractionAudit.unmappedSourceReferences) {
      warnings.push(`Source reference not mapped to any block: "${ref}"`);
    }
    for (const w of doc.extractionAudit.warnings) {
      warnings.push(`Extraction audit: ${w}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
