# Vela Web operations

This is the current operations contract for the private Vela Web workspace.
Earlier design and migration plans live under `docs/history/`.

## Product boundary

- `www.vela.space` is the canonical editorial surface: Next.js 16, App
  Router, static export (`output: "export"`). Moved off Astro 2026-07-28.
- `problems.science` is the canonical Vela application origin.
  `app.vela.space` remains a compatibility alias during the canonical-domain
  cutover. Problems is the application's conceptual center, while Home orients
  readers across current
  change, open work, communities, and the exact scientific record. Advanced
  records remain available in the same runtime.
- `vela.space` redirects to `www`; Observatory paths on `www` redirect to
  `problems.science`.
- Hosted Vela is non-authoritative. The Observatory reads a bounded SELECT-only
  projection from Neon. Work mode writes hosted research activity through
  `@vela/activity-data`. Canonical custody remains in Repository Git
  repositories.
- Normative protocol and CLI documentation remains in the Vela repository at
  an exact release commit. This repository owns onboarding and explanation,
  and serves it from `www.vela.space/docs`.

`bun run check:boundary` applies one profile per deployable application. It
keeps www static, limits Vela Route Handlers to declared exact-root reads,
identity, and draft export, and requires Work mutations to call
`@vela/activity-data`. ESLint blocks
direct database clients, hosted signing machinery, and WorkOS imports outside
the named identity files. The package-direction check keeps
`@vela/observatory-data` independent of mutable activity and limits
`@vela/activity-data` reuse to exact canonical and read contracts.

The repository is a Bun workspace with six maintained boundaries:

```text
apps/www                editorial Next.js application (static export)
apps/observatory        unified Vela application: Problem State, Work, and Records
packages/brand          governed identity, tokens, fonts, and delivery assets
packages/ui             shared shadcn/Base UI source and Vela presentation semantics
packages/observatory-data  Git-to-Neon projection, validation, search, and manifests
packages/activity-data  hosted activity schema, authorization, and mutation API
```

`packages/brand` is framework-neutral. `packages/ui` is private React source
shared by eligible interactions in the two applications and future private
Vela applications. Route composition stays app-local. The internal registry is
product-bound and is never published as a separate UI library; see
[`design-system.md`](design-system.md).

The whole ecosystem follows one path:

```text
map -> target -> work -> submit -> verify -> decide -> remap
```

Native research tools and external harnesses remain replaceable. The Repository
Git repository is canonical. Vela binds exact Submissions and scoped
Verification evidence, but neither changes Standing. Only an authorized, attributed
Decision in that named Repository changes Standing; replay derives the successor
state and next Target. Problems may coordinate candidate work, but hosted state
cannot issue a Vela Event or Decision, change Standing, or sign as a user.

The editorial application owns one current route vocabulary:

```text
/                 the editorial scientific-state gateway
/constellations   Endless Frontiers
/docs             the vendored Vela documentation
/docs/[section]   16 pages in five groups, synced from the Vela release pin
```

The retired `/essays`, `/developers`, and `/security` pages remain permanent
redirects to `/constellations`, `/docs/quickstart`, and `/docs/threat-model`.
They preserve old links without maintaining three parallel explanations of
material the essay and exact manual already own.

`apps/www/scripts/check-public-routes.mjs` holds the set as an executable
contract: a route that ships without being added there fails the build, and so
does a route in the set that stops shipping. Publication metadata may retain
future entries, but the site labels them in preparation and does not link them
until a substantive page joins this contract.

The masthead carries the sail as the Home affordance and exposes one Essay,
Docs, Problems, and GitHub. Problems leaves the editorial site for the shared
Vela application. Developer onboarding and the security boundary live in the
pinned manual instead of separate editorial shells.

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
extracts 16 files with `git show <pin>:docs/<file>` from any Vela clone that
contains the commit recorded in `vela-release.v1.json`, and writes them into
`src/content/docs/manifest.json`. The working tree is never read — when this
was built the local checkout was 1889 insertions across 19 files ahead of the
pin, which is precisely the drift the script exists to prevent. The output is
committed, so no build reads a Vela clone to render the manual, and the content
is reviewable in a diff. Projection releases use a separately installed binary
whose version and bytes are checked against the same release record.

