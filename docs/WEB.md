# Vela Web operations

This is the current operations contract for the public Vela website. Earlier
design plans remain historical records.

## Product boundary

- `www.vela.space` is canonical.
- `vela.space`, `app.vela.space`, `constellate.science`, and
  `app.constellate.science` permanently redirect to canonical paths.
- The site is a static, read-only projection. It has no signer, authority API,
  scientific database, or write path.
- Normative protocol and CLI documentation stays in the Vela repository at an
  exact release commit. This repository owns onboarding and explanation only.

## Refresh exact frontier state

Install the exact Vela binary required by `config/frontiers.v1.json`, place the
four configured checkouts beside this repository, and run:

```bash
node scripts/build-frontier-bundle.mjs
pnpm check:bundle
```

Generation refuses dirty or unpushed sources, wrong branches or remotes, stale
pins, packet drift, missing decision evidence, incomplete reviews, and root
disagreement. Review the bundle and its manifest together.

## Verify and build

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm check:brand
pnpm check:bundle
pnpm test
pnpm build
git diff --check
```

Production builds also require Vercel's exact 40-character Git commit and
deployment identity. `/.well-known/vela-site.json` exposes the deployed tag,
commit, bundle root, Vela binary root, and source frontier roots.

## Release

1. Tag and deploy an RC without changing DNS.
2. Verify all routes, redirects, roots, accessibility, and responsive states.
3. Tag the final release and deploy the exact commit.
4. Verify the production manifest before moving canonical domains.
5. Keep the retired deployment available for the documented rollback window.
