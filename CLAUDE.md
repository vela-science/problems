# Borrowed Light - Development Notes

## Project Overview
Single-page static website for "Constellations of Borrowed Light" essay using Astro + Bun + Tailwind CSS v4.

## Commands
```bash
bun run dev      # Start dev server
bun run build    # Build for production (diagrams + llms.txt + astro)
bun run export:constellations:tex  # Export print source from MDX
bun run build:pdf:constellations   # Export TeX, compile PDF, copy to public/
```

## MDX → Web / TeX Pipeline

The web essay is canonical. The PDF is a derived print artifact.

```
src/content/essays/constellations/index.mdx  (source of truth)
         │
         ├──► astro build ──► /
         │
         ├──► scripts/generate-llms-txt.ts ──► public/llms*.txt
         │
         └──► scripts/export-constellations-to-tex.ts ──► docs/constellations/constellations.tex ──► public/constellations.pdf
```

### After editing the essay:
```bash
bun run build                # Rebuild site
bun run build:pdf:constellations   # Rebuild print artifact if needed
```

### Authoring model
- Prose lives in `src/content/essays/constellations/index.mdx`
- Reading chrome lives in `src/components/essay/chrome/*`
- Reusable essay blocks live in `src/components/essay/blocks/*`
- Footnotes are authored in markdown and upgraded into the notes drawer on the web
- The print source is generated into `docs/constellations/constellations.tex`

### What build-diagrams.sh does:
- Compiles each `.tex` in `diagrams/src/` to DVI
- Converts to SVG via dvisvgm (requires Ghostscript)
- Generates light and dark variants

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
- `src/content/essays/constellations/index.mdx` - Canonical essay source
- `src/layouts/EssayLayout.astro` - Essay reading system layout
- `docs/constellations/constellations.tex` - Generated print source
- `src/pages/index.astro` - Canonical essay route
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