Re-run it whenever the release pin moves:

```bash
bun apps/www/scripts/sync-vela-docs.mjs
```

`src/data/docs.test.ts` asserts the manifest commit equals `velaRelease.commit`,
so a moved pin with a stale sync fails CI rather than shipping the manual for
a release the site no longer advertises.

**The wire schemas, vendored the same way.** `vela.status.v4` is declared twice
— once upstream, generated from the Rust type that emits it, and once here as
the zod schema that parses it off the wire. Nothing held the two together, so
upstream could rename a field and the first thing to notice would be a
projection refresh failing after the release.
`packages/observatory-data/scripts/sync-vela-schemas.mjs` vendors upstream's
declaration at the pin, and `tests/status-schema.test.ts` holds the reader to
it: a document missing any field upstream requires must be refused.

```bash
bun packages/observatory-data/scripts/sync-vela-schemas.mjs
```

`config/vela-schemas.v1.json` records the commit and a digest per file, and the
same test asserts both — a moved pin fails on the commit, an edit made here
instead of upstream fails on the digest.

Only `required` is checked, and both sides leave it there: upstream keeps
`vela.status.v4` open and so does this reader, because a field it has not been
taught is the same document with more in it. Rejecting extras cost three
fail-closed breaks of the refresh in six days and caught nothing the `required`
list did not.
The opposite rule governs a signed preimage, where an added field is a different
object with a different root; the two rules are stated together in the Vela
repository's `docs/INTEROPERABILITY.md`.

**What is published.** `GROUPS` in the sync script is the list, and the five
groups are the quickstarts, the protocol, the evidence-and-authority set, the
repository-operations set, and the CLI reference. Excluded on purpose: everything
under `docs/adr/`, an internal history of how choices were made rather than
instructions; everything under `docs/history/`, which is where upstream now
keeps `POSI_SELF_ASSESSMENT`, `HARDWARE_SIGNING_PROPOSAL` and
`EXIT_AND_EXPORT_DRILL`; the campaign and roadmap documents; and `README`, an
index this site replaces. Neither excluded directory is read by the script at
all. Publishing an internal assessment is hard to walk back, so the default is
conservative — add a file to `GROUPS` to publish it.

**Rendering.** Plain markdown through remark and rehype at build, with Shiki
for code, themed to the editorial palette rather than to a shipped theme.
Deliberately not MDX: its plugin options must be serializable for Turbopack,
local plugin functions are not, and carrying them is what forced this
application onto the webpack builder the last time it had a markdown pipeline.
The bodies travel inside the manifest module rather than as sibling files,
because `import.meta.dirname` is undefined in the static-export bundle and a
path resolved at render time lands on a transient prerender chunk — the same
trap already recorded in `packages/observatory-data/src/editorial.ts`.

**Chrome.** Structure from Tailwind Plus Protocol — grouped section rail,
content column, on-page contents, previous and next — and nothing else.
Protocol is an API-reference template on zinc and emerald with its own prose
theme and a dark mode; these are upstream markdown files on the editorial
ground, so the shell is rebuilt in this site's vocabulary rather than
reskinned.

## Exact repository state

`packages/observatory-data/src/registry.ts` is the typed registry for the canonical
Git repositories. One today: `vela-science/math`, the single live mathematics
authority. Four existed under the previous epoch and existed because there were
four topics rather than four authorities. Math is public. Its registry entry
has one canonical GitHub locator and explicit `public` access; the retired
replica is neither a declared locator nor a scheduled mirror target. Every
release derives its roster from this registry, clones each declared `main` at
full depth, and verifies exact remote-head parity. Public product pages and source acquisition both
use the same anonymous canonical locator; no repository-scoped read credential
is required or embedded.

