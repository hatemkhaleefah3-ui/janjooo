# Plan-first PPTX architecture

## Purpose

Jang keeps the approved premium academic design and replaces the fragile physical-layout mechanism underneath it. The previous pipeline estimated page height in one module and then recalculated widths, vertical positions, image caption reserve, table rows, and diagram nodes inside renderers. A successful pagination decision therefore did not guarantee that the actual PowerPoint objects used the same geometry.

The plan-first architecture creates the complete deck and all variable object boxes before PptxGenJS is touched.

## Pipeline

```text
LectureDocument
  -> section compaction
  -> semantic block splitting
  -> ordered PresentationRenderPlan
       -> ContentSlideRenderPlan
       -> DedicatedImageSlideRenderPlan
       -> DedicatedTableSlideRenderPlan
       -> DedicatedDiagramSlideRenderPlan
  -> plan validation and quality evaluation
  -> native editable PPTX rendering from the same boxes
  -> OOXML inspection
  -> LibreOffice visual-review artifact
```

## Design preservation

This work is not a replacement with a basic template. It preserves:

- the approved black, graphite, paper, and neutral palette;
- Aptos/Aptos Display/Georgia typography roles;
- editorial headers, rules, footers, section pages, overview, cover, and ending;
- mixed text-and-image layouts and image-evidence pages;
- native editable PowerPoint text, shapes, tables, diagrams, and images;
- table variants, heatmap fills, diagram emphasis, and source captions.

The planner owns physical decisions; the renderer owns visual styling and PowerPoint object creation.

## Invariants

1. A renderer must not choose a page boundary.
2. A renderer must not advance an independent vertical cursor for planned slides.
3. Imported image bytes may affect only painting inside a planned image box, never pagination.
4. A later image may join preceding text only if the complete narrowed-column plan validates.
5. Tables paginate by measured wrapped row height, not a fixed number of rows.
6. Dedicated diagram nodes and connectors have explicit boxes before rendering.
7. Quality checks evaluate the plans used by production rendering.
8. No planned content box may cross the editorial safe bottom.
9. Content order, list numbering, table rows, source references, and image slots must be preserved.

## External mechanisms studied

The implementation is original to Jang, informed by publicly available mechanisms:

- Presenton: one JSON/scene model shared by editor and export paths;
- PptxGenJS: specialized, line- and row-aware table pagination;
- SlideGen: separate outliner, mapper, arranger, and refiner responsibilities;
- DeepSlides: design-first planning followed by implementation and evaluation.

No external repository is copied wholesale. Any future direct reuse must retain the applicable open-source notice.

## Review gates

A change is not ready for the application until it passes:

- TypeScript library and demo checks;
- unit, content-preservation, geometry, and OOXML tests;
- library and standalone browser builds;
- generated PPTX inspection;
- LibreOffice PDF/PNG rendering uploaded as a PR artifact;
- application CSP transformation and Cloudflare production build after integration.
