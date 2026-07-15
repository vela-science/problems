# Vela Essays

Static Astro publication for the Vela essays, protocol narrative, and visual
catalog at [`www.vela.space`](https://www.vela.space).

## Public routes

- `/`: permanent redirect to `/constellations`
- `/constellations`: *Constellations of Borrowed Light*
- `/discovery-engine`: *The Discovery Engine*
- `/gigafactories-for-science`: *Gigafactories for Science*
- `/whitepaper`: *The Vela Architecture*
- `/case`: the four-minute argument
- `/vela`: the Vela protocol landing
- `/stack`: the ecosystem stack
- `/facility`: the interactive Meridian facility model
- `/catalog`: the complete publication and artifact index
- `/404`: the not-found document

`/terafactories` and `/gigafactories` remain permanent aliases of
`/gigafactories-for-science`.

## Source of truth

- Essay sources: `src/content/essays/*/index.mdx`
- Whitepaper source: `src/content/whitepaper/index.mdx`
- Root redirect: `astro.config.mjs` and `vercel.json`
- Shared reading UI: `src/components/essay/chrome/*` and
  `src/components/essay/blocks/*`
- Design tokens: `src/styles/tokens.css`
- Public metadata: `src/data/constants.ts`
- Route contract: `scripts/check-public-routes.mjs`

## Commands

Node `>=22.14.0` is required (see `.nvmrc`).

```bash
bun install --frozen-lockfile
bun run dev
bun run build
```

`bun run build` compiles the site and then verifies the exact generated HTML
route set and retired-origin exposure.

## Design

The site uses Vela's warm editorial system: mineral cream paper, deep indigo
ink, directional gold, Newsreader for narrative voice, Inter for quiet chrome,
IBM Plex Mono for indexes, and the provisional sail mark. The essays,
technical surfaces, and catalog should feel like adjacent chambers in one
house rather than separate microsites.

Read `PRODUCT.md`, `DESIGN.md`, and `docs/design-handoff.md` before changing the
public interface.

## Deployment

Vercel runs `bun run build`. Canonical URLs, Open Graph data, JSON-LD, robots,
the manifest, and the sitemap use `https://www.vela.space`.
