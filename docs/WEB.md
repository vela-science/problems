# Vela Web operations

This is the current operations contract for the private Vela Web workspace.
Earlier design and migration plans live under `docs/history/`.

## Product boundary

- `www.vela.space` is the canonical Astro editorial site.
- `app.vela.space` is the canonical Next.js Repository Observatory.
- `vela.space` redirects to `www`; product paths on `www` redirect to `app`.
- Both applications are immutable, read-only projections. They expose no
  signer, database, public mutation API, Server Action, or scientific authority.
- Normative protocol and CLI documentation remains in the Vela repository at
  an exact release commit. This repository owns onboarding and explanation.

`bun run check:boundary` makes that product boundary executable. It rejects
Route Handlers, Server Actions, request-scoped cookies or headers, runtime
secret access, authentication/database dependencies, and request-time fetches
other than the rooted same-origin search artifact.

The repository is a Bun workspace with four maintained boundaries:

```text
apps/www                editorial Astro application
apps/observatory        read-only Next.js application
packages/brand          governed identity, tokens, fonts, and delivery assets
packages/frontier-data  exact frontier bundle, validation, search, and manifests
```

## Exact frontier state

`packages/frontier-data/config/frontiers.v1.json` pins the Vela binary and four
clean source frontiers. It is the sole owner of the bundle, generated search
index, compact work availability, and rooted graph opportunity projection.
Refresh only from those exact checkouts:

```bash
bun packages/frontier-data/scripts/build-frontier-bundle.mjs
bun run check:bundle
```

Generation refuses dirty or unpushed sources, wrong branches or remotes, stale
pins, packet drift, missing decision evidence, incomplete reviews, and root
disagreement. `site.frontier-bundle.v1` remains build-time data; it is never
shipped as a universal browser payload.

The public search copy under `apps/observatory/public/data/` is generated and
ignored; the rooted package artifact is the only checked-in source. The
Observatory prebuilds the stable shell and four frontier overviews. Finding
and Erdős problem pages use release-bound immutable ISR: the first request
materializes exact bundled bytes, later requests reuse that release cache, and
the application performs no request-time frontier fetch. The current build
contains 32 prebuilt product pages, below the enforced limit of 50.

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
identity, and `immutable_isr` delivery mode. The Observatory manifest also
binds the frontier bundle, search root, and retained Build Week projection.
Validation requires the search artifact to name the same bundle root and the
research projection to name the same site commit. A production release is
incomplete until both deployed manifests identify the same approved tag and
commit.

Several legacy domains currently show Vercel's `DNS Change Recommended`
advisory while resolving successfully. Treat DNS migration as a separate
provider-controlled operation; do not combine it with a code release.

## Fly sunset services

Vela Web does not depend on Fly.io.

- `vela-hub` serves only the published `410 Gone` sunset response at
  `hub.constellate.science`. Keep it through the documented sunset window ending
  2026-08-18, then remove its obsolete secrets and application.
- `vela-hub-witness` has no public domain or current client. Its unique SQLite
  state was integrity-checked and archived under
  `~/Desktop/Constellate/Archives/vela-hub-witness-2026-07-20/`; its machine is
  scaled to zero. Retain the unattached volume until the archive receives its
  final deletion review.
- `prospect-acceptance` is unrelated and must not be modified from this repo.

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
