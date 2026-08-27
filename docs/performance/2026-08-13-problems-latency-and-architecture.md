# Problems latency and architecture decision

Date: 2026-08-13

## Decision

Keep the Problems as a Next.js full-stack application. Fix the release-bound read models inside `@vela/projection-data`; do not add an internal HTTP backend or split the frontend from the server.

The slow routes all called the same catalogue assembler. That assembler read 1,217 Problems as five interactive ledger pages. Each page recomputed four complete facet distributions. With the one-Repository release at the time, the cold request issued 56 SQL HTTP queries: one head-manifest read, three reads for Problem Repository discovery, ten for a retired derived-record index, fourteen for the first Repository/page pair, and seven for each of four remaining pages. Production timed out on `/`, `/problems`, `/work`, and `/hubs`. Routes outside the assembler returned in 65–452 ms, which excludes React, WorkOS, and connection pooling as the incident cause.

The repair adds a catalogue read contract, runs its narrow queries in parallel, and caches the assembled value under the immutable projection release root. Problem detail lookup also stops computing unused ledger facets. The route remains exact-root bound and SELECT-only.

## Measurements

All timings include network transit to the configured Neon project.

| Read | Before | After |
| --- | ---: | ---: |
| Local `/problems` TTFB | 11.75 s | about 2.0 s in development |
| Production `/problems` TTFB | 13.60 s; later requests exceeded 20 s | 0.30 s median; 0.45 s p95 |
| Production `/` TTFB | 25.36 s observed; other samples exceeded 20 s | 0.33 s median; 0.46 s p95 |
| Five old 250-row catalogue pages, sequential | 13.15 s | removed |
| New 1,217-row catalogue read, uncached | 0.62–0.86 s | 0.62–0.86 s |
| Problem 321 row lookup | about 4.5 s without facets in an unscoped ledger scan | 0.12–0.18 s with numeric-prefix SQL narrowing, exact in-memory identity filtering, and no facets |
| Production-build `/problems` TTFB, warm release cache | n/a | 0.12–0.14 s |
| Production-build `/work` and `/hubs` TTFB, warm release cache | n/a | 0.09–0.10 s |
| Production-build `/` TTFB | n/a | 2.58 s cold; 0.14–0.31 s warm |
| Production-build Problem 321 TTFB | n/a | 0.54 s cold; 0.10–0.11 s warm |

An exact comparison of all 1,217 old and new records across identity, Claim binding, statement, declared state, formalization, links, tags, OEIS identifiers, contributing Sources, Target count, and local Standing found zero differences.

The production sample is 20 sequential requests per route against Web commit
`e1f1ce0da239c92008ce2572a05ba34286830c0e` and projection release
`sha256:2ac8fb5a79313fc0fdae6f23d4862d26f11f2682222eb1f58ae31513888e190c`.
Vercel deployment `dpl_BfFooaCtgKgNtC4NyVz6j3c3ZpGD` served every dynamic
function from `cle1`, colocated with the Neon project's AWS `us-east-2`
region. `/work` measured 0.20 s median and 0.54 s p95; `/hubs` 0.27 s median
and 0.32 s p95; canonical Problem 321 0.18 s median and 0.43 s p95. The
legacy `/p/math/321` request, including its permanent redirect, measured
0.35 s median and 0.44 s p95. Browser navigation across the same production
routes produced no application console errors.

The replacement discovery miss executes 27 SQL HTTP queries for the same release: one head-manifest read plus 26 exact-root reads in the assembler. The catalogue contract itself accounts for six of those: one readable-release check, one manifest read, and four parallel bounded data reads. A release-cache hit executes only the head-manifest read before Next returns the root-keyed result. This retains release validation while removing 29 queries and, more importantly, five repeated whole-corpus facet aggregations. The query-count contract is deterministic for the present one-Repository release; each additional Problem Repository adds its own bounded Repository and catalogue reads.

## Current request path

