# Borrowed Light (Web)

Single-page static site for the essay *Constellations of Borrowed Light* (Astro + Bun + Tailwind v4).

## Source of Truth

- Canonical essay source: `src/content/essays/constellations/index.mdx`
- Shared reading UI: `src/components/essay/chrome/*` and `src/components/essay/blocks/*`
- Secondary print target: `docs/constellations/constellations.tex`
- Public PDF: `public/constellations.pdf`

The web essay is the primary artifact. TeX/PDF is exported from the MDX source.

For the repo-level framing that aligns this essay with Vela and Astera, see [CANONICAL_DOCTRINE.md](CANONICAL_DOCTRINE.md).

## Commands
## Build & export

**Node requirement:** use Node `>=22.14.0` (see `.nvmrc`). Older Node versions can fail Astro builds with `URL.canParse is not a function`.

Example:

```bash
export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH"
node -v
bun run build
```

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

## Site architecture notes

Current planning docs for the public-site shape live in `docs/plans/`:

- `2026-04-10-borrowed-light-sitemap-and-content-spec.md`
- `2026-04-10-borrowed-light-gap-analysis.md`
- `2026-04-10-borrowed-light-homepage-nav-rewrite-plan.md`

These documents define the recommended canonical public IA:
- Essay (`/`)
- Summary (`/summary`)
- Vela (`/vela`)
- Proof (`/proof`)
- About (`/about`)

## CI

GitHub Actions runs:

- `bun install --frozen-lockfile`
- `bun run build`

See `.github/workflows/ci.yml`.
