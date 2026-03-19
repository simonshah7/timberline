# Slide report guidelines

For any slides you generate as reports follow every rule below precisely. Do not improvise on brand, colors, fonts, or layout patterns. When in doubt, default to the explicit specification here.

---

## Color palette

Use these constants in all generated code:

```js
const RW = {
  RED:          "E24650",   // Logo mark, page number badge, photo borders. SPARINGLY.
  TEAL:         "006170",   // Primary brand. Section dividers, labels, CTA.
  TURQUOISE:    "34E5E2",   // Accents on DARK backgrounds ONLY. Never on white/light.
  FOREST_BLACK: "082029",   // Title text on white, dark slide backgrounds.
  NAVY_MID:     "0E2E38",   // Card backgrounds on dark slides.
  LIGHT_TEAL:   "EBF5F3",   // Appendix / closing divider backgrounds, card fills.
  LIGHT_GREY:   "F2F2F2",   // Card backgrounds, subtle fills.
  WHITE:        "FFFFFF",   // Default slide background, text on dark.
  TEXT_MUTED:   "7C9AA3",   // Captions, footnotes, muted labels on white slides.
  TEXT_DIM:     "8FB3BB",   // Dim text on dark slides.
  CRIMSON:      "FF715A",   // Warning / problem state / negative data.
  ORANGE:       "FFA943",   // Caution / secondary warning.
  BLUE:         "3B53FF",   // Supporting / informational.
};
```

### Do

- White text on Forest Black or Teal backgrounds.
- Turquoise text/accents on Forest Black or Teal backgrounds.
- Forest Black text on White backgrounds.
- Red for logo mark, page number badge, and high-impact card accent only.
- Teal + Red card blocks for high-impact summary slides.

### Don't

- Never use Turquoise on white or light backgrounds (contrast failure).
- Never use Teal text on dark backgrounds (contrast failure).
- Never use Red as a body emphasis color.
- Never use Black text on Red.
- Never use Red text on Teal or Turquoise.

---

## Typography

### Font pairing

| Role | Font | Fallback |
|------|------|----------|
| Headlines / Titles | Archivo Extra-Bold (800) | Arial Black |
| Subtitles / Labels | Archivo Semi-Bold (600) | Arial |
| Section divider titles | Archivo Light (300) | Calibri Light |
| Body text | Roboto Regular (400) | Calibri |
| Body bold | Roboto Bold (700) | Calibri Bold |
| Captions / Footnotes | Roboto Light | Calibri |

### Size hierarchy (16:9 slides)

| Element | Size | Font |
|---------|------|------|
| Slide title (content) | 36-44pt | Archivo Extra-Bold |
| Subtitle / lead line | 16-20pt | Archivo Light |
| Section divider title | 36-40pt | Archivo Light (NOT bold) |
| Section label/identifier | 12-14pt | Archivo Regular, Teal color on white |
| Pipe-separated prefix | 14-16pt | Archivo Light, Turquoise on dark / Teal on white |
| Body text | 12-14pt | Roboto Regular |
| Caption / Footnote | 10-11pt | Roboto Light, muted color |
| Large stat callout | 48-72pt | Archivo Extra-Bold |
| Button text | 13-14pt | Archivo Semi-Bold |

### Typography rules

1. Always sentence case. Never ALL CAPS. Capitalize only first word + proper nouns.
2. Stack headlines across 2-3 lines rather than one long line.
3. Use charSpacing: -1 for large/title text (tight kerning).
4. Pipe-separated slide titles: "FA cross-sell | Driving pipeline through ABM"
   - Prefix ("FA cross-sell") in Turquoise (dark bg) or Teal (white bg), Light weight
   - Separator + topic in Forest Black (white bg) or White (dark bg), Extra-Bold

---

## Slide background rules

| Slide type | Background |
|------------|------------|
| Default content slide | White (FFFFFF) |
| Title slides | Forest Black (082029) |
| Section dividers | Teal (006170) -- NOT Forest Black |
| Chart-embed slides | Forest Black (082029) |
| Appendix/closing | Light Teal (EBF5F3) |

Never use Teal as a default content slide background.
Never use Forest Black for section dividers (that's Teal's job).

---

## Slide patterns

### Pattern A -- Title slide (Forest Black bg)

- Thin Turquoise accent bar, full width, 0.04" height at top
- Title: White, Archivo Extra-Bold, 40-44pt, left-aligned, stacked 2-3 lines
- Subtitle/date: Turquoise, Archivo Light, 17-18pt
- Footer strip: Navy Mid (0E2E38), bottom
- "Redwood" wordmark bottom-left in footer

### Pattern B -- Section divider (Teal bg)

- Title: White, Archivo Light (NOT bold), 36pt, centered
- "Redwood" wordmark: bottom-left, white, 11pt Archivo Semi-Bold