```text
Browser navigation
  -> Vercel Next.js Node runtime
     -> WorkOS proxy only on account/auth/draft/Problem-workspace paths
     -> React Server Component page and shared layout
        -> @vela/projection-data (immutable scientific reads)
           -> Neon serverless HTTP SQL -> vela_projection SELECT-only role
        -> @vela/activity-data (signed-in hosted coordination only)
           -> Neon serverless HTTP SQL -> vela_activity stored API
     -> Server Actions for hosted activity mutations
        -> recheck exact scientific anchor
        -> one stored activity command
        -> revalidate the affected Problem path
```

`@neondatabase/serverless` uses stateless HTTP queries here. Constructing `neon(url)` does not open a persistent TCP connection, and a conventional application pool would add no benefit in the Vercel serverless runtime. Parallel independent reads are appropriate; broad fan-out and repeated whole-corpus aggregation are not.

The scientific and activity packages form the right server-only boundary. Server Components call them. Route Handlers serve public machine endpoints and authenticated exports. Sending Server Components through new internal Route Handlers would add serialization, another request boundary, and another failure mode without creating a useful ownership boundary.

## Cache and rendering policy

The app has not enabled Next 16 Cache Components. The repair uses the supported previous-model `unstable_cache` API. Its key includes the immutable projection release root; a new release gets a new entry and cannot reuse a prior catalogue or Problem state. The cache revalidates once per hour as an operational bound, even though rows under a retained release root are immutable.

Migrating the whole app to `cacheComponents: true` and `use cache` is a separate change. It requires auditing every dynamic account, Workspace, search-parameter, and Server Action path and adding the corresponding Suspense boundaries. It is not needed to solve this incident and is not safe to switch on opportunistically.

The app cannot add a root `loading.tsx`: a Suspense boundary above open dynamic parameters commits an HTTP 200 before a later `notFound()`, which corrupts 404 status. The route-contract suite enforces that rule. The release-bound cache fixes repeated navigation without weakening HTTP status semantics.

## Proxy and legacy-route audit

Fast production routes passed through the same deployment while catalogue routes timed out, which excludes the WorkOS proxy as the dominant cause. The patch narrows its matcher to the implemented account, callback, draft export, canonical Problem, legacy Problem, and sign-in shapes. Canonical and legacy Problem paths must remain matched because `?mode=work` reads the optional session and Next matchers cannot branch on query values.

The fixed redirects in `vercel.json` are Vercel edge configuration, not Next server execution. They are cheap compatibility rules. The `/p/:repository/:problem` implementation is also required: reviewed Problems redirect to their canonical namespace path, while unreviewed source-native Problems still use that durable public route. Retired product routes were removed during the Coherence cutover; none was on the timed hot path.

## Vercel and Neon integration

The production application is already connected to Neon through Vercel's
supported manual environment-variable path. It deliberately does not install
the Vercel-managed Neon storage product: that path is intended to provision or
bill a Neon resource through Vercel, while this system already owns and
qualifies its Neon project directly.

The Neon-managed Vercel integration is the appropriate managed option for an
existing Neon project, but its connection selects one database and one role and
injects a generic `DATABASE_URL`. The Problems needs two simultaneous,
non-interchangeable credentials from one Neon project:

- `VELA_PROJECTION_DATABASE_URL` selects `vela_projection` through the
  versioned SELECT-only projection reader;
- `VELA_ACTIVITY_DATABASE_URL` selects `vela_activity` through
  `vela_activity_app`, which can execute only the reviewed hosted activity API.

A single managed connection must not replace those names or roles. It would
erase the database boundary in configuration even if PostgreSQL privileges
continued to reject cross-plane access. Keep the two explicit variables until
Neon's integration can bind multiple database/role pairs to one deployment, or
until Vela implements a small preview-branch provisioner that obtains both
least-privilege URLs for the same isolated Neon branch and writes them as
branch-scoped Vercel Preview variables. Production migrations continue to use
separate migrator/writer credentials outside the Vercel runtime.

Preview deployments must never receive a production activity credential. A
preview is either bound to an isolated Neon branch with both exact runtime
roles, or it omits `VELA_ACTIVITY_DATABASE_URL` and remains read-only. The
projection reader may point to the qualified production projection because it
is SELECT-only and immutable-release bound. This preserves useful public
previews without turning a preview deployment into another production writer.

