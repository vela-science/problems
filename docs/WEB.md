# Vela Web operations

This is the current operations contract for the Problems workspace.
Earlier design and migration plans live under `docs/history/`.

## Product boundary

- `problems.science` is the canonical Vela Problems product. Problems is the
  application's conceptual center, while Home orients
  readers across current
  change, direct contribution, communities, and the exact scientific record. Advanced
  records remain available in the same runtime.
- `vela.space` is the separate static origin compiled by `apps/www` from its
  own `src`. It publishes one page. The *Endless Frontiers* essay was published
  there at `/constellations` and was removed on 2026-08-21.
- Hosted Vela is non-authoritative. The Problems reads a bounded SELECT-only
  projection from Neon. Work mode writes hosted research activity through
  `@vela/activity-data`. Canonical custody remains in Repository Git
  repositories.
- Normative protocol and CLI documentation remains in the public Vela
  repository. Problems links directly to that maintained source.

`bun run check:boundary` limits Problems Route Handlers to declared exact-root reads,
identity, and draft export, and requires Work mutations to call
`@vela/activity-data`. ESLint blocks
direct database clients, hosted signing machinery, and WorkOS imports outside
the named identity files. The package-direction check keeps
`@vela/projection-data` independent of mutable activity and limits
`@vela/activity-data` reuse to exact canonical and read contracts.

The repository is a Bun workspace with six maintained runtime boundaries and
one non-runnable content area:

```text
apps/problems        Vela Problems product: Problem State, Work, and Records
apps/www             static Vela front page, one route
packages/brand          governed identity, tokens, fonts, and delivery assets
packages/ui             shared shadcn/Base UI source and Vela presentation semantics
packages/projection-data  Git-to-Neon projection, validation, search, and manifests
packages/activity-data  hosted activity schema, authorization, and mutation API
```

`packages/brand` is framework-neutral. `packages/ui` is private React source
shared by eligible Problems interactions and future Vela applications.
Route composition stays app-local. The internal registry is
product-bound and is never published as a separate UI library; see
[`design-system.md`](design-system.md).

The whole ecosystem follows one path:

```text
Problem -> native work -> submit -> verify -> decide -> remap
```

Native research tools and external harnesses remain replaceable. The Repository
Git repository is canonical. Vela binds exact Submissions and scoped
Verification evidence, but neither changes Standing. Only an authorized, attributed
Decision in that named Repository changes Standing; replay derives the successor
state and current actions. Problems may coordinate candidate work, but hosted state
cannot issue a Vela Event or Decision, change Standing, or sign as a user.

Problems links `/docs` directly to the maintained Vela Core repository. There
is no vendored documentation renderer or synchronized documentation copy in
this workspace.

**The wire schemas, vendored the same way.** `vela.status.v4` is declared twice
— once upstream, generated from the Rust type that emits it, and once here as
the zod schema that parses it off the wire. Nothing held the two together, so
upstream could rename a field and the first thing to notice would be a
projection refresh failing after the release.
`packages/projection-data/scripts/sync-vela-schemas.mjs` vendors upstream's
declaration at the pin, and `tests/status-schema.test.ts` holds the reader to
it: a document missing any field upstream requires must be refused.

