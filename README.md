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

Vela Web is one private Bun workspace with two independently deployed Next.js
surfaces and three shared packages.

| Path | Runtime | Purpose |
| --- | --- | --- |
| `apps/www` | Next.js static export | Product home, publications, and release-bound documentation |
| `apps/observatory` | Next.js | Root-bound frontier, Claim, work, review, graph, and replay views |
| `packages/brand` | TypeScript and CSS | Framework-neutral sail, tokens, fonts, licenses, and deterministic exports |
| `packages/ui` | React, shadcn, and Base UI | Private shared primitives and stable Vela presentation semantics |
| `packages/frontier-data` | TypeScript | Sole validator and projector for frontier, search, work, and graph data |

The applications share brand assets, exact facts, and eligible React
primitives. Authored editorial and workbench route compositions stay with
their owning application. Neither application can sign, accept, or mutate
scientific state.

Vela follows one product story:

```text
map -> target -> work -> submit -> verify -> decide -> remap
```

Any native human or machine workbench may do the work. The canonical Frontier
Git repository preserves exact Submissions and scoped Verification evidence.
Neither production nor Verification changes Standing. Only an authorized
human Decision in that named Frontier changes Standing; deterministic replay
derives the successor state and exact next Target. Vela Web provides the
read-only map and review surfaces.

```text
canonical frontier Git repositories
                 +
       released Vela binary
                 │
                 ▼
        @vela/frontier-data
          │              │
 compact rooted      normalized release rows
    summary                 │
          │              ▼
          │       SELECT-only Neon projection
          ▼              │
 www.vela.space             ▼
 Next.js static     app.vela.space Observatory
```

## Product invariants

- `www.vela.space` is the canonical editorial host.
- `app.vela.space` is the canonical Repository Observatory.
- Frontier pages are exact-root projections. The active data head moves only
  through an atomic, verified projection release; every request remains bound
  to one readable release root.
- Verification, replay, proposal standing, and scientific acceptance remain
  distinct everywhere.
- The web has no signer, Server Action, public mutation API, canonical or
  writable scientific database, human key path, or private coordination
  payload. Neon is a disposable, normalized read projection.
- Normalized projection rows are rebuilt from exact canonical Git commits and
  validated before activation. No whole-Frontier document is embedded as a
  universal browser payload.
- Producer availability, active leases, and advice-only graph opportunities are
  separate projections; graph rank never becomes work rank or authority.
- The original Vela sail is the locked product mark; exported assets are
  derived from its canonical SVG sources.

Result Dossier product evidence and the next human-study gate are maintained in
[`docs/result-dossier-qualification.md`](docs/result-dossier-qualification.md).
The source Frontiers continue to own every scientific object the projection
displays.

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
tests, both production builds, read-only boundaries, artifact budgets, and
deployment manifests. Responsive, keyboard, interaction, and visual release
QA is performed with the Codex in-app Browser against the candidate build.

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

Builds are expected to leave a clean worktree. Release manifests are served at:

- [`www.vela.space/.well-known/vela-web.json`](https://www.vela.space/.well-known/vela-web.json)
- [`app.vela.space/.well-known/vela-site.json`](https://app.vela.space/.well-known/vela-site.json)

## Design and provenance

[`DESIGN.md`](DESIGN.md) defines the shared thesis, profiles, visual language,
and accessibility floors. [`docs/design-system.md`](docs/design-system.md)
records the package, shadcn/Base UI, Tailwind, private-registry, and licensed
source workflow. The July 2026 v1.1 designer handoff is recorded under
`packages/brand/reference/2026-07-v1.1/`; reference artwork is excluded from
production. The archived Observatory at `vela-site@34e3f20` supplied product
anatomy, not a second active implementation. Porting provenance is recorded in
[`docs/observatory-provenance.md`](docs/observatory-provenance.md).

The internal Vela registry coordinates private product source. It is not a
public registry or separately distributed component library. Licensed Tailwind
Plus adaptations remain within the licensed private product and carry source
provenance.

## Licensing

- Code: Apache-2.0 OR MIT, at your option.
- Essays and original diagrams: CC BY 4.0.
- The Vela name and marks: trademark rights reserved.
- Fonts and third-party components: [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