### Pattern C -- Standard content slide (White bg)

- Title: Forest Black, Archivo Extra-Bold, 32-40pt, top-left
- Subtitle (optional): Teal or Turquoise, Archivo Light, 14-16pt
- Body: Forest Black, Roboto Regular, 12-14pt
- Footer: "Redwood" wordmark bottom-left; Red page number badge bottom-right
- Minimal decoration -- let the data speak
- Left-aligned text throughout
- No decorative shapes on standard content slides

### Pattern D -- Pipe-separated title (working deck sections)

Title format: "[Category] | [Topic description]"

- On white bg: Category in Teal, Light weight; topic in Forest Black, Extra-Bold
- On dark bg: Category in Turquoise, Light weight; topic in White, Extra-Bold

### Pattern E -- Chart/data slide (Forest Black bg)

- Title: White, Archivo Extra-Bold
- Charts with dark theme styling
- Commentary below or beside chart, White or dim text

### Pattern F -- Summary/performance slide (White bg, exception)

- Left column: Teal (006170) cards, white text -- "Performance updates"
- Right column: Red (E24650) cards, white text -- "What's next"
- OR: Light Grey (F2F2F2) rounded cards with Forest Black body text

### Pattern G -- Appendix/closing divider (Light Teal bg)

- Title: Forest Black, Archivo Light, centered
- "Redwood" logo: centered below title

---

## Text shadow suppression

LibreOffice renders text shadows as blur artifacts. Suppress on every text run:

```js
function kill_shadow(run) {
  // Append <a:effectLst/> at the run level (a:rPr), not shape level
  // In PptxGenJS, pass shadow: false or ensure no shadow property is set
  // Post-process with strip_shadows.py if artifacts appear
}
```

Rules:
- Never set shadow properties on any text run.
- Apply `<a:effectLst/>` at the run level, not the shape level.
- If using a post-processor: run strip_shadows.py before PDF conversion.

---

## Unicode symbol prohibition

Never use Unicode symbols as visual indicators (checkmarks, crosses, arrows, bullets, etc.).
LibreOffice renders them with blur/rendering artifacts.

Replace with drawn rectangle/shape objects instead:
- Checkmark -> small Teal filled rectangle
- X / cross -> small Crimson filled rectangle
- Bullet indicator -> small colored rectangle or circle shape

This applies to table cells, body text, and any indicator elements.

---

## Table rules

- RAG-style qualification: use filled colored squares (shapes), not text symbols.
- On narrow columns: set bodyPr wrap="none" to prevent number wrapping.
- No "Sales Next Steps" column -- too verbose for slides.
- Close dates and status indicators are standard columns.
- Header row: Teal (006170) background, White text, Archivo Semi-Bold.
- Data rows: alternate White / Light Grey (F2F2F2).
- Border color: Light Teal (EBF5F3) at 0.5pt.

---

## Chart styling

```js
chartColors: ["006170", "34E5E2", "E24650", "082029", "FF715A", "3B53FF"]
catAxisLabelColor: "7C9AA3"
valAxisLabelColor: "7C9AA3"
valGridLine: { color: "EBF5F3", size: 0.5 }
catGridLine: { style: "none" }
dataLabelColor: "082029"
```

Stat callout format: 48-72pt Archivo Extra-Bold number, Teal or Forest Black, with 12pt Roboto Regular label below.

---

## Layout and spacing

- 0.5" minimum margins from all slide edges.
- 0.3-0.5" spacing between content blocks.
- Never crowd -- leave breathing room.
- Left-align all body text and bullets.
- Center only: section divider titles, badge numbers.
- Never use accent lines under titles (hallmark of AI-generated slides).
- Never repeat the same layout across consecutive slides.
- Every slide needs at least one non-text visual element: stat, shape, chart, or table.
- Stacked headlines (2-3 lines) -- never one long single-line title.

---

## Pre-delivery checklist

Before delivering any output, verify:

- [ ] White background on all standard content slides
- [ ] Teal (006170) on section dividers -- NOT Forest Black
- [ ] Forest Black (082029) on title / chart-embed slides
- [ ] Turquoise used ONLY on dark backgrounds
- [ ] Red used ONLY for logo mark, page number badge, photo borders, high-impact cards
- [ ] Archivo Extra-Bold on all titles; Roboto Regular on all body text
- [ ] Sentence case everywhere -- zero ALL CAPS
- [ ] No text shadows (shadow suppression applied at run level)
- [ ] No Unicode symbols -- drawn shapes only
- [ ] Narrow table columns have bodyPr wrap="none"
- [ ] Minimum 0.5" margins
- [ ] No accent lines under titles
- [ ] Render -> PDF -> rasterize -> visual inspect completed
- [ ] At least one fix-and-verify cycle completed
- [ ] Zero stale/bleed text from previous slides visible