The direct release command checks out clean
`origin/main` Repository tips, verifies them with the pinned Vela release,
and writes a content-addressed normalized read model to the `vela_observatory`
database in the `vela-observatory-projection` Neon project:

```bash
bun run refresh:observatory
```

Refresh refuses dirty or unpushed sources, wrong branches or remotes, Vela
version or released-binary-byte drift, packet drift, missing decision evidence,
incomplete reviews, root disagreement, and every ambient corpus-drop override.
It acquires each source once from its declared public remote, builds
one candidate, inserts it in one transaction, verifies every stored table root,
and only then moves `current_release`. Failure before or during that atomic
activation leaves the prior release current. A later failure retains the private
operator directory and the exact two-sided projection/provider rollback inputs;
it does not pretend a cross-provider operation was atomic. Writer credentials
enter only migration, activation, and final pruning. The Vercel
application connects as the native PostgreSQL login
`observatory_projection_reader_20260813`. That versioned login inherits only
the stable no-login `observatory_projection_reader` permission role; it does
not inherit Neon's managed `neon_superuser` role. Schema `USAGE`, curated table
`SELECT`, and database `CONNECT` attach to the stable role so credential
rotation does not rewrite projection grants. Production also uses a read-only
compute endpoint.

Rebuilding unchanged source facts is a no-op. Observation time, activation
time, and a newly computed candidate root do not create another retained
release when the read-model schema, Vela binary, source Repository identities,
table roots, and source roots are identical. After activation, the same operator
transaction stages any editorial snapshot, requalifies and reconstructs the
clean local commit, publishes that exact commit, deploys it through Vercel's
exact Git-SHA API, verifies production, and retains a qualification record.
The content-addressed source-adapter artifact is retained before activation.
An exact remote lock prevents two operators from interleaving those stages.

Run this transaction immediately after an accepted canonical Math change and
before representing that change as current on problems.science. There is no
clock-based scientific freshness claim: the public manifest names the exact
source commit, and a release is stale whenever it differs from canonical
`origin/main`.

Problem discovery and cross-source reading use two checked files in
`packages/observatory-data/config`: `problem-discovery.v1.json` owns explicit
Area, Hub, Collection, Field, and Topic semantics, while
`problem-resolution.v1.json` owns the small reviewed set of exact occurrence
relations. The application does not derive those concepts from Repository
slugs. Shared source numbers outside the reviewed set remain candidate links
only. `/problems.json` is the current deployment's exact-root-labelled machine
twin for one such source comparison. It requires the projection root, current
resolver root, source ID, native ID, and native kind, and responds with
`Cache-Control: no-store`. Historical immutable dispatch is intentionally
unavailable until Vela retains and dispatches the matching resolver and read
contract. The response returns exact occurrences, statements, and resolver
nonclaims without creating Verification, Decision, or Standing.

A no-op still records that it happened. `current_release.confirmed_at` is
written on both branches, and it is the instant the Observatory footer shows.
The reason is that a reader takes the one date on the page for "how old is
this", and `activated_at` cannot answer that: it stops moving the moment the
source repositories go quiet, so a month with nothing to publish and a month
with a broken refresh render identically. Confirmation keeps moving for as long
as the pipeline is alive, which is the fact worth showing. It is wall-clock and
deliberately outside the release identity, so it never enters a root.

Every changed refresh also carries the exact release root it observed as
current into the final activation statement. The pointer moves only if that
expected root still matches; the candidate's first-live timestamp and the
pointer update share the same transaction. Losing that comparison leaves the
candidate stored but never activated and leaves the prior pointer unchanged.

Historical selection is an explicit operator action, never part of refresh or
pruning:

```bash
VELA_PROJECTION_WRITER_DATABASE_URL=... \
  bun run --filter @vela/observatory-data releases:select -- \
  --expected-current sha256:<current> \
  --target sha256:<previously-activated-release>
```

The command takes two exact roots so it cannot infer authority from ambient
state. In one serializable transaction it locks the current pointer and target,
re-verifies the target with the ordinary stored-release verifier, requires that
the target was previously activated, preserves its original first-live
`activated_at`, and records a new `confirmed_at`. A comparison loss or any
verification failure rolls the transaction back. It never inserts a candidate,
prunes, or changes a release's first-live timestamp.

