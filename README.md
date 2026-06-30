# Constellate

Static Astro site for the Constellate essay sequence:

```text
Record -> Engine -> Body
```

The first essay argues that science needs a shared record. The second specifies the engine that turns activity into governed state transitions. The third asks whether that engine reaches the physical world as an open public body or as closed private bodies first.

## Source of Truth

- Record essay source: `src/content/essays/constellations/index.mdx`
- Engine essay source: `src/content/essays/discovery-engine/index.mdx`
- Body essay source: `src/content/essays/terafactories/index.mdx`
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

Ten public pages:

- `/`: *Constellations of Borrowed Light*, the shared-record essay (the homepage redirects here)
- `/discovery-engine`: *The Discovery Engine*, the transition-engine essay
- `/terafactories`: *The Terafactory Age*, the public-body essay
- `/whitepaper`: *The Constellate Architecture*, the single technical companion
- `/case`: *The Case*, the four-minute argument
- `/vela`: the Vela protocol landing
- `/stack`: the six-layer ecosystem stack
- `/facility`: an interactive 3D model of Meridian's first synthesis hall
- `/catalog`: the index of every artifact
- `/404`: not-found page

## Visuals

Visuals are web-native Astro/HTML/SVG components. Do not add a separate diagram generation or asset build pipeline.

## Docs

- `docs/design-handoff.md`: current UI/UX state and the handoff brief for the next agent.
- `docs/trilogy-doctrine.md`: the Record -> Engine -> Body frame and the non-overlap rule.
- `docs/essay-inspirations.md`: the writing voice and style alignment.
- `docs/source-audit.md`: external citations and factual claim groups.
- `docs/figure-registry.md`: visual QA across desktop, tablet, and mobile.
- `docs/terafactories-watercolor-prompts.md`: art direction for the Terafactory plates.
- `docs/version-log.md`: material public-facing changes.

## Deployment

- `bun run build` runs `astro build`; it is the build/correctness gate (CI runs install + build).
- Build output stays untracked in `dist/`.
- `public/robots.txt` and `public/sitemap.xml` are the only crawler files.
- SEO metadata and JSON-LD live in `src/layouts/Base.astro`.

## CI

GitHub Actions runs:

- `bun install --frozen-lockfile`
- `bun run build`

See `.github/workflows/ci.yml`.
