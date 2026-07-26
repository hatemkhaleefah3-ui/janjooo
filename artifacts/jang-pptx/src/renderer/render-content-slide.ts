import PptxGenJS from 'pptxgenjs';
import { THEME } from '../template/theme';
import { addEditorialFooter, addEditorialHeader } from '../template/editorial';
import { addTableToSlide } from './render-table';
import { addDiagramToSlide } from './render-diagram';
import { paintImageIntoArea } from './render-image';
import { calloutBorderColor, calloutLabelColor, calloutLabelText } from './render-text';
import type { ImportedImage } from '../schema/lecture-types';
import type {
  ContentSlideRenderPlan,
  PlannedContentBlock,
  PlannedTextElement,
} from '../layout/slide-render-plan';
import { listTextRuns, richTextRuns } from './rich-text';

function renderPlannedText(
  slide: PptxGenJS.Slide,
  item: PlannedTextElement,
  options: PptxGenJS.TextPropsOptions,
): void {
  slide.addText(richTextRuns(item.text), { ...item.box, ...options });
}

function renderDefinition(
  slide: PptxGenJS.Slide,
  text: Parameters<typeof richTextRuns>[0],
  box: NonNullable<PlannedContentBlock['definitionBox']>,
): void {
  slide.addText(richTextRuns(text), {
    ...box,
    fontFace: THEME.bodyFont,
    fontSize: THEME.FONT_CALLOUT_TEXT,
    color: THEME.MUTED_TEXT,
    margin: 0,
    align: 'left',
    valign: 'top',
    wrap: true,
    fit: 'shrink',
  });
}

function renderBlock(slide: PptxGenJS.Slide, item: PlannedContentBlock): void {
  const { block, box } = item;
  switch (block.type) {
    case 'title':
      slide.addText(richTextRuns(block.text), {
        ...(item.textBox ?? box),
        fontFace: THEME.headingFont,
        fontSize: THEME.FONT_SLIDE_TITLE,
        bold: true,
        color: THEME.DARK_TEXT,
        margin: 0,
        align: 'left',
        valign: 'top',
        wrap: true,
        fit: 'shrink',
      });
      if (item.ruleBox) {
        slide.addShape('line' as PptxGenJS.SHAPE_NAME, {
          ...item.ruleBox,
          line: { color: THEME.DARK_TEXT, width: 1.4 },
        });
      }
      if (block.definition && item.definitionBox) {
        renderDefinition(slide, block.definition, item.definitionBox);
      }
      break;
    case 'subtitle':
      slide.addText(richTextRuns(block.text), {
        ...(item.textBox ?? box),
        fontFace: THEME.headingFont,
        fontSize: THEME.FONT_SUBTITLE_BLOCK,
        bold: true,
        color: THEME.DARK_TEXT,
        margin: 0,
        align: 'left',
        valign: 'top',
        wrap: true,
        fit: 'shrink',
      });
      if (block.definition && item.definitionBox) {
        renderDefinition(slide, block.definition, item.definitionBox);
      }
      break;
    case 'paragraph':
      slide.addText(richTextRuns(block.text), {
        ...box,
        fontFace: THEME.bodyFont,
        fontSize: THEME.FONT_PARAGRAPH,
        color: THEME.BODY_TEXT,
        margin: 0,
        align: 'left',
        valign: 'top',
        wrap: true,
        paraSpaceAfter: 7,
        breakLine: false,
        fit: 'shrink',
      } as PptxGenJS.TextPropsOptions);
      break;
    case 'bullets':
      slide.addText(listTextRuns(block.items, 'bullet'), {
        ...box,
        fontFace: THEME.bodyFont,
        fontSize: THEME.FONT_BULLET,
        color: THEME.BODY_TEXT,
        margin: 0.01,
        align: 'left',
        valign: 'top',
        wrap: true,
        paraSpaceAfter: 8,
        fit: 'shrink',
      } as PptxGenJS.TextPropsOptions);
      break;
    case 'numbered':
      slide.addText(listTextRuns(block.items, 'number', block.startAt ?? 1), {
        ...box,
        fontFace: THEME.bodyFont,
        fontSize: THEME.FONT_NUMBERED,
        color: THEME.BODY_TEXT,
        margin: 0.01,
        align: 'left',
        valign: 'top',
        wrap: true,
        paraSpaceAfter: 8,
        fit: 'shrink',
      } as PptxGenJS.TextPropsOptions);
      break;
    case 'callout': {
      const border = calloutBorderColor(block.tone);
      const labelColor = calloutLabelColor(block.tone);
      slide.addShape('line' as PptxGenJS.SHAPE_NAME, {
        x: box.x,
        y: box.y,
        w: 0,
        h: box.h,
        line: { color: border, width: 1.6 },
      });
      slide.addText([
        { text: `${calloutLabelText(block.tone)} / `, options: { bold: true, color: labelColor } },
        ...richTextRuns(block.label),
      ], {
        x: box.x + 0.2,
        y: box.y + 0.02,
        w: box.w - 0.2,
        h: 0.22,
        fontFace: THEME.labelFont,
        fontSize: THEME.FONT_CALLOUT_LABEL,
        bold: true,
        charSpacing: 1.1,
        color: labelColor,
        margin: 0,
        align: 'left',
        valign: 'top',
        fit: 'shrink',
      });
      slide.addText(richTextRuns(block.text), {
        x: box.x + 0.2,
        y: box.y + 0.3,
        w: box.w - 0.2,
        h: Math.max(0.18, box.h - 0.32),
        fontFace: THEME.bodyFont,
        fontSize: THEME.FONT_CALLOUT_TEXT,
        color: THEME.BODY_TEXT,
        margin: 0,
        align: 'left',
        valign: 'top',
        wrap: true,
        fit: 'shrink',
      });
      break;
    }
    case 'table':
      addTableToSlide(slide, block, box.x, box.y, box.w, box.h);
      break;
    case 'diagram':
      addDiagramToSlide(slide, block, box.x, box.y, box.w, box.h);
      break;
    case 'image':
      throw new Error('Image blocks must be represented by plan.image, not a planned content block.');
  }
}