The current Vercel Preview environment is bound to the persistent Neon branch
`vercel-preview` (`br-jolly-wildflower-ae27h75o`) with the SELECT-only
`vela_projection_reader_20260813` login and `vela_activity_app` login.
Production uses the same versioned projection permission boundary on Neon's
`main` branch. Vercel Git deployments remain disabled, so this branch is the
one explicit shared preview environment rather than a misleading claim of
per-PR branching. If Git previews are enabled later, replace it with automatic
branch-per-preview provisioning for both runtime credentials together.

**2026-08-27 correction.** The live Vercel project now has database variables
only in the Production environment. No Preview-scoped database variable or
Git-preview binding remains. The persistent Neon `vercel-preview` branch is
therefore retained only pending deletion approval, not as current runtime
infrastructure.

## Package and dependency disposition

- Keep `@vela/projection-data` as the only scientific projection reader and `@vela/activity-data` as the only hosted write surface.
- Keep direct server imports from RSC and Server Actions. Do not create an internal REST or GraphQL mirror.
- Keep the Neon serverless driver. Do not add `pg`, an ORM, or a TCP pool for this runtime.
- Split the 3,000-line Problems data index by read domain as a maintainability follow-up, while preserving its public exports. File size was not a runtime cause.
- Consider a single activity `load_workbench` stored API only if signed-in telemetry shows the current three sequential account/workspace/activity HTTP queries dominate Workspace latency. Do not merge it with the scientific database.
- Consider a separate backend only when a non-Next consumer needs the same service, a read exceeds serverless duration even after a bounded read model, or long-lived streaming/background execution becomes a product requirement.

## Performance gates

For a production build against the qualified projection after one warm-up request:

- `/problems`, `/work`, and `/hubs`: p95 server TTFB below 750 ms;
- canonical Problem State: p95 server TTFB below 1,000 ms;
- no public page may issue an unbounded catalogue read;
- a catalogue assembly may execute one bounded native-row read plus bounded Source, Claim, and Target reads, but no facet query;
- every immutable cache key must include the projection release root;
- legacy redirects and proxy matcher coverage remain contract-tested.

The release operator should record Vercel measurements after deployment. Local development disables Next's persistent Data Cache and cannot measure cache performance.

## References

- [Next.js Backend for Frontend guide](https://nextjs.org/docs/app/guides/backend-for-frontend): Server Components should read the source directly; calling an internal Route Handler adds an HTTP round trip and slows on-demand rendering.
- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components): Server Components own database and API reads close to the source.
- [Next.js `unstable_cache`](https://nextjs.org/docs/app/api-reference/functions/unstable_cache): the current cache API persists expensive query results across requests and deployments. Next 16 replaces it with `use cache` after the app opts into Cache Components.
- [Next.js Cache Components migration](https://nextjs.org/docs/app/guides/migrating-to-cache-components): enabling Cache Components changes route-segment caching and requires explicit handling of runtime data.
- [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver): HTTP is the faster path for one-shot, non-interactive transactions in serverless runtimes; WebSockets serve interactive transactions.
- [Neon Vercel integration decision guide](https://neon.com/docs/guides/vercel-overview): existing Neon projects should use the Neon-managed connection when the integration fits their database and role model; manual connection remains supported for custom control.
- [Neon-managed Vercel integration](https://neon.com/docs/guides/neon-managed-vercel-integration): the integration selects a project, database, and role, injects deployment variables, and creates isolated preview branches.
- [Vercel environment variables](https://vercel.com/docs/environment-variables): production, preview, development, and branch-specific values are separately scoped and only affect new deployments.

## Repeatable timing command

Build and start the Problems, warm each release-bound path once, then record at least 20 samples with:

```sh
/usr/bin/curl -L -sS -o /dev/null --max-time 20 \
  -w '%{http_code}\t%{time_starttransfer}\t%{time_total}\n' \
  http://127.0.0.1:4323/problems
```

Use the same command against `https://problems.science` after deployment. Record the exact Web commit and projection release root beside the sample set.
