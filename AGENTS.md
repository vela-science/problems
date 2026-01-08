# Borrowed Light — Agent Instructions

## Source Of Truth

- Essay source: `docs/constellations.tex`
- Web essay sections: `src/components/essay/*.astro` (generated)
- Diagram sources: `diagrams/src/*.tex`
- Diagram outputs: `public/svgs/diagrams/*.svg` (**generated artifacts**)

## Editing Workflow

- After editing `docs/constellations.tex`, run `bun run sync:essay` to regenerate the web essay sections.
- Do **not** hand-edit files in `public/svgs/diagrams/`. If a diagram needs to change:
  - Edit the corresponding `diagrams/src/<name>.tex`
  - Rebuild with `./diagrams/build-diagrams.sh <name>` (or build all diagrams with no args)

## Adding A New Diagram

1. Add `diagrams/src/<name>.tex` (standalone TikZ)
2. Generate `public/svgs/diagrams/<name>.svg` via `./diagrams/build-diagrams.sh <name>`
3. If the essay-to-web sync needs to recognize it, update the mapping in `scripts/sync-essay-from-tex.ts`.

## Product Constraints

- No user accounts or user-generated notes. “Notes” refers to essay footnotes only.

