# Borrowed Light

Static Astro site for *Constellations of Borrowed Light*.

## Source of Truth

- Canonical essay source: `src/content/essays/constellations/index.mdx`
- Shared reading UI: `src/components/essay/chrome/*` and `src/components/essay/blocks/*`

## Commands

**Node requirement:** use Node `>=22.14.0` (see `.nvmrc`). Older Node versions can fail Astro builds with `URL.canParse is not a function`.

Example:

```bash
export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH"
node -v
bun run build
```

## Routes

- `/` — essay
- `/architecture` — scientific state architecture
- `/three-registers` — redirect to `/architecture`
- `/constellation` — interactive corridor map

## Visuals

Visuals are web-native Astro/HTML/SVG components. Do not add a separate diagram generation or asset build pipeline.

## Deployment

- `bun run build` runs `astro build`.
- Build output stays untracked in `dist/`.
- `public/robots.txt` and `public/sitemap.xml` are the only crawler files.
- SEO metadata and JSON-LD live in `src/layouts/Base.astro`.

## CI

GitHub Actions runs:

- `bun install --frozen-lockfile`
- `bun run build`

See `.github/workflows/ci.yml`.
