# Vela Web operations

This is the current operations contract for the private Vela Web workspace.
Earlier design and migration plans live under `docs/history/`.

## Product boundary

- `www.vela.space` is the canonical Astro editorial site.
- `app.vela.space` is the canonical Next.js Repository Observatory.
- `vela.space` redirects to `www`; product paths on `www` redirect to `app`.
- Both applications are read-only products. They expose no signer, public
  mutation API, Server Action, or scientific authority. The Observatory reads
  a bounded projection from Neon; canonical custody remains in the frontier
  Git repositories.
- Normative protocol and CLI documentation remains in the Vela repository at
  an exact release commit. This repository owns onboarding and explanation.

`bun run check:boundary` makes that product boundary executable. It rejects
Server Actions, request-scoped cookies or headers, authentication, mutation
handlers, and arbitrary request-time fetches. The sole Route Handler is the
read-only, same-origin search projection.

The repository is a Bun workspace with four maintained boundaries:

```text
apps/www                editorial Astro application
apps/observatory        read-only Next.js application
packages/brand          governed identity, tokens, fonts, and delivery assets
packages/frontier-data  Git-to-Neon projection, validation, search, and manifests
```

## Exact frontier state

`packages/frontier-data/config/frontiers.v1.json` names the four canonical Git
repositories. A scheduled or manual GitHub workflow checks out clean
`origin/main` tips, verifies them with the pinned Vela release, and writes a
content-addressed read projection to the `vela_projection` Neon database:

```bash
bun packages/frontier-data/scripts/refresh-neon-projection.mjs
bun run check:bundle
```

Refresh refuses dirty or unpushed sources, wrong branches or remotes, Vela
version drift, packet drift, missing decision evidence, incomplete reviews, and
root disagreement. The writer is available only to the refresh workflow. The
Vercel application receives a separate PostgreSQL role with `CONNECT`, schema
`USAGE`, and `SELECT` only.

There is no checked-in frontier snapshot, copied search index, or Build Week
JSON. The Observatory reads the rooted release and frontier projections from
Neon during rendering. `/api/search` derives its bounded response from the same
read model. The database is a disposable projection: the exact Git commits,
trees, event roots, and proposal roots identify every row, and the entire
projection can be rebuilt from the source repositories.

## Brand and assets

`packages/brand/marks/source/vela-symbol-full.svg` is the exact original Vela
sail released in `v0.300.2`. Do not redraw or reinterpret it. All delivery
variants are generated and content-addressed.

- Editorial delivery: Newsreader, Inter, and IBM Plex Mono.
- Observatory delivery: Inter and IBM Plex Mono only.
- Asset synchronization is a mirror and removes stale destination fonts.
- `vela.brand-root.v2` binds canonical marks, DTCG tokens, delivered font bytes,
  and their manifests.

The sail remains provisional for trademark purposes; see the dated non-legal
screen under `packages/brand/marks/audit/`.

## Verify and build

Use Bun `1.3.12`:

```bash
bun install --frozen-lockfile
bun run check
bun run lint
bun run typecheck
bun run test
bun run build
bun run test:budgets
bun run test:manifests
git diff --check
```

CI additionally runs the repository-owned functional and accessibility suites.
Release candidates and design-affecting changes run the documented in-app
Browser matrix at the supported mobile, tablet, and desktop widths. Functional
and accessibility automation remains in CI; stale screenshot binaries are not
treated as product truth.
Manual visual QA uses the Codex in-app Browser.

## Deployment topology

The `constellate-dc388081` Vercel team has two Vela Web projects:

| Project | Application | Production domains |
| --- | --- | --- |
| `vela-web-www` | `apps/www` | `www.vela.space`, redirect aliases |
| `vela-web-observatory` | `apps/observatory` | `app.vela.space`, `app.constellate.science` redirect |

There is no active legacy Vela Vercel project. `prospect` and `snowchild` are
unrelated and outside this workspace.

Public manifests:

- `https://www.vela.space/.well-known/vela-web.json`
- `https://app.vela.space/.well-known/vela-site.json`

The manifests use `vela.web-deployment.v2` and `vela.site-deployment.v2`; each
records the exact release tag, Git commit, brand schema/root, deployment
identity, and delivery mode. The Observatory manifest additionally binds the
Neon projection root, pinned Vela binary, and every source frontier commit and
root. A production release is incomplete until its deployed manifest matches
the approved tag, commit, and current projection exactly.

Several legacy domains currently show Vercel's `DNS Change Recommended`
advisory while resolving successfully. Treat DNS migration as a separate
provider-controlled operation; do not combine it with a code release.

## Fly retirement

Vela Web does not depend on Fly.io. The legacy `vela-hub` and
`vela-hub-witness` applications, their secrets, and the witness volume were
removed on 2026-07-21 after the Neon-backed Vercel deployment passed production
route, manifest, and current-frontier checks. The archived witness database and
its SHA-256 manifest remain outside this repository under the Constellate
archive. `prospect-acceptance` is unrelated and must not be modified from this
repo.

## Release

1. Build and tag an unsigned release candidate on clean `main`.
2. Deploy both applications from that exact commit without DNS changes.
3. Verify routes, redirects, standing semantics, roots, accessibility, responsive
   states, ISR cache isolation, and both staging manifests.
4. Tag the final release from the approved commit and deploy both projects.
5. Verify production manifests and canonical domains.
6. Update the parent `ecosystem.lock.json` only after production verification.
7. Remove generated dependencies and build output after the release audit.

Never publish a release if a manifest lacks the exact commit, any root drifts,
verifier success is presented as acceptance, a canonical route is missing, or
browser-delivered bytes expose custody, private coordination, or authority
operations.
