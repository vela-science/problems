# Borrowed Light - Development Notes

## Project Overview
Single-page static website for "Constellations of Borrowed Light" essay using Astro + Bun + Tailwind CSS v4.

## Commands
```bash
bun run dev      # Start dev server
bun run build    # Build for production (diagrams + llms.txt + astro)
```

## LaTeX → Web Pipeline

The essay exists in two forms that must stay in sync:

```
docs/constellations.tex  (source of truth)
         │
         ├──► bun run sync:essay ──► src/components/essay/*.astro
         │
         └──► diagrams/build-diagrams.sh ──► public/svgs/diagrams/*.svg
```

### After editing constellations.tex:
```bash
bun run sync:essay           # Sync prose to Astro components
cd diagrams && ./build-diagrams.sh  # Rebuild SVGs (if diagrams changed)
```

### What sync:essay does:
- Extracts each `\section*{...}` from the LaTeX
- Converts LaTeX → HTML via pandoc
- Transforms to Astro components with:
  - Sidenotes (from `\footnote{}`)
  - Figures (from TikZ `\input{}` blocks)
  - Custom components (`\constellationdivider`, `\pullquote{}`, etc.)
- Outputs to `src/components/essay/{SectionName}Section.astro`

### What build-diagrams.sh does:
- Compiles each `.tex` in `diagrams/src/` to DVI
- Converts to SVG via dvisvgm (requires Ghostscript)
- Generates light and dark variants
- Also extracts `% BEGIN_DIAGRAM name` ... `% END_DIAGRAM name` blocks from constellations.tex

## Converting TikZ Diagrams to SVG

When converting LaTeX TikZ diagrams to SVG, dvisvgm needs Ghostscript for PostScript specials.

### Workflow
1. Create standalone tex file with the diagram
2. Compile to DVI: `latex -interaction=nonstopmode diagram.tex`
3. Convert to SVG with Ghostscript path:

```bash
PATH="/opt/homebrew/bin:$PATH" dvisvgm --libgs=/opt/homebrew/lib/libgs.dylib diagram.dvi -o output.svg --font-format=woff2
```

### Common Issue
If you see `processing of PostScript specials is disabled (Ghostscript not found)` and the SVG only contains text without shapes, it means dvisvgm couldn't find Ghostscript. Use the `--libgs` flag to point to the library.

## Converting SVG to PNG (for OG images)
```bash
rsvg-convert input.svg -o output.png -w 1200 -h 630
```

## Key Files
- `docs/constellations.tex` - Source LaTeX document
- `docs/galileo.sty` - Color palette and component specs
- `src/pages/index.astro` - Main essay page
- `src/styles/global.css` - Tailwind v4 theme with Galileo colors

## Color Palette (Galileo)
- Paper Ivory: `#FDFBF7`
- Ink Indigo: `#2C3E50`
- Gold Accent: `#C9A227`
- Twilight: `#5D6D7E`
- Faint Star: `#D5D8DC`
- Starglow: `#E8D5A3`

## Dark Mode
Class-based toggle (`html.dark`) with localStorage persistence. Light mode is default.
