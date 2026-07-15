# Vela Essays: agent instructions

## Source of truth

- Essay sources: `src/content/essays/*/index.mdx`
- Whitepaper source: `src/content/whitepaper/index.mdx`
- Root route: permanent redirect to `/constellations` in `astro.config.mjs`
  and `vercel.json`
- Essay layout and blocks: `src/components/essay/chrome/*` and
  `src/components/essay/blocks/*`
- Visuals: web-native Astro, HTML, and SVG components
- Design contract: `PRODUCT.md`, `DESIGN.md`, and `src/styles/tokens.css`
- Public metadata: `src/data/constants.ts`

## Editing workflow

- Preserve the current Constellations visual system and provisional Vela sail.
- Edit diagrams as web-native Astro, HTML, or SVG components.
- Do not introduce secondary export or diagram-generation build steps.
- Run `bun run build` for route, metadata, MDX, component, or build changes.
- Keep verification focused. Do not add live-network or external-project tests.

## Route contract

All current entrypoints under `src/pages` are intentional public surfaces.
`scripts/check-public-routes.mjs` must be updated deliberately when a route is
added, removed, or redirected. Do not hide existing essays or technical pages
without explicit product direction.

## Product constraints

- No user accounts or user-generated notes. “Notes” means essay footnotes.
- The publication complements the Vela app; it does not duplicate app state.
- Keep canonical and social metadata on `https://www.vela.space`.
