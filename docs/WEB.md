# Vela Web operations

This is the current operations contract for the private Vela Web workspace.
Earlier design and migration plans live under `docs/history/`.

## Product boundary

- `www.vela.space` is the canonical editorial surface: Next.js 16, App
  Router, static export (`output: "export"`). Moved off Astro 2026-07-28.
- `app.vela.space` is the canonical Next.js Repository Observatory surface.
- `vela.space` redirects to `www`; product paths on `www` redirect to `app`.
- Both applications are read-only surfaces of one Web product. They expose no signer, public
  mutation API, Server Action, or scientific authority. The Observatory reads
  a bounded projection from Neon; canonical custody remains in the frontier
  Git repositories.
- Normative protocol and CLI documentation remains in the Vela repository at
  an exact release commit. This repository owns onboarding and explanation,
  and serves it from `www.vela.space/docs`.

`bun run check:boundary` makes that product boundary executable. It rejects
Server Actions, request-scoped cookies or headers, authentication, mutation
handlers, and arbitrary request-time fetches. The only Route Handlers are
exact-root, same-origin reads for normalized search documents and graph slices.

The repository is a Bun workspace with four maintained boundaries:

```text
apps/www                editorial Next.js application (static export)
apps/observatory        read-only Next.js application
packages/brand          governed identity, tokens, fonts, and delivery assets
packages/frontier-data  Git-to-Neon projection, validation, search, and manifests
```

The whole ecosystem follows one path:

```text
produce       preserve       check       decide                 reuse
workbench  →  frontier Git  →  Vela  →  signed policy or human  →  Web
Canopus       canonical      replay      protected approval     readers
(optional)
```

Canopus is optional producer scaffolding. The frontier Git repository remains
canonical. Released Vela performs checks and replay. Authority stays with
signed policy or a protected human decision. Web owns only explanation and
read-only reuse.

The editorial application owns one current route vocabulary:

```text
/                 the chart
/constellations   Constellations of Borrowed Light
/docs             the five guides
/docs/[section]   install · quickstart · produce · review · reproduce
```

The rebuild of 2026-07-28 reduced the surface to these two while the rest is
rewritten. `apps/www/scripts/check-public-routes.mjs` holds the set as an
executable contract: a route that ships without being added there fails the
build, and so does a route in the set that stops shipping. Add each of
`/essays`, `/discovery-engine`, `/gigafactories-for-science`, `/whitepaper`,
`/stack` and `/facility` back to that set as its page returns.

The masthead exposes Constellations, Documentation, GitHub and Observatory,
and the Vela sail is the only Home affordance.

### Docs moved off the Observatory, 2026-07-28

`/docs` used to redirect from www to `app.vela.space/docs`, where five
hand-written guidance sections lived. It now lives here, and the Observatory
redirects its old paths to www permanently, so existing links keep working in
the direction they were written.

Two changes, not one. The route moved because the Observatory is a read-only
view of projected state and should not also be the manual. The *content*
changed because a paraphrase of a protocol is a second source of truth: the
five guidance sections have been deleted, and the site now serves the Vela
repository's own documentation.

**Vendored at the pinned commit.** `apps/www/scripts/sync-vela-docs.mjs`
extracts 19 files with `git show <pin>:docs/<file>` from any Vela clone that
contains the commit recorded in `vela-release.v1.json`, and writes them into
`src/content/docs/manifest.json`. The working tree is never read — when this
was built the local checkout was 1889 insertions across 19 files ahead of the
pin, which is precisely the drift the script exists to prevent. The output is
committed, so builds and CI need no Vela checkout, and the content is
reviewable in a diff.

Re-run it whenever the release pin moves:

```bash
bun apps/www/scripts/sync-vela-docs.mjs
```

`src/data/docs.test.ts` asserts the manifest commit equals `velaRelease.commit`,
so a moved pin with a stale sync fails CI rather than shipping the manual for
a release the site no longer advertises.

**What is published.** The 19 pages are the quickstarts, the protocol, the
evidence-and-authority set, the frontier-operations set, and the CLI
reference. Excluded on purpose: the 23 architecture decision records, which
are an internal history rather than instructions; `POSI_SELF_ASSESSMENT` and
`HARDWARE_SIGNING_PROPOSAL`, an internal assessment and an unaccepted
proposal; `EXIT_AND_EXPORT_DRILL`, an operator runbook; and `README`, an index
this site replaces. Publishing an internal assessment is hard to walk back, so
the default is conservative — add a file to `GROUPS` in the sync script to
publish it.

**Rendering.** Plain markdown through remark and rehype at build, with Shiki
for code, themed to the editorial palette rather than to a shipped theme.
Deliberately not MDX: its plugin options must be serializable for Turbopack,
local plugin functions are not, and carrying them is what forced this
application onto the webpack builder the last time it had a markdown pipeline.
The bodies travel inside the manifest module rather than as sibling files,
because `import.meta.dirname` is undefined in the static-export bundle and a
path resolved at render time lands on a transient prerender chunk — the same
trap already recorded in `packages/frontier-data/src/editorial.ts`.

