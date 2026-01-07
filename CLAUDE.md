# Borrowed Light - Development Notes

## Project Overview
Single-page static website for "Constellations of Borrowed Light" essay using Astro + Bun + Tailwind CSS v4.

## Commands
```bash
bun run dev      # Start dev server
bun run build    # Build for production
```

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