```bash
bun packages/projection-data/scripts/sync-vela-schemas.mjs
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
path resolved at render time lands on a transient prerender chunk.

**Chrome.** Structure from Tailwind Plus Protocol — grouped section rail,
content column, on-page contents, previous and next — and nothing else.
Protocol is an API-reference template on zinc and emerald with its own prose
theme and a dark mode; these are upstream markdown files on the editorial
ground, so the shell is rebuilt in this site's vocabulary rather than
reskinned.

## Exact repository state

`packages/projection-data/src/registry.ts` is the typed registry for the canonical
Git repositories. One today: `vela-science/math`, the single live mathematics
authority. Four existed under the previous epoch and existed because there were
four topics rather than four authorities. Math is public. Its registry entry
has one canonical GitHub locator and explicit `public` access; the retired
replica is neither a declared locator nor a scheduled mirror target. Every
release derives its roster from this registry, clones each declared branch at
full depth, and verifies exact remote-head parity. Public Repository reads use
that anonymous canonical locator. Discovery-source acquisition is separately
owned by the read product: `source-acquisition.v1.json` pins every exact remote
input and the two retained, content-rooted snapshots. Math owns scientific
Standing and carries no duplicate source lock. No repository-scoped read
credential is required or embedded.

The direct release command checks out each clean declared Repository branch,
verifies it with the pinned Vela release,
and writes a content-addressed normalized read model to the `vela_projection`
database in the `vela-problems-projection` Neon project:

```bash
bun run release:problems
```

Refresh refuses dirty or unpushed sources, wrong branches or remotes, Vela
version or released-binary-byte drift, packet drift, missing decision evidence,
incomplete reviews, root disagreement, and every ambient corpus-drop override.
It acquires each discovery source once from the checked projection acquisition
config, verifies the configured roots, builds
one candidate, inserts it in one transaction, verifies every stored table root,
and only then moves `current_release`. Failure before or during that atomic
activation leaves the prior release current. A later failure retains the private
operator directory and the exact two-sided projection/provider rollback inputs;
`rollback-checkpoint.json` is written before activation and refreshed after
activation, site publication, and deployment, so recovery does not depend on
process memory or a final success record. The release does not pretend a
cross-provider operation was atomic. When an Activity migration retires a
writer shape, the transaction first deploys and verifies the current reader and
writer against the still-current projection. That compatible deployment becomes
the rollback floor before the migration runs, so an older application is never
restored onto a database whose write contract it cannot satisfy. Writer credentials
enter only migration, activation, and final pruning. The Vercel
application connects as the native PostgreSQL login
`vela_projection_reader_20260813`. That versioned login inherits only
the stable no-login `vela_projection_reader` permission role; it does
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
`packages/projection-data/config`: `problem-discovery.v1.json` owns explicit
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
written on both branches, and it is the instant the Problems footer shows.
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
  bun run --filter @vela/projection-data releases:select -- \
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

There is no checked-in repository snapshot for the Problems, no copied search
index, and no Build Week JSON. The Problems reads release-scoped rows from
Neon during rendering.
Each build compiles one exact release root, while `/api/search` and `/api/graph`
accept only retained exact roots. This prevents an old deployment from silently
rendering a newer data head. The database is disposable: exact Git commits,
trees, event roots, graph roots, and row roots identify the projection, and it
can be rebuilt from canonical repositories.

Neon is neither canonical nor writable by the public application. It is a
disposable read model. The `@vela/projection-data` projector is its only writer, and the
Problems receives a SELECT-only role scoped to the normalized projection.

The credential contract is intentionally closed: application reads and checks
use only `VELA_PROJECTION_DATABASE_URL`; explicit schema migration, projection
refresh, and pruning use only `VELA_PROJECTION_WRITER_DATABASE_URL`. Generic
`DATABASE_URL` fallback and reader-as-writer fallback are unsupported. The Neon
project has one branch, `main`. Release-scoped rows and `current_release`
provide exact data identity and rollback without mapping application releases
onto database branches.

Those two URLs are the complete secret inventory for Problems projection
access. Activity uses two separately scoped URLs described below. The stable
`vela_projection_reader` permission role and versioned
`vela_projection_reader_20260813` login are managed directly in Neon and
are not recreated during CI or projection refreshes. Clean-room reconstruction
creates the same no-login group, versioned login, membership, and inherited
read boundary inside its disposable local cluster.

`packages/projection-data/schema.sql` is the current desired-state schema.
Forward changes live in `packages/projection-data/migrations`; each applied file
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
as a second projection layer. Producer work starts in the native source and
enters through the exact direct-Submission action in replayed Repository status;
graph position remains non-authoritative. Historical Target records stay in
their source evidence and are not projected as a live queue.

Clean-room reconstruction is disposable, creates no Neon branch, and is a
required stage of the direct release. The same command runs independently:

```bash
bun run projection:reconstruct \
  --repositories-root /path/to/repository-checkouts \
  --vela /path/to/the-recorded-vela-binary \
  --source-adapter-artifact /path/to/the-recorded-adapter-artifact \
  --output /tmp/vela-atlas-clean-room.json