Do not prune between selecting an older release and re-selecting the later one.
The reader window is current plus the two releases at or before the current
release's first-live timestamp. Selecting an older root therefore makes later
roots temporarily unreadable; pruning in that interval deletes them and removes
the forward route. Exact-root selection and any later pruning are separate
operator decisions.

### The editorial snapshot

The Observatory reads Neon at build. `apps/www` does not: it is a static export
and reads one committed file,
`packages/observatory-data/config/editorial-summary.v4.json`, so the editorial site
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
- `packages/observatory-data/tests/editorial-summary.test.ts` runs the generator
  against a status shaped like the one the emitter publishes today and asserts
  the output satisfies the schema. It needs no database, so it runs in CI.
- The direct release regenerates and commits the snapshot before requalification.
  Before this the release path refreshed Neon
  and redeployed the Observatory only, which is precisely how www's numbers
  froze while the Observatory's stayed current.

v2 also keeps `open_work` nullable. Null means the repository's target index is
blocked and its inventory could not be read, which is not the same claim as
zero open work; the landing page prints an em dash and says so rather than
rendering unknown as none.

Regenerate by hand with `bun run projection:snapshot` (needs
`VELA_PROJECTION_DATABASE_URL` once).

There is no checked-in repository snapshot for the Observatory, no copied search
index, and no Build Week JSON. The Observatory reads release-scoped rows from
Neon during rendering.
Each build compiles one exact release root, while `/api/search` and `/api/graph`
accept only retained exact roots. This prevents an old deployment from silently
rendering a newer data head. The database is disposable: exact Git commits,
trees, event roots, graph roots, and row roots identify the projection, and it
can be rebuilt from canonical repositories.

Neon is neither canonical nor writable by the public application. It is a
disposable read model. The `@vela/observatory-data` projector is its only writer, and the
Observatory receives a SELECT-only role scoped to the normalized projection.

The credential contract is intentionally closed: application reads and checks
use only `VELA_PROJECTION_DATABASE_URL`; explicit schema migration, projection
refresh, and pruning use only `VELA_PROJECTION_WRITER_DATABASE_URL`. Generic
`DATABASE_URL` fallback and reader-as-writer fallback are unsupported. The Neon
project has one branch, `main`. Release-scoped rows and `current_release`
provide exact data identity and rollback without mapping application releases
onto database branches.

Those two URLs are the complete secret inventory for Observatory projection
access. Activity uses two separately scoped URLs described below. The stable
`observatory_projection_reader` permission role and versioned
`observatory_projection_reader_20260813` login are managed directly in Neon and
are not recreated during CI or projection refreshes. Clean-room reconstruction
creates the same no-login group, versioned login, membership, and inherited
read boundary inside its disposable local cluster.

`packages/observatory-data/schema.sql` is the current desired-state schema.
Forward changes live in `packages/observatory-data/migrations`; each applied file
is recorded with its exact byte root. `bun run db:migrate` applies any missing
rooted migrations before a refresh and rejects changed or unknown history.
`bun run db:check` verifies the required tables, indexes, and SELECT-only
application role without writing. The direct release verifies the exact default
Neon branch and never creates or mutates a branch. Optional CI has no production
credential. A refresh
inserts a complete candidate into `main`, recomputes row roots and corpus
counts, and only then atomically moves `current_release`. The read
contract retains only that current release and its two immediate activated
predecessors; unactivated candidates are disposable and are removed by the
same direct transaction, after public readiness. An unchanged refresh retains the current release root; the operator
still deploys the exact qualified site commit, because a rendering change can
need publication without changing a source fact. Git `main` is not pushed until
the staged snapshot passes the full static, projection-backed product, and
reconstruction gates. Structural ranking is not persisted
as a second projection layer; producer work comes from the exact Target Index,
while graph position remains non-authoritative.

