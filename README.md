# Borrowed Light (Web)

Single-page static site for the essay *Constellations of Borrowed Light* (Astro + Bun + Tailwind v4).

## Source of Truth

- Canonical text: `docs/constellations.tex`
- Web sections are generated into: `src/components/essay/*.astro`

Run `bun run sync:essay` after editing the LaTeX.

To verify nothing is drifting: `bun run sync:check`.

## Commands

- Dev: `bun run dev`
- Build: `bun run build`
- Sync essay: `bun run sync:essay`
- Sync + verify clean diff: `bun run sync:check`

## Diagrams (TikZ → SVG)

Diagram sources live in `diagrams/src/*.tex` and are built into `public/svgs/diagrams/*.svg`.

- Build all: `./diagrams/build-diagrams.sh`
- Build one: `./diagrams/build-diagrams.sh investment-bars`

## Deployment / Crawlers

- `public/robots.txt` and `public/sitemap.xml` are included for indexing.
- SEO metadata and JSON-LD live in `src/layouts/Base.astro`.

## CI

GitHub Actions runs:

- `bun install --frozen-lockfile`
- `bun run sync:check`
- `bun run build`

See `.github/workflows/ci.yml`.

