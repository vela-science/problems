# Borrowed Light (Web)

Single-page static site for the essay *Constellations of Borrowed Light* (Astro + Bun + Tailwind v4).

## Source of Truth

- Canonical essay source: `src/content/essays/constellations/index.mdx`
- Shared reading UI: `src/components/essay/chrome/*` and `src/components/essay/blocks/*`
- Secondary print target: `docs/constellations/constellations.tex`
- Public PDF: `public/constellations.pdf`

The web essay is the primary artifact. TeX/PDF is exported from the MDX source.

## Commands

- Dev: `bun run dev`
- Build site: `bun run build`
- Export TeX: `bun run export:constellations:tex`
- Build PDF: `bun run build:pdf:constellations`

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
- `bun run build`

See `.github/workflows/ci.yml`.
