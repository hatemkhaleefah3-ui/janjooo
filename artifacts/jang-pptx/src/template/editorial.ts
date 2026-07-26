import PptxGenJS from 'pptxgenjs';
import { THEME } from './theme';
import { CONTENT_X, CONTENT_WIDTH, SLIDE_NUMBER_X, SLIDE_NUMBER_Y } from './geometry';

export function addEditorialHeader(
  slide: PptxGenJS.Slide,
  label: string,
  section = '',
  dark = false,
): void {
  if (!dark) {
    slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
      x: 0, y: 0, w: THEME.SLIDE_WIDTH, h: 0.94,
      fill: { color: THEME.NAVY }, line: { color: THEME.NAVY, width: 0 },
    });
    slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
      x: 0, y: 0.9, w: THEME.SLIDE_WIDTH, h: 0.04,
      fill: { color: THEME.MID_GRAY }, line: { color: THEME.MID_GRAY, width: 0 },
    });
  }

  const foreground = THEME.WHITE;
  const muted = THEME.MUTED_ON_DARK;
  slide.addShape('line' as PptxGenJS.SHAPE_NAME, {
    x: CONTENT_X, y: 0.32, w: 0.46, h: 0,
    line: { color: foreground, width: 1.2 },
  });
  slide.addText(label.toUpperCase(), {
    x: CONTENT_X, y: 0.49, w: 5.6, h: 0.18,
    fontFace: THEME.labelFont, fontSize: THEME.FONT_SECTION_HEADER,
    bold: true, charSpacing: 1.8, color: foreground, margin: 0,
    align: 'left', valign: 'top',
  });
  if (section) {
    slide.addText(section.toUpperCase(), {
      x: 8.1, y: 0.49, w: 4.55, h: 0.18,
      fontFace: THEME.labelFont, fontSize: THEME.FONT_SECTION_HEADER,
      bold: true, charSpacing: 1.2, color: muted, margin: 0,
      align: 'right', valign: 'top', fit: 'shrink',
    });
  }
}

export function addEditorialFooter(
  slide: PptxGenJS.Slide,
  label: string,
  dark = false,
): void {
  if (!dark) {
    slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
      x: 0, y: 6.82, w: THEME.SLIDE_WIDTH, h: THEME.SLIDE_HEIGHT - 6.82,
      fill: { color: THEME.GRAPHITE }, line: { color: THEME.GRAPHITE, width: 0 },
    });
    slide.addShape('rect' as PptxGenJS.SHAPE_NAME, {
      x: 0, y: 6.82, w: THEME.SLIDE_WIDTH, h: 0.035,
      fill: { color: THEME.MID_GRAY }, line: { color: THEME.MID_GRAY, width: 0 },
    });
  } else {
    slide.addShape('line' as PptxGenJS.SHAPE_NAME, {
      x: CONTENT_X, y: 6.87, w: CONTENT_WIDTH, h: 0,
      line: { color: THEME.DARK_RULE, width: 0.5 },
    });
  }

  const foreground = THEME.MUTED_ON_DARK;
  slide.addText(label.toUpperCase(), {
    x: CONTENT_X, y: 7.01, w: 4.6, h: 0.14,
    fontFace: THEME.labelFont, fontSize: THEME.FONT_SLIDE_NUMBER,
    bold: true, charSpacing: 1.35, color: foreground, margin: 0,
    align: 'left', valign: 'top', fit: 'shrink',
  });
  slide.slideNumber = {
    x: SLIDE_NUMBER_X, y: SLIDE_NUMBER_Y, w: 0.55, h: 0.16,
    fontFace: THEME.labelFont, fontSize: THEME.FONT_SLIDE_NUMBER,
    bold: true, color: foreground, align: 'right', margin: 0,
  } as PptxGenJS.TextPropsOptions;
}

/** Native editable abstract artwork used on cover and closing slides. */
export function addOrbitArtwork(
  slide: PptxGenJS.Slide,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const cx = x + w * 0.53;
  const cy = y + h * 0.48;
  const ringSizes = [0.82, 0.61, 0.39];
  ringSizes.forEach((ratio, index) => {
    const rw = w * ratio;
    const rh = Math.min(h * ratio, rw);
    slide.addShape('ellipse' as PptxGenJS.SHAPE_NAME, {
      x: cx - rw / 2, y: cy - rh / 2, w: rw, h: rh,
      fill: { color: THEME.GRAPHITE, transparency: 100 },
      line: { color: index === 1 ? THEME.MID_GRAY : THEME.DARK_RULE, width: index === 1 ? 1.2 : 0.8, transparency: 18 },
    });
  });
  slide.addShape('line' as PptxGenJS.SHAPE_NAME, {
    x: x + w * 0.12, y: cy, w: w * 0.78, h: 0,
    line: { color: THEME.DARK_RULE, width: 0.8, transparency: 15 },
  });
  slide.addShape('line' as PptxGenJS.SHAPE_NAME, {
    x: cx, y: y + h * 0.1, w: 0, h: h * 0.76,
    line: { color: THEME.DARK_RULE, width: 0.8, transparency: 15 },
  });
  slide.addShape('ellipse' as PptxGenJS.SHAPE_NAME, {
    x: cx - 0.16, y: cy - 0.16, w: 0.32, h: 0.32,
    fill: { color: THEME.WHITE }, line: { color: THEME.WHITE, transparency: 100 },
  });
  slide.addShape('ellipse' as PptxGenJS.SHAPE_NAME, {
    x: x + w * 0.19, y: y + h * 0.22, w: 0.16, h: 0.16,
    fill: { color: THEME.MID_GRAY }, line: { color: THEME.MID_GRAY, transparency: 100 },
  });
  slide.addShape('ellipse' as PptxGenJS.SHAPE_NAME, {
    x: x + w * 0.76, y: y + h * 0.69, w: 0.12, h: 0.12,
    fill: { color: THEME.MUTED_ON_DARK }, line: { color: THEME.MUTED_ON_DARK, transparency: 100 },
  });
}
