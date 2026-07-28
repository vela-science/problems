# Vela Web operations

This is the current operations contract for the private Vela Web workspace.
Earlier design and migration plans live under `docs/history/`.

## Product boundary

- `www.vela.space` is the canonical Astro editorial surface.
- `app.vela.space` is the canonical Next.js Repository Observatory surface.
- `vela.space` redirects to `www`; product paths on `www` redirect to `app`.
- Both applications are read-only surfaces of one Web product. They expose no signer, public
  mutation API, Server Action, or scientific authority. The Observatory reads
  a bounded projection from Neon; canonical custody remains in the frontier
  Git repositories.
- Normative protocol and CLI documentation remains in the Vela repository at
  an exact release commit. This repository owns onboarding and explanation.

`bun run check:boundary` makes that product boundary executable. It rejects
Server Actions, request-scoped cookies or headers, authentication, mutation
handlers, and arbitrary request-time fetches. The only Route Handlers are
exact-root, same-origin reads for normalized search documents and graph slices.

The repository is a Bun workspace with four maintained boundaries:

```text
apps/www                editorial Astro application
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
/              product-first home
/manifesto     five concise theses
/essays        publication index
/constellations, /discovery-engine, /gigafactories-for-science
/whitepaper, /stack, /facility
```

The primary masthead exposes Home, Constellations, Manifesto, and Open
Observatory. The other listed routes remain addressable for durable links and
the footer, but do not define a competing public journey.

`/case` permanently redirects to `/manifesto`; `/catalog` permanently redirects
to `/essays`. Neither legacy name belongs in current navigation or copy.

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

There is no checked-in frontier snapshot, copied search index, or Build Week
JSON. The Observatory reads release-scoped rows from Neon during rendering.
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

- Editorial delivery: Newsreader, Inter, and IBM Plex Mono.
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
