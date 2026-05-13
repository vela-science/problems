# Borrowed Light

Static Astro site for the *Borrowed Light* trilogy:

```text
Record -> Engine -> Body
```

The first essay argues that science needs a shared record. The second specifies the engine that turns activity into governed state transitions. The third asks whether that engine reaches the physical world as an open public body or as closed private bodies first.

## Source of Truth

- Record essay source: `src/content/essays/constellations/index.mdx`
- Engine essay source: `src/content/essays/discovery-engine/index.mdx`
- Body essay source: `src/content/essays/gigafactories-for-science/index.mdx`
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

- `/` — *Constellations of Borrowed Light*, the shared-record essay
- `/discovery-engine` — *The Discovery Engine*, the transition-engine essay
- `/terafactories` — *The Terafactory Age*, the public-body essay

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