```

Current releases project canonical Claim, Verification, Decision, Event, and
Standing records directly. Retired derived projections are absent from the
runtime and cannot override a later correction or supersession.

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

The retired builder targeted the predecessor `projection.v3` read model and
is intentionally absent from current `main`. Replaying the historical
experiment means checking out its recorded tag and exact Repository commits, not
adding a compatibility adapter to the current normalized read model.
Promotion remains gated on the frozen cross-Repository reader tasks and two
independently maintained consumers.

## Hosted activity data

`@vela/activity-data` is the sole mutable data owner for Problems. It uses a
separate `vela_activity` database on the existing Neon project's `main` branch.
No preview or child database branches are part of the workflow. The two hosted
planes remain distinct: Problems projection roles cannot connect to
`vela_activity`, and activity roles cannot connect to `vela_projection`.

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

### Pilot telemetry

`POST /api/telemetry` is the one consented, content-free product-telemetry
ingestion route. Its wire contract is `vela.pilot-telemetry.v1`, declared in
`@vela/activity-data` (`src/pilot-telemetry.ts`): a signal name from a closed
nine-value vocabulary (`installer_succeeded`, `problem_opened`,
`handoff_opened`, `continuation_started`, `submission_completed`,
`submission_failed`, `check_completed`, `check_failed`, `readback_completed`),
an ISO timestamp, a random 32-hex install identifier generated by Workbench at
opt-in, a random per-record identifier for exact replay dedupe, and an
optional elapsed stage duration in milliseconds. Validation is strict on both
sides: the Zod contract and `activity_api.record_pilot_telemetry` refuse any
unexpected field, out-of-vocabulary signal, stale timestamp, or out-of-bounds
duration, and refusals name the failing path without echoing the received
value.

The store is `activity.pilot_telemetry`, which references no other activity
table and carries no account, workspace, Problem, repository, file,
instruction text, credential, or signature. Workbench sends these records only
after the user's explicit opt-in and stops when the user opts out; the hosted
route cannot verify consent, which is why the schema is closed rather than
trusted. There is no third-party analytics SDK, and this route must never grow
content-bearing fields.

Two admission bounds sit in front of the insert. The per-install budget of
5,000 records bounds an honest client only: `install_id` is minted by the
client, so an attacker rotates it and lands in a fresh bucket every time. The
global ceiling — 50,000 rows received in the trailing hour — is the bound that
holds, and it exists because this database shares Neon compute with the
SELECT-only projection reader behind every public Problem page, making
unbounded ingestion an availability risk rather than only a cost one. Neither
replaces an operator rate rule at the edge.

**Retention is traffic-driven, not automatic.** The 90-day delete runs inside
the write path, so it only advances while records keep arriving. When the pilot
ends and ingestion stops, the last window of rows persists indefinitely and the
90-day claim on `/privacy` silently stops being true. Ending the pilot
therefore includes an explicit operator step, run with the migrator credential:

```sql
DROP TABLE activity.pilot_telemetry;
DROP FUNCTION activity_api.record_pilot_telemetry(text, text, text, timestamptz, bigint);
```

Note also that retention runs on `received_at` while the accepted `occurred_at`
window reaches 30 days back, so an event can remain visible up to roughly 120
days after it happened. Quote the retention promise against the event, not
against the row.

One honesty note about "content-free": the two identifiers are 256 bits per row
of opaque client-chosen hex. The closed schema enforces content-freedom against
accident and against an ordinary client, not against a hostile one, which could
encode arbitrary data in identifiers that are indistinguishable from random.
That is accepted for a consented pilot and is another reason the table is
dropped at its end rather than retained.

`pilot_telemetry` is additive but **forward-only**, because `schema.mjs` checks
an exact table inventory rather than a minimum one. Once the migration has run,
rolling application code back to a commit that predates this table fails
`activity:db:check` on the extra table. Carry the release note into any
rollback plan: revert the code and the inventory together, or drop the table
first.

An exported draft must validate against the public `vela.submission.v3` schema
vendored from the exact Vela release pin. The hosted service exports canonical,
unsigned bytes with their payload root. The exported product contract contains
no private workspace command. A compatible local tool must bind a user-held
identity, sign, and submit inside the source Repository. The package's local
signing script exists only for conformance and development checks; applications
are barred from importing its subpath or presenting it as a public workflow.
Hosted accounts do not become Vela actors. The
activity schema and API cannot emit a Vela Event, Decision, Verification, or
Standing, cannot access an authority key, and cannot write the Problems.
Deleting `vela_activity` leaves Repository Standing intact; rebuilding
`vela_projection` leaves hosted activity intact.

## Brand and assets

`packages/brand/marks/source/vela-symbol-full.svg` is the exact original Vela
sail released in `v0.300.2`. Do not redraw or reinterpret it. All delivery
variants are generated and content-addressed.

- Editorial delivery retains Zodiak, Gambetta, Switzer, and IBM Plex Mono.
  WWW currently selects the governed system Iowan Old Style/Baskerville stack
  for display and reading; no proprietary desktop font bytes are copied.
- Problems delivery: Geist for interface text and IBM Plex Mono for roots,
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
release facts from the same checked projection used by the Problems. Export
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

This repository deploys one Vercel project:

| Project | Application | Production domains |
| --- | --- | --- |
| `problems` | `apps/problems` | `problems.science` canonical; `www.problems.science` redirects here |

The deployment target is not written down here. `deploy:problems` reads
`VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID`, `VERCEL_PROJECT_NAME`,
`VERCEL_GIT_REPO_ID` and `VELA_DEPLOY_REPOSITORY` from the environment, because
this source is public and a fork running the script would otherwise aim a build
at someone else's project.

`vela-web-problems` served `problems.science` until 2026-08-26 from the private
`vela-web` monorepo. It is retained, deployable and domainless as a rollback
path; it is not part of the current topology. `vela-web-www` still serves
`vela.space` from that repository and is unaffected.

The Problems's Vercel Functions run in `cle1` (AWS `us-east-2`), alongside
the qualified Neon projection. Static assets remain globally served by
Vercel's CDN. Keep `bunVersion: "1.x"`: it is the only supported Vercel Bun
runtime selector, while the workspace `packageManager` and lockfile continue to
pin the development and build toolchain.

Vercel's monorepo link belongs at the repository root, never inside the app.
From a fresh checkout, one command discovers the configured project and its
Root Directory:

```sh
vercel link --project problems --yes --scope "$VERCEL_TEAM_ID"
```

The project's Root Directory is `apps/problems`, and the install and build
commands in `apps/problems/vercel.json` step back up to the workspace root. Do
not run `vercel deploy` from `apps/problems`: the remote Root Directory would be
applied a second time. The governed production path is the exact Git
deployment request exposed as `bun run deploy:problems`; it requires
either a narrowly scoped automation token or an authenticated local Vercel CLI,
derives `VELA_SITE_COMMIT` from the current checkout, and refuses commit or
target drift.

### Pushing deploys

The unified application has automatic Git deployment disabled. An operator
  runs `bun run release:problems` from clean exact `main`. The command owns
  static qualification, fresh source acquisition, a compatibility deployment,
  rooted activity migration, projection activation, local snapshot staging,
  post-activation qualification,
  provider-loss reconstruction, exact commit publication, Vercel deployment,
  public readiness and durable qualification. Each child receives only its
  required credential class.

This ordering is mandatory. It prevents current application code from racing a
predecessor read model. GitHub Actions is optional static automation and does
not participate in production. Every explicit exact-SHA deployment request
builds. A branch-head hook is
not used: it could resolve a newer `main` commit than the tree the workflow
qualified.

Vela Web's `package.json` contains the only product version. Neither database
has a parallel numbered release train. The projection's current-only manifest is
`vela.projection-release-manifest`, and forward SQL migrations are recorded by
identifier and exact content root in `projection.schema_migrations`. Activity
migrations are independently rooted in `activity.schema_migrations`.
Application code does not carry readers for predecessor shapes.

`AGENTS.md` release safety still applies to attaching domains and tagging final
releases.

The public manifest is
`https://problems.science/.well-known/vela-site.json`.

The production manifest uses `vela.site-deployment.v4` and records the exact
Git commit, brand schema/root, deployment identity, and delivery mode. It is a
non-cached read-only route that combines
that deployment's immutable identity with the current Neon projection on every
request, so a data-only projection activation cannot leave a copied public JSON
file behind. Ordinary Problems pages remain bound to the exact retained root
selected at build time. The Problems manifest additionally embeds the
current-only `vela.projection-release-manifest`, including
normalized Claim, Submission, Proposal, Verification, review, search, graph,
authority, and source-root identities. Repository authority is
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
`apps/problems/scripts/check-deployed-manifest.mjs` confirms that the deployed
bytes identify the exact repository commit and projection root.

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
2. Merge to clean `main`. `bun run release:problems` explicitly refreshes and
   deploys the Vela application.
3. Verify the production manifest and canonical domain against the exact
   merged commit and the activated projection root.
4. Cut a tag afterwards when the release means something. It is a pointer to
   the commit, not the thing that shipped it.
5. Remove generated dependencies and build output after the release audit.

Never publish a release if a manifest lacks the exact commit, any root drifts,
verifier success is presented as acceptance, a canonical route is missing, or
browser-delivered bytes expose custody, private coordination, or authority
operations.