**Chrome.** Structure from Tailwind Plus Protocol — grouped section rail,
content column, on-page contents, previous and next — and nothing else.
Protocol is an API-reference template on zinc and emerald with its own prose
theme and a dark mode; these are upstream markdown files on the editorial
ground, so the shell is rebuilt in this site's vocabulary rather than
reskinned.

## Exact frontier state

`packages/frontier-data/src/registry.ts` is the typed registry for the four
canonical Git repositories. A three-hourly or manual GitHub workflow first
binds itself to the exact deployed Observatory commit, then checks out clean
`origin/main` Frontier tips, verifies them with the pinned Vela release, and
writes a content-addressed normalized read model to the `vela_observatory`
database in the `vela-observatory-projection` Neon project:

```bash
bun packages/frontier-data/scripts/refresh-neon-projection.mjs
bun run db:migrate:check
bun run projection:verify
```

Refresh refuses dirty or unpushed sources, wrong branches or remotes, Vela
version drift, packet drift, missing decision evidence, incomplete reviews, and
root disagreement. The writer is available only to the refresh workflow. The
Vercel application receives the native PostgreSQL role
`observatory_projection_reader`; it does not inherit Neon's managed
`neon_superuser` role and has schema `USAGE` plus table `SELECT` only. Production
also uses a read-only compute endpoint.

Rebuilding unchanged source facts is a no-op. Observation time, activation
time, and a newly computed candidate root do not create another retained
release when the read-model schema, Vela binary, source Frontier identities,
table roots, and source roots are identical. A changed release is deployed
only from the exact application commit already identified by the production
manifest. The workflow verifies the expected projection root from the live
manifest after the deploy hook, so an ambiguous hook timeout is not treated as
either success or failure by itself.

### The editorial snapshot

The Observatory reads Neon at build. `apps/www` does not: it is a static export
and reads one committed file,
`packages/frontier-data/config/editorial-summary.v2.json`, so the editorial site
builds with no database credential at all.

That file is the only projection data the public editorial site serves, which
makes its staleness a correctness problem rather than a freshness one. It has
failed that way once. Between 2026-07-25 and 2026-07-28 the protocol moved
`status.roots.event_log` and the work counts out of `vela status`;
`compactEditorialSummary` read both by hand, so `bun run projection:snapshot`
started throwing, and the site went on serving the last values anyone had
committed — 646 open targets on Erdős against a real 1, and 23 pending reviews
on Sidon sets against a real 0.

Three things now prevent that recurring:

- The generator reads through `statusStateRoot()` and the `work` projection —
  the same helpers the Observatory renders from — rather than reaching into
  `status` by hand, so a field that moves breaks the build instead of
  evaluating to `undefined`.
- `packages/frontier-data/tests/editorial-summary.test.ts` runs the generator
  against a status shaped like the one the emitter publishes today and asserts
  the output satisfies the schema. It needs no database, so it runs in CI.
- The scheduled refresh regenerates and commits the snapshot
  (`.github/workflows/refresh-projection.yml`). Before this it refreshed Neon
  and redeployed the Observatory only, which is precisely how www's numbers
  froze while the Observatory's stayed current.

v2 also keeps `open_work` nullable. Null means the frontier's target index is
blocked and its inventory could not be read, which is not the same claim as
zero open work; the landing page prints an em dash and says so rather than
rendering unknown as none.

Regenerate by hand with `bun run projection:snapshot` (needs
`VELA_PROJECTION_DATABASE_URL` once).

There is no checked-in frontier snapshot for the Observatory, no copied search
index, and no Build Week JSON. The Observatory reads release-scoped rows from
Neon during rendering.
Each build compiles one exact release root, while `/api/search` and `/api/graph`
accept only retained exact roots. This prevents an old deployment from silently
rendering a newer data head. The database is disposable: exact Git commits,
trees, event roots, graph roots, and row roots identify the projection, and it
can be rebuilt from canonical repositories.

Neon is neither canonical nor writable by the public application. It is a
disposable read model. The `@vela/frontier-data` projector is its only writer, and the
Observatory receives a SELECT-only role scoped to the normalized projection.

The credential contract is intentionally closed: application reads and checks
use only `VELA_PROJECTION_DATABASE_URL`; migration apply, refresh, activation,
and pruning use only `VELA_PROJECTION_WRITER_DATABASE_URL`. Generic
`DATABASE_URL` fallback and reader-as-writer fallback are unsupported. Neon
branches do not represent releases: `main` is the only permanent branch,
release-scoped rows provide rollback, and CI or migration rehearsal branches
are disposable and time-bounded.