/** Renders the exact immutable physical contract chosen by the planner. */
export function renderContentSlide(
  pptx: PptxGenJS,
  plan: ContentSlideRenderPlan,
  importedImages: Record<string, ImportedImage> = {},
  warnings: string[] = [],
): void {
  const slide = pptx.addSlide();
  slide.background = { color: THEME.SLIDE_BG };
  addEditorialHeader(slide, 'Lecture content', plan.sectionTitle);

  if (plan.title) {
    renderPlannedText(slide, plan.title, {
      fontFace: THEME.headingFont,
      fontSize: THEME.FONT_SLIDE_TITLE,
      bold: true,
      color: THEME.DARK_TEXT,
      margin: 0,
      align: 'left',
      valign: 'top',
      wrap: true,
      fit: 'shrink',
    });
  }
  if (plan.titleRule) {
    slide.addShape('line' as PptxGenJS.SHAPE_NAME, {
      ...plan.titleRule.box,
      line: { color: THEME.DARK_TEXT, width: 1.4 },
    });
  }
  if (plan.titleDefinition) {
    renderPlannedText(slide, plan.titleDefinition, {
      fontFace: THEME.bodyFont,
      fontSize: THEME.FONT_CALLOUT_TEXT,
      color: THEME.MUTED_TEXT,
      margin: 0,
      align: 'left',
      valign: 'top',
      wrap: true,
      fit: 'shrink',
    });
  }
  if (plan.subtitle) {
    renderPlannedText(slide, plan.subtitle, {
      fontFace: THEME.headingFont,
      fontSize: THEME.FONT_SLIDE_SUBTITLE,
      bold: true,
      color: THEME.DARK_TEXT,
      margin: 0,
      align: 'left',
      valign: 'top',
      wrap: true,
      fit: 'shrink',
    });
  }
  if (plan.subtitleDefinition) {
    renderPlannedText(slide, plan.subtitleDefinition, {
      fontFace: THEME.bodyFont,
      fontSize: THEME.FONT_CALLOUT_TEXT,
      color: THEME.MUTED_TEXT,
      margin: 0,
      align: 'left',
      valign: 'top',
      wrap: true,
      fit: 'shrink',
    });
  }

  if (plan.image) {
    const result = paintImageIntoArea(
      slide,
      plan.image.block,
      importedImages,
      plan.image.box.x,
      plan.image.box.y,
      plan.image.box.w,
      plan.image.box.h,
    );
    warnings.push(...result.warnings);

    if (plan.image.label) {
      renderPlannedText(slide, plan.image.label, {
        fontFace: THEME.headingFont,
        fontSize: 10,
        bold: true,
        color: THEME.DARK_TEXT,
        margin: 0,
        align: 'left',
        valign: 'top',
        wrap: true,
        fit: 'shrink',
      });
    }
    if (plan.image.description) {
      renderPlannedText(slide, plan.image.description, {
        fontFace: THEME.bodyFont,
        fontSize: 9,
        color: THEME.BODY_TEXT,
        margin: 0,
        align: 'left',
        valign: 'top',
        wrap: true,
        fit: 'shrink',
      });
    }
    if (plan.image.source) {
      renderPlannedText(slide, plan.image.source, {
        fontFace: THEME.bodyFont,
        fontSize: THEME.FONT_CAPTION,
        italic: true,
        color: THEME.CAPTION_COLOR,
        margin: 0,
        align: 'left',
        valign: 'top',
        fit: 'shrink',
      });
    }
  }

  if (plan.imageCompanionLabel) {
    renderPlannedText(slide, plan.imageCompanionLabel, {
      fontFace: THEME.headingFont,
      fontSize: THEME.FONT_SUBTITLE_BLOCK,
      bold: true,
      color: THEME.DARK_TEXT,
      margin: 0,
      align: 'left',
      valign: 'top',
      wrap: true,
      fit: 'shrink',
    });
  }
  if (plan.imageCompanionDescription) {
    renderPlannedText(slide, plan.imageCompanionDescription, {
      fontFace: THEME.bodyFont,
      fontSize: THEME.FONT_PARAGRAPH,
      color: THEME.BODY_TEXT,
      margin: 0,
      align: 'left',
      valign: 'top',
      wrap: true,
      fit: 'shrink',
    });
  }

  for (const item of plan.blocks) renderBlock(slide, item);
  if (plan.companion) renderBlock(slide, plan.companion);

  addEditorialFooter(slide, plan.sectionTitle);
}
