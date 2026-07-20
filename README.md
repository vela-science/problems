<p align="center">
  <a href="https://www.vela.space/">
    <img src="packages/brand/marks/exports/svg/vela-lockup-horizontal-color.svg" width="240" alt="Vela">
  </a>
</p>

<p align="center">
  <strong>The editorial home and read-only Observatory for Vela.</strong><br>
  Exact scientific state, published without moving the authority boundary into the web.
</p>

<p align="center">
  <a href="https://www.vela.space/">Editorial</a> ·
  <a href="https://app.vela.space/frontiers">Observatory</a> ·
  <a href="https://github.com/vela-science/vela">Protocol and CLI</a> ·
  <a href="docs/WEB.md">Web operations</a>
</p>

## What lives here

Vela Web is one private Bun workspace with two independently deployed products
and two shared, framework-neutral packages.

| Path | Runtime | Purpose |
| --- | --- | --- |
| `apps/www` | Astro | Product home, essays, and long-form editorial work |
| `apps/observatory` | Next.js | Immutable frontier, finding, work, review, and replay views |
| `packages/brand` | TypeScript and CSS | Governed sail, tokens, fonts, licenses, and deterministic exports |
| `packages/frontier-data` | TypeScript | Sole validator and projector for frontier, search, work, and graph data |

The applications share brand assets and exact facts. They do not share UI
implementations, and neither one can sign, accept, or mutate scientific state.

```text
clean frontier checkouts + released Vela binary
                    │
                    ▼
          @vela/frontier-data
             │             │
     compact summary   validated bundle
             │             │
             ▼             ▼
       www.vela.space   app.vela.space
          Astro          Next.js ISR
```

## Product invariants

- `www.vela.space` is the canonical editorial host.
- `app.vela.space` is the canonical Repository Observatory.
- Frontier pages are immutable, release-bound projections with no request-time
  frontier fetch.
- Verification, replay, proposal standing, and scientific acceptance remain
  distinct everywhere.
- The web has no signer, Server Action, public mutation API, database, human
  key path, or private coordination payload.
- The complete frontier bundle is validated at build time and never embedded
  as a universal browser payload.
- Producer availability, active leases, and advice-only graph opportunities are
  separate projections; graph rank never becomes work rank or authority.
- The original Vela sail is the locked product mark; exported assets are
  derived from its canonical SVG sources.

## Develop with Bun

The repository pins Bun `1.3.12` in `package.json` and `bun.lock`. Do not add
npm, pnpm, Yarn, Turborepo, or per-application lockfiles.

```bash
bun install --frozen-lockfile
bun run dev:www          # http://127.0.0.1:4321
bun run dev:observatory  # http://127.0.0.1:4322
```

## Verify a release candidate

The root workflow checks the brand and frontier roots, package types, unit
tests, both production builds, browser contracts, accessibility, artifact
budgets, and deployment manifests.

```bash
bun install --frozen-lockfile
bun run check
bun run lint
bun run typecheck
bun run test
bun run build
bun run test:e2e
bun run test:a11y
bun run test:visual
bun run test:budgets
bun run test:manifests
git diff --check
```

Builds are expected to leave a clean worktree. Release manifests are served at:

- [`www.vela.space/.well-known/vela-web.json`](https://www.vela.space/.well-known/vela-web.json)
- [`app.vela.space/.well-known/vela-site.json`](https://app.vela.space/.well-known/vela-site.json)

## Design and provenance

[`DESIGN.md`](DESIGN.md) is the current visual and interaction contract. The
July 2026 v1.1 designer handoff is recorded under
`packages/brand/reference/2026-07-v1.1/`; reference artwork is excluded from
production. The archived Observatory at `vela-site@34e3f20` supplied product
anatomy, not a second active implementation. Porting provenance is recorded in
[`docs/observatory-provenance.md`](docs/observatory-provenance.md).

## Licensing

- Code: Apache-2.0 OR MIT, at your option.
- Essays and original diagrams: CC BY 4.0.
- The Vela name and marks: trademark rights reserved.
- Fonts and third-party components: [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