The empty archived `event-first-hub-cutover` branch was deleted on 2026-07-22
after explicit approval. The unused Neon-managed `observatory_reader` login was
deleted after its grants and ownership were proven empty. A local,
credential-free `NOLOGIN` placeholder with no inheritance, database creation,
or role creation privilege retains that exact name only so the immutable
`0002_observatory_reader` migration still replays. The `v0-370-read-model`
rehearsal branch was deleted after the `v0.420.4` projection activation was
verified. Neon now has no permanent branch other than `main`.

Those two URLs are the complete secret inventory for database access. The
reader password is validated from the reader URL when provisioning the fixed
`observatory_projection_reader` role; it is not stored as a third duplicate
secret.

`packages/frontier-data/migrations/` owns the idempotent schema. CI creates a
disposable Neon branch, checks the current schema and preserved legacy reader,
rehearses migration from an empty `observatory` schema, rebuilds the complete
projection, proves a failed candidate cannot move `current_release`, and then
deletes the branch. The branch also expires after six hours if GitHub cleanup
cannot run. Pull requests, including Dependabot, run the no-secret static
contracts; only trusted main, release-candidate tag, or manual runs receive
projection credentials. A changed refresh inserts a complete candidate,
recomputes row roots and corpus counts, and only then atomically moves
`current_release`. An unchanged refresh retains the current release root and
skips deployment. Failed refreshes leave the prior head unchanged. Structural
ranking is stored separately as non-authoritative `structural_advice`; it never
defines graph membership or producer work.

### Historical publication-facts experiment

The source-local `site.frontier-publication-facts.v1` experiment is frozen at
`vela-web v0.420.2`. Its exact inputs, roots, two-implementation evidence, and
replay commands remain in the Vela
`VELA_MINIMUM_READ_NETWORK_PHASE_1_PUBLICATION_FACTS_2026-07-24.md` report.
It was never a protocol, database table, public API, or production projector.

The retired builder targeted the predecessor `observatory.v3` read model and
is intentionally absent from current `main`. Replaying the historical
experiment means checking out its recorded tag and exact Frontier commits, not
adding a compatibility adapter to the current normalized read model.
Promotion remains gated on the frozen cross-Frontier reader tasks and two
independently maintained consumers.

## Brand and assets

`packages/brand/marks/source/vela-symbol-full.svg` is the exact original Vela
sail released in `v0.300.2`. Do not redraw or reinterpret it. All delivery
variants are generated and content-addressed.

- Editorial delivery: Zodiak, Gambetta, Switzer, and IBM Plex Mono.
- Observatory delivery: Geist for interface text and IBM Plex Mono for roots,
  identifiers, commands, and exact values.
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

Local builds need the read-only projection URL because the home derives its
release facts from the same checked projection used by the Observatory. Export
only `VELA_PROJECTION_DATABASE_URL`; do not source an entire Vercel environment
file, because production-only identity variables intentionally activate stricter
manifest checks. Local development should keep `VERCEL_ENV=development`.

CI additionally runs rooted runtime-route, migration, corpus, boundary, and
semantic accessibility checks. Release candidates and design-affecting changes
run the documented Codex in-app Browser matrix at the supported mobile, tablet,
and desktop widths. Stale screenshot binaries are not treated as product truth.

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

The manifests use `vela.web-deployment.v2` and `vela.site-deployment.v3`; each
records the exact release tag, Git commit, brand schema/root, deployment
identity, and delivery mode. The Observatory manifest additionally embeds
`vela.observatory-release-manifest.v5` over `observatory.v4`, including
normalized Claim, Submission, Registration, Verification, review, work,
search, graph, authority, and source-root identities. Repository authority is
read-only product evidence: the projection may expose public keys, signed
record roots, and restricted-policy identity, but never custody material,
authentication context, a decision control, or an authority operation. A
production release is incomplete until its deployed manifest matches the
approved tag, commit, and activated projection exactly.

None of that identity is set by hand. The tag is derived from the root
`package.json` version — the only place a version lives — and the commit and
deployment id come from `VERCEL_GIT_COMMIT_SHA` and `VERCEL_DEPLOYMENT_ID`,
which `deploymentIdentity()` reads directly and which a production build
refuses to go without. An ordinary preview may deploy an untagged commit; a
released composition must bump the root version and cut the matching tag.
`scripts/check-deployed-manifest.mjs` confirms that the deployed bytes identify
the exact repository commit and projection root.

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
2. Deploy only the application changed by the release from that exact commit.
   A shared brand or data-contract change may require both; editorial-only work
   must not redeploy the Observatory unnecessarily.
3. Verify the changed routes, redirects, semantics, roots, accessibility,
   responsive states, cache isolation, and staging manifest.
4. Tag the final release from the approved commit and deploy the same scope.
5. Verify production manifests and canonical domains. The untouched application
   must retain its prior deployment identity and behavior.
6. Update the parent `ecosystem.lock.json` only after production verification.
7. Remove generated dependencies and build output after the release audit.

Never publish a release if a manifest lacks the exact commit, any root drifts,
verifier success is presented as acceptance, a canonical route is missing, or
browser-delivered bytes expose custody, private coordination, or authority
operations.