Clean-room reconstruction is disposable, creates no Neon branch, and is a
required stage of the direct release. The same command runs independently:

```bash
bun run projection:reconstruct \
  --repositories-root /path/to/repository-checkouts \
  --vela /path/to/the-recorded-vela-binary \
  --source-adapter-artifact /path/to/the-recorded-adapter-artifact \
  --grounded-math-dossier /path/to/the-verified-grounded-dossier.json \
  --output /tmp/vela-atlas-clean-room.json
```

For a deliberately noncanonical preactivation candidate, add
`--production-parity skip`. This still performs and compares both empty-database
reconstructions and the SELECT-only reader check, but records production parity
as skipped. It does not authorize activation; a release candidate must rerun
with the default required production comparison after its product gate passes.

The command creates two empty temporary PostgreSQL clusters, applies the one
desired-state schema, reconstructs and verifies the release twice, checks the
SELECT-only reader boundary, and then removes both clusters. It reads the
production manifest only to compare table roots, Repository inputs, and source
registry identity. A macOS reconstruction and the Linux production build have
different release roots because the released platform binary is part of the
release identity; their projected table roots must still be identical.

### Historical publication-facts experiment

The source-local `site.repository-publication-facts.v1` experiment is frozen at
`vela-web v0.420.2`. Its exact inputs, roots, two-implementation evidence, and
replay commands remain in the Vela
`VELA_MINIMUM_READ_NETWORK_PHASE_1_PUBLICATION_FACTS_2026-07-24.md` report.
It was never a protocol, database table, public API, or production projector.

The retired builder targeted the predecessor `observatory.v3` read model and
is intentionally absent from current `main`. Replaying the historical
experiment means checking out its recorded tag and exact Repository commits, not
adding a compatibility adapter to the current normalized read model.
Promotion remains gated on the frozen cross-Repository reader tasks and two
independently maintained consumers.

## Hosted activity data

`@vela/activity-data` is the sole mutable data owner for Problems. It uses a
separate `vela_activity` database on the existing Neon project's `main` branch.
No preview or child database branches are part of the workflow. The two hosted
planes remain distinct: Observatory projection roles cannot connect to
`vela_activity`, and activity roles cannot connect to `vela_observatory`.

The credential contract has two activity-only URLs:

- `VELA_ACTIVITY_DATABASE_URL` belongs to the least-privilege application role;
- `VELA_ACTIVITY_MIGRATOR_DATABASE_URL` belongs to the migrator role and is
  present only during an explicit migration or role check.

The application role receives `CONNECT` to `vela_activity`, `USAGE` on the
bounded API schema, and `EXECUTE` on its named functions. It has no direct
table grants. The migrator can assume the no-login owner role for rooted schema
changes but cannot create databases, create roles, or inherit authority by
default. Provision the roles once through `packages/activity-data/roles.sql`,
create `vela_activity` as one standalone administrative statement, and apply
`packages/activity-data/database-privileges.sql` while connected to that new
database. Database creation stays outside the migration runner because it
cannot run inside the migration transaction. After bootstrap, use the package
commands:

```bash
bun run activity:db:migrate
bun run activity:db:check
bun run activity:db:verify
```

Activity rows record hosted accounts and workspace membership, follows,
approaches and forks, attempt lifecycle, comments and private notes,
assignments and reproduction requests, artifact roots and locators, and
unsigned Submission drafts. Every mutation carries an idempotency key and
request root. Mutable records advance an expected version, and the audit log
is append-only. API calls verify membership inside the transaction, so a
workspace identifier supplied by another account is not authorization.

Each activity thread binds the exact projection release, Repository identity
and root, source commit and tree, Problem record root, and any Claim root that
was visible when the work began. Problems compares that anchor with the current
exact read and marks it stale when canonical state advances. It never rewrites
the old anchor to make activity appear current.

Large artifact bytes stay outside Postgres. The database stores content and
metadata roots, bounded descriptive metadata, paths, media types, sizes, and
optional locators only. Attempt provider and external-session fields are
neutral records; they do not embed a Modal, Buzz, or other runtime.

