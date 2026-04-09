# Borrowed Light — Agent Instructions

## Source Of Truth

- Essay source: `src/content/essays/constellations/index.mdx`
- Essay layout and blocks: `src/components/essay/chrome/*`, `src/components/essay/blocks/*`
- Secondary print source: `docs/constellations/constellations.tex`
- Diagram sources: `diagrams/src/*.tex`
- Diagram outputs: `public/svgs/diagrams/*.svg` (**generated artifacts**)

## Editing Workflow

- Edit the essay in `src/content/essays/constellations/index.mdx`.
- Run `bun run build` to verify the web output.
- Run `bun run build:pdf:constellations` when you need to regenerate the print artifact.
- Do **not** hand-edit files in `public/svgs/diagrams/`. If a diagram needs to change:
  - Edit the corresponding `diagrams/src/<name>.tex`
  - Rebuild with `./diagrams/build-diagrams.sh <name>` (or build all diagrams with no args)
  - The build generates both `public/svgs/diagrams/<name>.svg` (light) and `public/svgs/diagrams/<name>.dark.svg` (dark).

## Adding A New Diagram

1. Add `diagrams/src/<name>.tex` (standalone TikZ)
2. Generate `public/svgs/diagrams/<name>.svg` via `./diagrams/build-diagrams.sh <name>`
3. Reference it from the MDX essay using the `Figure` block component, and it will export to TeX through `scripts/export-constellations-to-tex.ts`.

## Product Constraints

- No user accounts or user-generated notes. “Notes” refers to essay footnotes only.
