<p align="center">
  <a href="https://vela.space/">
    <img src="packages/brand/marks/exports/svg/vela-lockup-horizontal-color.svg" width="240" alt="Vela">
  </a>
</p>

<p align="center">
  <strong>problems.science — an agent-native workspace for cumulative science.</strong><br>
  Humans and AI agents work on the same structured scientific state, and neither
  the browser nor this application can change what science accepts.
</p>

<p align="center">
  <a href="https://problems-constellate-dc388081.vercel.app/problems/erdos-problems/321">Live</a> ·
  <a href="#webmcp-the-agent-interface">WebMCP</a> ·
  <a href="https://github.com/vela-science/vela">Protocol and CLI</a> ·
  <a href="docs/webmcp-challenge.md">Challenge write-up</a> ·
  <a href="docs/WEB.md">Operations</a>
</p>

---

## WebMCP: the agent interface

A browser agent on a Problem page does not read the DOM and guess which button
to press. It calls the operations the product actually has:

```js
document.modelContext.registerTool({
  name: "inspect_claim",
  description: "Read one Claim in full: its assertion and conditions, its "
    + "Standing, and the lineage behind that Standing …",
  inputSchema: { type: "object", properties: { claim_id: { type: "string" } } },
  execute: async ({ claim_id }) => inspectClaim(environment, { claim_id }),
});
```

Eight tools are registered on every Problem route.

| Tool | Purpose | R/W |
| --- | --- | --- |
| `inspect_problem` | Exact current state: question, current Result, Standing, sources, and the projection roots those facts came from | Read |
| `inspect_claim` | One Claim's full lineage — Submission, each Verification with what it explicitly does *not* establish, and the attributed Decision | Read |
| `inspect_history` | Why the system believes what it believes: Proposals, Verifications, Decisions, corrections and supersessions | Read |
| `search_problems` | Find Problems by text and Standing across the release | Read |
| `open_approach` | Begin an attributed line of work — one Approach and one Attempt | Write |
| `attach_evidence` | Attach an artifact by exact content root, with a written rationale | Write |
| `prepare_submission` | Draft an **unsigned** `vela.submission.v3` proposing a scientific state change | Write |
| `inspect_candidate` | Read what is pending: payload root, target Claim, signing state | Read |

### The one thing an agent cannot do

`prepare_submission` is the end of the road. It produces an unsigned draft and
returns, in the tool result itself, that Standing has not moved.

```text
agent  →  inspect  →  open_approach  →  attach_evidence  →  prepare_submission
                                                                   │
                                                          unsigned candidate
                                        ═══════════ HUMAN BOUNDARY ═══════════
                                                                   │
                              local Workbench / vela CLI, user-held key
                                    submit → verify → decide → replay
                                                                   │
                                                   Vela Repository (Git)
                                                                   │
                                              projection → Standing moves here
```

This is not a limitation we apologise for. It is the point. Three independent
gates fail the build if hosted code tries to cross it: the closed command
vocabulary in `packages/activity-data/schema/base.sql`, the pinned Server Action
matrix in `packages/activity-data/tests/governance.test.ts`, and
`scripts/check-scientific-authority-boundary.mjs`. A fourth,
`apps/problems/src/webmcp/authority-boundary.test.ts`, reads the agent
interface as bytes and refuses signing calls, authoritative record names, and
verb shapes like `recordDecision` that nobody has written yet.

The agent's write tools construct `FormData` and call the **same Server
Actions** the human forms post to. There is no agent-only code path, which is
why an agent inherits every guard a person has: the anchor-root check that
refuses a mutation aimed at state that has moved, the idempotency key, and the
account requirement.

### Trying it

WebMCP needs ChatGPT's in-app browser, or Google Chrome 149+ with
`chrome://flags/#enable-webmcp-testing` enabled and the browser restarted.

Open a Problem — [Erdős 321](https://problems-constellate-dc388081.vercel.app/problems/erdos-problems/321)
is the one with real corrected history — and ask the agent:

> Why does this Problem's current Result hold the Standing it does?

It will call `inspect_claim` and `inspect_history` and answer from retained
records: a scoped `claim_chain_fidelity` check that explicitly does not
establish a proof, and a signed Decision by `agent:submission-v3-migration`
under event `vev_15632b53fb7fd674`, which corrected an earlier Claim.

Append `?webmcp` to any Problem URL to see the registered tools listed in the
corner for the rest of the session.

### What was built during the WebMCP Challenge

`problems.science` existed before the Submission Period. Everything under
`apps/problems/src/webmcp/`, the `/api/work` read route, the agent-interface
tests, and these documents were written during it. `git log` carries the dates;
[`docs/webmcp-challenge.md`](docs/webmcp-challenge.md) enumerates the split.

---

## What lives here

One Bun workspace: the Problems application and the packages it is built from.

| Path | Runtime | Purpose |
| --- | --- | --- |
| `apps/problems` | Next.js server application | The research product at `problems.science`: Problems, Results, Sources, Work, History, graph, and contribution flows |
| `packages/brand` | TypeScript and CSS | Framework-neutral sail, tokens, fonts, licenses, and deterministic exports |
| `packages/ui` | React, shadcn, and Base UI | Shared primitives and stable Vela presentation semantics. Application source, never a published package |
| `packages/projection-data` | TypeScript | Sole validator and projector for Repository, Problem, search, and graph data |
| `packages/activity-data` | TypeScript and SQL | The only mutable product data. Every row carries `authority_effect = 'none'` |
| `apps/problems/src/webmcp` | TypeScript | The agent interface. Reads the projection, writes through the human Server Actions |

The application may own hosted account and workspace activity. It cannot sign,
accept, or mutate scientific state — not from a form, and not from a tool.

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

## Running it locally

No credentials, no database to provision, no Postgres to install:

```bash
git clone https://github.com/vela-science/problems
cd problems
bun install
bun run dev:demo
```

Then open <http://localhost:3000/problems/erdos-problems/321>.

`dev:demo` builds both data planes in-process — real schemas, the real role
topology, and real projected rows exported from a live release — and serves them
over the same HTTP protocol the application speaks to Neon. There is one
application code path, not a demo one; the app cannot tell the difference,
which is the only way this proves anything.

The seed covers every published Problem's reviewed occurrences and the Erdős
321, 94 and 1 source material. Accounts are absent rather than faked: without
WorkOS credentials the application already degrades to a fully readable public
Problems, so the read-only tools work and the write tools explain why they
cannot. `scripts/demo/export-seed.mjs` regenerates the seed and is for
maintainers with a reader URL.

To run against a real projection instead, copy `apps/problems/.env.example` to
`apps/problems/.env.local`, fill it, and use `bun run dev:problems`.

## Licensing

- Code: Apache-2.0 OR MIT, at your option. [`LICENSE`](LICENSE) carries the
  Apache-2.0 text so hosts and scanners detect one; [`LICENSE-MIT`](LICENSE-MIT)
  is the other half of the option and is equally in force.
- Essays and original diagrams: CC BY 4.0.
- The Vela name and marks: trademark rights reserved.
- Fonts and third-party components: [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
