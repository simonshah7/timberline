import PptxGenJS from 'pptxgenjs';

// ─── Brand Constants ──────────────────────────────────────

export const BRAND = {
  purple: '7A00C1',
  blue: '3B53FF',
  teal: '006170',
  orange: 'FFA943',
  red: 'FF715A',
  cyan: '34E5E2',
  dark: '1a1a1a',
  mid: '666666',
  light: '999999',
  border: 'cccccc',
  bgLight: 'F5F5F5',
  bgWhite: 'FFFFFF',
  green: '22C55E',
  headerBg: '2D2045',
};

export const FONTS = {
  heading: 'Arial',
  body: 'Arial',
};

// ─── Shared Helpers ───────────────────────────────────────

export function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

export function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function safeDiv(a: number, b: number): number {
  return b === 0 ? 0 : a / b;
}

// ─── Slide Builders ───────────────────────────────────────

export function createPptx(): PptxGenJS {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'LaunchGrid';
  pptx.company = 'LaunchGrid';
  return pptx;
}

export function addTitleSlide(
  pptx: PptxGenJS,
  title: string,
  subtitle: string,
  date: string,
): void {
  const slide = pptx.addSlide();
  slide.background = { color: BRAND.headerBg };
  slide.addText(title, {
    x: 0.8,
    y: 1.8,
    w: '85%',
    fontSize: 36,
    bold: true,
    color: BRAND.bgWhite,
    fontFace: FONTS.heading,
  });
  slide.addText(subtitle, {
    x: 0.8,
    y: 3.0,
    w: '85%',
    fontSize: 20,
    color: BRAND.cyan,
    fontFace: FONTS.body,
  });
  slide.addText(`Generated ${date}`, {
    x: 0.8,
    y: 4.0,
    w: '85%',
    fontSize: 12,
    color: BRAND.light,
    fontFace: FONTS.body,
  });
  // Accent bar
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: 0.8,
    y: 2.7,
    w: 1.2,
    h: 0.06,
    fill: { color: BRAND.purple },
  });
}

export function addSectionSlide(pptx: PptxGenJS, title: string): void {
  const slide = pptx.addSlide();
  slide.background = { color: BRAND.bgLight };
  slide.addText(title, {
    x: 0.8,
    y: 2.5,
    w: '85%',
    fontSize: 28,
    bold: true,
    color: BRAND.dark,
    fontFace: FONTS.heading,
  });
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: 0.8,
    y: 3.1,
    w: 1.0,
    h: 0.05,
    fill: { color: BRAND.purple },
  });
}

export interface KpiItem {
  label: string;
  value: string;
  sub?: string;
}

export function addKpiSlide(
  pptx: PptxGenJS,
  title: string,
  kpis: KpiItem[],
): void {
  const slide = pptx.addSlide();
  slide.addText(title, {
    x: 0.5,
    y: 0.3,
    w: '90%',
    fontSize: 24,
    bold: true,
    color: BRAND.dark,
    fontFace: FONTS.heading,
  });

  const cols = Math.min(kpis.length, 6);
  const boxW = 11.5 / cols;
  const startX = 0.5;

  kpis.forEach((kpi, i) => {
    const x = startX + i * boxW;
    // Box background
    slide.addShape('rect' as PptxGenJS.ShapeType, {
      x,
      y: 1.2,
      w: boxW - 0.15,
      h: 1.6,
      fill: { color: BRAND.bgLight },
      rectRadius: 0.08,
    });
    // Label
    slide.addText(kpi.label, {
      x,
      y: 1.3,
      w: boxW - 0.15,
      h: 0.35,
      fontSize: 10,
      color: BRAND.mid,
      fontFace: FONTS.body,
      align: 'center',
      valign: 'middle',
    });
    // Value
    slide.addText(kpi.value, {
      x,
      y: 1.65,
      w: boxW - 0.15,
      h: 0.5,
      fontSize: 22,
      bold: true,
      color: BRAND.dark,
      fontFace: FONTS.heading,
      align: 'center',
      valign: 'middle',
    });
    // Sub
    if (kpi.sub) {
      slide.addText(kpi.sub, {
        x,
        y: 2.15,
        w: boxW - 0.15,
        h: 0.35,
        fontSize: 9,
        color: BRAND.light,
        fontFace: FONTS.body,
        align: 'center',
        valign: 'middle',
      });
    }
  });
}

type TableRow = Array<{ text: string; options?: PptxGenJS.TextPropsOptions }>;

export function addTableSlide(
  pptx: PptxGenJS,
  title: string,
  headers: string[],
  rows: string[][],
  options?: { subtitle?: string },
): void {
  const slide = pptx.addSlide();
  slide.addText(title, {
    x: 0.5,
    y: 0.3,
    w: '90%',
    fontSize: 22,
    bold: true,
    color: BRAND.dark,
    fontFace: FONTS.heading,
  });

  if (options?.subtitle) {
    slide.addText(options.subtitle, {
      x: 0.5,
      y: 0.7,
      w: '90%',
      fontSize: 11,
      color: BRAND.mid,
      fontFace: FONTS.body,
    });
  }

  const headerRow: TableRow = headers.map((h) => ({
    text: h,
    options: {
      bold: true,
      color: BRAND.bgWhite,
      fill: { color: BRAND.headerBg },
      fontSize: 10,
      fontFace: FONTS.body,
      align: 'left' as const,
      valign: 'middle' as const,
    },
  }));

  const dataRows: TableRow[] = rows.map((row, rowIdx) =>
    row.map((cell) => ({
      text: cell,
      options: {
        fontSize: 10,
        color: BRAND.dark,
        fontFace: FONTS.body,
        fill: { color: rowIdx % 2 === 0 ? BRAND.bgWhite : BRAND.bgLight },
        valign: 'middle' as const,
      },
    })),
  );

  const yStart = options?.subtitle ? 1.0 : 0.9;
  const tableW = Math.min(12, headers.length * (12 / Math.max(headers.length, 4)));

  slide.addTable([headerRow, ...dataRows], {
    x: 0.5,
    y: yStart,
    w: tableW,
    fontSize: 10,
    border: { type: 'solid', pt: 0.5, color: BRAND.border },
    rowH: 0.35,
    autoPage: true,
    autoPageRepeatHeader: true,
  });
}