An exported draft must validate against the public `vela.submission.v2` schema
vendored from the exact Vela release pin. The hosted service exports canonical,
unsigned bytes with their payload root. A user may pass those bytes to the
explicit local helper:

```bash
bun run activity:submission:sign-local -- \
  /path/to/vela-submission-draft.json \
  --private-key /path/to/user-controlled-key.pem \
  --output /path/to/signed-submission.json
```

The helper is not exported from the package root, and applications are barred
from importing its subpath. Hosted accounts do not become Vela actors. The
activity schema and API cannot emit a Vela Event, Decision, Verification, or
Standing, cannot access an authority key, and cannot write the Observatory.
Deleting `vela_activity` leaves Repository Standing intact; rebuilding
`vela_observatory` leaves hosted activity intact.

## Brand and assets

`packages/brand/marks/source/vela-symbol-full.svg` is the exact original Vela
sail released in `v0.300.2`. Do not redraw or reinterpret it. All delivery
variants are generated and content-addressed.

- Editorial delivery retains Zodiak, Gambetta, Switzer, and IBM Plex Mono.
  WWW currently selects the governed system Iowan Old Style/Baskerville stack
  for display and reading; no proprietary desktop font bytes are copied.
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
bun run check:boundary
bun run check:activity
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
Problems runtime mutations additionally require `VELA_ACTIVITY_DATABASE_URL`.
Only schema work receives `VELA_ACTIVITY_MIGRATOR_DATABASE_URL`; it is not an
application or build credential.

The direct release runs rooted runtime-route, projection, corpus, boundary, and
semantic accessibility checks. Optional CI repeats no-secret static checks.
Release candidates and design-affecting changes
run the documented Codex in-app Browser matrix at the supported mobile, tablet,
and desktop widths. Stale screenshot binaries are not treated as product truth.

## Deployment topology

The `constellate-dc388081` Vercel team has two active Vela Web projects:

| Project | Application | Production domains |
| --- | --- | --- |
| `vela-web-www` | `apps/www` | `www.vela.space`, redirect aliases |
| `vela-web-observatory` | `apps/observatory` | `problems.science` canonical, `app.vela.space` compatibility alias, `app.constellate.science` redirect |

There is no active legacy Vela Vercel project. `prospect` and `snowchild` are
unrelated and outside this workspace.

The Observatory's Vercel Functions run in `cle1` (AWS `us-east-2`), alongside
the qualified Neon projection. Static assets remain globally served by
Vercel's CDN. Keep `bunVersion: "1.x"`: it is the only supported Vercel Bun
runtime selector, while the workspace `packageManager` and lockfile continue to
pin the development and build toolchain.

Vercel's monorepo link belongs at the repository root, never inside either app.
From a fresh checkout, one command discovers both configured projects and their
Root Directories:

```sh
vercel link --repo --yes --scope constellate-dc388081
```

Do not run `vercel deploy` from `apps/observatory`: the remote Root Directory
would be applied a second time. The governed production path is the exact Git
deployment request exposed as `bun run deploy:observatory`; it requires
either a narrowly scoped automation token or an authenticated local Vercel CLI,
derives `VELA_SITE_COMMIT` from the current checkout, and refuses commit or
target drift.

### Pushing deploys

The two active applications deliberately use different release paths:

- `www.vela.space` uses Vercel's Git deployment for relevant `main` changes.
- The unified application has automatic Git deployment disabled. An operator
  runs `bun run refresh:observatory` from clean exact `main`. The command owns
  static qualification, fresh source acquisition, rooted activity migration,
  projection activation, local snapshot staging, post-activation qualification,
  provider-loss reconstruction, exact commit publication, Vercel deployment,
  public readiness and durable qualification. Each child receives only its
  required credential class. One deployment serves both product domains.

This ordering is mandatory. It prevents current application code from racing a
predecessor read model. GitHub Actions is optional static automation and does
not participate in production. Only `apps/www/vercel.json` carries an
`ignoreCommand`, so `scripts/vercel-should-build.mjs` filters the editorial
build alone; every explicit exact-SHA deployment request builds. A branch-head hook is
not used: it could resolve a newer `main` commit than the tree the workflow
qualified.

