# Borrowed Light — Agent Instructions

## Source Of Truth

- Essay source: `src/content/essays/constellations/index.mdx`
- Essay layout and blocks: `src/components/essay/chrome/*`, `src/components/essay/blocks/*`
- Visuals: web-native Astro/HTML/SVG components under `src/components/essay/blocks/*`

## Editing Workflow

- Edit the essay in `src/content/essays/constellations/index.mdx`.
- Run `bun run build` to verify the web output when the change has MDX/component/build risk.
- The repo is web-first. Do not introduce secondary export or diagram-generation build steps.
- Diagram changes should be made as web-native HTML/SVG components.

## Adding A New Diagram

1. Build the diagram as an Astro/HTML/SVG component.
2. Reference it from the MDX essay using the relevant component import.
3. Keep dimensions, labels, and mobile behavior verified in the browser.

## Product Constraints

- No user accounts or user-generated notes. “Notes” refers to essay footnotes only.