export interface InsightItem {
  type: string;
  title: string;
  description: string;
  priority: string;
  metric?: string;
}

export function addInsightsSlide(
  pptx: PptxGenJS,
  title: string,
  insights: InsightItem[],
): void {
  const slide = pptx.addSlide();
  slide.addText(title, {
    x: 0.5,
    y: 0.3,
    w: '90%',
    fontSize: 22,
    bold: true,
    color: BRAND.dark,
    fontFace: FONTS.heading,
  });

  const typeColors: Record<string, string> = {
    warning: BRAND.orange,
    success: BRAND.green,
    improvement: BRAND.purple,
    suggestion: BRAND.teal,
    learning: BRAND.blue,
    opportunity: BRAND.blue,
  };

  const priorityLabels: Record<string, string> = {
    high: 'HIGH',
    medium: 'MED',
    low: 'LOW',
  };

  const maxInsights = Math.min(insights.length, 6);
  const itemH = 0.85;

  for (let i = 0; i < maxInsights; i++) {
    const insight = insights[i];
    const y = 1.0 + i * itemH;
    const color = typeColors[insight.type] || BRAND.mid;

    // Color indicator bar
    slide.addShape('rect' as PptxGenJS.ShapeType, {
      x: 0.5,
      y,
      w: 0.08,
      h: itemH - 0.1,
      fill: { color },
    });

    // Priority badge
    const priorityText = priorityLabels[insight.priority] || insight.priority.toUpperCase();
    slide.addText(priorityText, {
      x: 0.7,
      y,
      w: 0.5,
      h: 0.25,
      fontSize: 7,
      bold: true,
      color,
      fontFace: FONTS.body,
      align: 'left',
      valign: 'middle',
    });

    // Title
    slide.addText(insight.title, {
      x: 0.7,
      y: y + 0.2,
      w: 11.5,
      h: 0.25,
      fontSize: 11,
      bold: true,
      color: BRAND.dark,
      fontFace: FONTS.body,
    });

    // Description
    slide.addText(insight.description, {
      x: 0.7,
      y: y + 0.42,
      w: 11.5,
      h: 0.3,
      fontSize: 9,
      color: BRAND.mid,
      fontFace: FONTS.body,
    });
  }

  if (insights.length > maxInsights) {
    slide.addText(`+ ${insights.length - maxInsights} more insights`, {
      x: 0.5,
      y: 1.0 + maxInsights * itemH,
      w: '90%',
      fontSize: 10,
      italic: true,
      color: BRAND.light,
      fontFace: FONTS.body,
    });
  }
}

export function addTwoColumnKpiSlide(
  pptx: PptxGenJS,
  title: string,
  leftLabel: string,
  leftKpis: KpiItem[],
  rightLabel: string,
  rightKpis: KpiItem[],
): void {
  const slide = pptx.addSlide();
  slide.addText(title, {
    x: 0.5,
    y: 0.3,
    w: '90%',
    fontSize: 22,
    bold: true,
    color: BRAND.dark,
    fontFace: FONTS.heading,
  });

  // Left column header
  slide.addText(leftLabel, {
    x: 0.5,
    y: 1.0,
    w: 5.5,
    fontSize: 14,
    bold: true,
    color: BRAND.purple,
    fontFace: FONTS.heading,
  });

  // Right column header
  slide.addText(rightLabel, {
    x: 6.5,
    y: 1.0,
    w: 5.5,
    fontSize: 14,
    bold: true,
    color: BRAND.teal,
    fontFace: FONTS.heading,
  });

  const renderKpiColumn = (kpis: KpiItem[], startX: number) => {
    kpis.forEach((kpi, i) => {
      const y = 1.5 + i * 0.8;
      slide.addText(kpi.label, {
        x: startX,
        y,
        w: 5,
        fontSize: 10,
        color: BRAND.mid,
        fontFace: FONTS.body,
      });
      slide.addText(kpi.value, {
        x: startX,
        y: y + 0.22,
        w: 5,
        fontSize: 18,
        bold: true,
        color: BRAND.dark,
        fontFace: FONTS.heading,
      });
      if (kpi.sub) {
        slide.addText(kpi.sub, {
          x: startX,
          y: y + 0.5,
          w: 5,
          fontSize: 9,
          color: BRAND.light,
          fontFace: FONTS.body,
        });
      }
    });
  };

  renderKpiColumn(leftKpis, 0.5);
  renderKpiColumn(rightKpis, 6.5);

  // Divider line
  slide.addShape('line' as PptxGenJS.ShapeType, {
    x: 6.2,
    y: 1.0,
    w: 0,
    h: 4.5,
    line: { color: BRAND.border, width: 1 },
  });
}

export async function downloadPptx(pptx: PptxGenJS, fileName: string): Promise<void> {
  await pptx.writeFile({ fileName: `${fileName.replace(/[^a-zA-Z0-9_-]/g, '_')}.pptx` });
}