Vela Web's `package.json` contains the only product version. Neither database
has a parallel numbered release train. The projection's current-only manifest is
`vela.observatory-release-manifest`, and forward SQL migrations are recorded by
identifier and exact content root in `observatory.schema_migrations`. Activity
migrations are independently rooted in `activity.schema_migrations`.
Application code does not carry readers for predecessor shapes.

`AGENTS.md` release safety still applies to attaching domains and tagging final
releases.

Public manifests:

- `https://www.vela.space/.well-known/vela-web.json`
- `https://problems.science/.well-known/vela-site.json`

The manifests use `vela.web-deployment.v3` and `vela.site-deployment.v4`; each
records the exact Git commit, brand schema/root, deployment
identity, and delivery mode. The editorial manifest is immutable deployment
output. The Observatory manifest is a non-cached read-only route: it combines
that deployment's immutable identity with the current Neon projection on every
request, so a data-only projection activation cannot leave a copied public JSON
file behind. Ordinary Observatory pages remain bound to the exact retained root
selected at build time. The Observatory manifest additionally embeds the
current-only `vela.observatory-release-manifest`, including
normalized Claim, Submission, Proposal, Verification, non-authoritative Result
Dossier, review, work, search, graph, authority, and source-root identities. Repository authority is
read-only product evidence: the projection may expose public keys, signed
record roots, and restricted-policy identity, but never custody material,
authentication context, a decision control, or an authority operation. A
production release is incomplete until its deployed manifest matches the
approved commit and activated projection exactly.

None of that identity is set by hand. The root `package.json` is the only place
a version lives; commit and deployment id come from `VERCEL_GIT_COMMIT_SHA` and `VERCEL_DEPLOYMENT_ID`,
which `deploymentIdentity()` reads directly and which production manifest
generation refuses to go without. Git tags remain useful release pointers, but deployment
truth is the exact commit rather than a tag inferred from a version string.
`apps/www/scripts/check-deployed-manifest.mjs` and
`apps/observatory/scripts/check-deployed-manifest.mjs` confirm that the deployed
bytes identify the exact repository commit and projection root.

Several legacy domains currently show Vercel's `DNS Change Recommended`
advisory while resolving successfully. Treat DNS migration as a separate
provider-controlled operation; do not combine it with a code release.

## Fly retirement

Vela Web does not depend on Fly.io. The legacy `vela-hub` and
`vela-hub-witness` applications, their secrets, and the witness volume were
removed on 2026-07-21 after the Neon-backed Vercel deployment passed production
route, manifest, and current-repository checks. The archived witness database and
its SHA-256 manifest remain outside this repository under the Constellate
archive. `prospect-acceptance` is unrelated and must not be modified from this
repo.

## Release

A release is a commit, not a ceremony. Nothing here is a precondition for
shipping one; the preconditions are the gates.

1. Verify the change on a branch: the full local gate, the changed routes,
   redirects, semantics, roots, accessibility, responsive states, and cache
   isolation. A release-candidate build is available on a `v*-rc.*` tag when a
   change is worth exercising in CI before it lands.
2. Merge to clean `main`. `vercel-should-build.mjs` scopes the editorial Git
   integration; `bun run refresh:observatory` explicitly refreshes and deploys
   the Vela application. A shared brand or data-contract change may deploy both;
   editorial-only work does not redeploy the Vela application.
3. Verify the production manifests and canonical domains against the exact
   merged commit and the activated projection root. The untouched application
   must retain its prior deployment identity and behavior.
4. Cut a tag afterwards when the release means something. It is a pointer to
   the commit, not the thing that shipped it.
5. Remove generated dependencies and build output after the release audit.

Never publish a release if a manifest lacks the exact commit, any root drifts,
verifier success is presented as acceptance, a canonical route is missing, or
browser-delivered bytes expose custody, private coordination, or authority
operations.
