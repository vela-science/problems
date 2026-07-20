# Vela Web operations

This is the current operations contract for the public Vela web workspace. Earlier
design plans remain historical records.

## Product boundary

- `www.vela.space` is canonical for editorial content.
- `app.vela.space` is canonical for the read-only Observatory.
- `vela.space` redirects to `www`; product paths on `www` redirect to `app`.
- Both applications are static projections. They have no signer, authority API,
  scientific database, or write path.
- Normative protocol and CLI documentation stays in the Vela repository at an
  exact release commit. This repository owns onboarding and explanation only.

## Refresh exact frontier state

Install the exact Vela binary required by
`packages/frontier-data/config/frontiers.v1.json`, place the
four configured checkouts beside this repository, and run:

```bash
bun packages/frontier-data/scripts/build-frontier-bundle.mjs
bun run check:bundle
```

Generation refuses dirty or unpushed sources, wrong branches or remotes, stale
pins, packet drift, missing decision evidence, incomplete reviews, and root
disagreement. Review the bundle and its manifest together.

## Verify and build

```bash
bun install --frozen-lockfile
bun run check
bun run check:brand
bun run check:bundle
bun run test
bun run build
git diff --check
```

Production builds also require Vercel's exact 40-character Git commit and
deployment identity. `www.vela.space/.well-known/vela-web.json` exposes the
editorial tag, commit, and brand root.
`app.vela.space/.well-known/vela-site.json` preserves the Observatory manifest
contract and exposes its tag, commit, bundle root, Vela binary root, and source
frontier roots. The retired www manifest path redirects to this exact app
manifest rather than serving a duplicate copy. The editorial build emits ten canonical pages; the Observatory
statically verifies 4,070 exact product routes against its sitemap.

## Release

1. Tag and deploy an RC without changing DNS.
2. Verify all routes, redirects, roots, accessibility, and responsive states.
3. Tag the final release and deploy the exact commit.
4. Verify the production manifest before moving canonical domains.
5. Keep the retired deployment available for the documented rollback window.

The domain move is an ownership transfer, not a DNS rewrite. Move these domains
from the released Astro project to the new editorial project: `www.vela.space`,
`vela.space`, `canopus.org`, `www.canopus.org`, `borrowedlight.org`,
`www.borrowedlight.org`, `constellate.science`, and
`www.constellate.science`. Move `app.vela.space` from that project and
`app.constellate.science` from the archived Observatory project to the new
Observatory project. Keep both retired projects and their Vercel deployment
URLs for the rollback window; do not leave a canonical or compatibility domain
attached to them.
