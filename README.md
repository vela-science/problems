<p align="center">
  <a href="https://vela.space/">
    <img src="packages/brand/marks/exports/svg/vela-lockup-horizontal-color.svg" width="240" alt="Vela">
  </a>
</p>

<p align="center">
  <strong>Vela Web: the living editorial home and the Problems research product.</strong><br>
  Scientific direction and exact state, without moving the authority boundary into the web.
</p>

<p align="center">
  <a href="https://vela.space">vela.space</a> ·
  <a href="https://problems.science/problems">Problems</a> ·
  <a href="https://github.com/vela-science/vela">Protocol and CLI</a> ·
  <a href="docs/WEB.md">Web operations</a>
</p>

## What lives here

Vela Web is one private Bun workspace with two deliberately separate Next.js
applications and shared packages.

| Path | Runtime | Purpose |
| --- | --- | --- |
| `apps/problems` | Next.js server application | The research product at `problems.science`: Problems, Results, Sources, Work, History, graph, and contribution flows |
| `apps/www` | Static Next.js export | The Vela front page at `vela.space`: one screen, with its retained painting |
| `packages/brand` | TypeScript and CSS | Framework-neutral sail, tokens, fonts, licenses, and deterministic exports |
| `packages/ui` | React, shadcn, and Base UI | Private shared primitives and stable Vela presentation semantics |
| `packages/projection-data` | TypeScript | Sole validator and projector for Repository, Problem, search, and graph data |

Both applications share brand assets and eligible React primitives. The
editorial application is entirely static. The Problems application may own
hosted account and workspace activity, but neither application can sign,
accept, or mutate scientific state.

Vela follows one product story:

```text
Problem -> native work -> submit -> verify -> decide -> replay
```

Any native human or machine workbench may do the work. The canonical Repository
Git repository preserves exact Submissions and scoped Verification evidence.
Neither production nor Verification changes Standing. Only an authorized,
attributed Decision in that named Repository changes Standing;
the performer may be human or agent, and deterministic replay
derives the successor state and current actions. Vela Web provides the
read-only map, contribution handoff, and review surfaces.

```text
canonical repository Git repositories
                 +
       released Vela binary
                 │
                 ▼
        @vela/projection-data
                 │
       normalized release rows
                 │
                 ▼
       SELECT-only Neon projection
                 │
                 ▼
       problems.science application
```

## Product invariants

- `vela.space` is the canonical editorial origin. `problems.science` is the
  canonical research-product origin. Editorial pages do not live inside the
  Problems application shell.
- Repository pages are exact-root projections. The active data head moves only
  through an atomic, verified projection release; every request remains bound
  to one readable release root.
- Verification, replay, proposal standing, and scientific acceptance remain
  distinct everywhere.
- The web has no signer, scientific Server Action, public mutation API,
  canonical or writable scientific database, human key path, or private
  coordination payload. The single isolated AuthKit sign-out action carries no
  scientific state. Neon is a disposable, normalized read projection.
- Normalized projection rows are rebuilt from exact canonical Git commits and
  validated before activation. No whole-Repository document is embedded as a
  universal browser payload.
- Contribution starts from an exact Problem or Repository and produces a direct
  Submission. Graph structure remains an advice-only reading aid and never
  becomes scientific authority.
- The original Vela sail is the locked product mark; exported assets are
  derived from its canonical SVG sources.

Current releases project canonical Repository objects directly; the source
Repositories own every scientific object the projection displays.

## Develop with Bun

The repository pins Bun `1.3.12` in `package.json` and `bun.lock`. Do not add
npm, pnpm, Yarn, Turborepo, or per-application lockfiles.

```bash
bun install --frozen-lockfile
bun run dev:problems     # http://127.0.0.1:4322
bun run dev:www          # configurable local editorial preview
```

## Verify a release candidate

The root workflow checks the brand and repository roots, package types, unit
tests, the production build, read-only boundaries, artifact budgets, and
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

Builds are expected to leave a clean worktree. The production release manifest
is served at [`problems.science/.well-known/vela-site.json`](https://problems.science/.well-known/vela-site.json).

## Design and provenance

[`DESIGN.md`](DESIGN.md) defines the shared thesis, profiles, visual language,
and accessibility floors. [`docs/design-system.md`](docs/design-system.md)
records the package, shadcn/Base UI, Tailwind, private-registry, and licensed
source workflow. The July 2026 v1.1 designer handoff is recorded under
`packages/brand/reference/2026-07-v1.1/`; reference artwork is excluded from
production. The archived Problems at `vela-site@34e3f20` supplied product
anatomy, not a second active implementation. Porting provenance is recorded in
[`docs/projection-provenance.md`](docs/projection-provenance.md).

Tailwind Plus and shadcn.io Pro patterns informed some of this application's
components, and each place that studied one says so in a source comment and in
[`docs/editorial-references.md`](docs/editorial-references.md). Both licenses
permit an open-source end product whose primary purpose is not redistributing
components, which is why this source is public; both forbid shipping the
components as a registry, a UI library, or an installable package, which is why
`@vela/ui` is application source and every workspace manifest stays `private`.
The private component catalogue lives in the upstream repository, not here.

## Licensing

- Code: Apache-2.0 OR MIT, at your option.
- Essays and original diagrams: CC BY 4.0.
- The Vela name and marks: trademark rights reserved.
- Fonts and third-party components: [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
