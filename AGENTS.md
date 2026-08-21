# Vela Web — agent instructions

## Product boundary

This private Bun workspace contains two deliberately separate Next.js
applications, one retained editorial source library, and four shared packages:

- `apps/problems`: the unified Vela product application at canonical
  `problems.science`,
  combining exact scientific State, non-authoritative Work, and advanced record
  inspection;
- `apps/www`: the static Vela application at canonical `vela.space`, owning the
  front page, which is its only route;
- `packages/brand`: framework-neutral tokens, fonts, marks, and licenses;
- `packages/ui`: shared React UI source built from shadcn `base-nova` on Base
  UI, plus stable Vela presentation semantics;
- `packages/projection-data`: the only repository parser, source registry,
  search, graph, scientific projection, and deployment-manifest implementation;
- `packages/activity-data`: the only mutable product-data implementation.

Hosted Vela is non-authoritative. The Problems application may mutate account,
shared-workspace, follow, approach, attempt, discussion, assignment,
artifact-metadata, provider-neutral session-reference, and unsigned
Submission-draft records through
`@vela/activity-data`. It cannot issue a Vela Event or Decision, change
Standing, sign on a user's behalf, or hold a repository authority key.

The scientific-state plane remains an exact SELECT-only projection. Canonical scientific
custody and authority remain in Vela Repository Git repositories. Hosted
accounts remain separate from Vela actor identities.

## Sources of truth

- Retained paintings: `apps/www/src/assets/paintings`, with their custody record
  beside them; Problems keeps its own copy of the one plate it reuses
- Vela editorial routes and shell: `apps/www/src/app`
- Vela product routes and compositions: `apps/problems/src/app`,
  `apps/problems/src/components`
- Brand contract: `packages/brand/vela.tokens.json` and its generated outputs
- Shared React primitives and semantics: `packages/ui`
- Repository and math-source projections: `packages/projection-data`
- Mutable hosted activity: `packages/activity-data`
- Product and design contracts: `PRODUCT.md`, `DESIGN.md`,
  `docs/design-system.md`, and `docs/WEB.md`

Historical plans and audits preserve the paths and decisions that were current
when their authors wrote them. Do not rewrite them to match the current system.

## Design-system workflow

- Install or update generic primitives only from
  `packages/ui/components.json`.
- Prefer an existing `@vela/ui` primitive. App-local code owns route
  composition, data controllers, the Sigma instrument, and authored editorial
  figures.
- Do not create a second primitive layer, app-local `components/ui`, copied
  token palette, or parallel icon library.
- Licensed Tailwind Plus source may be adapted inside this private repository.
  Record the source and license, normalize interaction through shadcn/Base UI,
  and keep one-off compositions app-local. Move a composition into `@vela/ui`
  only after two maintained consumers use a stable version.
- Keep global styles to Tailwind imports, token/profile bridges, base
  typography, accessibility, print, and cross-route requirements. Route
  presentation belongs with the route or component.
- The standing visual direction is **Modern research workspace / Play it
  straight**. Entire is the primary reference for dominant objects,
  attributed activity, selected checkpoints, readable tool output, and
  progressive technical detail. GitHub and Hugging Face are secondary
  references for files, diffs, checks, history, tabs, breadcrumbs, and
  collection discovery. Borrow task conventions, not brand skins or
  ontologies.
- Use two deliberate applications and registers. Dense Problems routes use a neutral application
  canvas, deep marine navigation, cobalt interaction, and semantic colors for
  real state. Earned editorial and identity moments may reuse the canonical
  sail, first-party watercolor, horizon, constellation, borrowed-light, and
  long-handoff language on `apps/www`. Constellations must encode exact relationships;
  nautical motifs must clarify orientation or handoff. Never turn product
  controls into themed props or use literal galaxy wallpaper, glass, neon,
  route hero slabs, card soup, or decorative charts.
- A Problem is an active scientific surface. Use maps for relationships, file
  trees and previews for source material, typed rows for Contributions,
  timelines and diffs for change, and canvases for shared work. Do not satisfy
  a route with a succession of question headings, prose sections, disclaimer
  paragraphs, or numbered explanations.
- Problem navigation is five sections — Overview, Work, Results, Sources,
  History — scoped in the sidebar under the open Problem, each at its own path
  segment (`/problems/<namespace>/<problem>/<section>`). It was a flat tab row
  above the content; the sidebar holds the object the reader is in, so the
  section list belongs with it rather than repeating the object's identity a
  second time above the page. The breadcrumb switches Problems; the rail
  switches sections. Overview is a substantive question-first reference screen,
  not a navigation summary. Work owns mutable coordination; Results owns
  durable outputs; Sources owns files, declarations, and excerpts; History
  owns semantic chronology. The exact map is a contextual action, not a sixth
  section. Preserve old `?view=` query values for shared-link compatibility but
  emit only path segments from internal navigation.
- Treat redundancy as a product defect. A fact shown in a state rail, node,
  badge, row, edge, or control is not restated beside it unless the second
  presentation changes interpretation or is the accessible fallback.
- Use shadcn.io MCP metadata and previews while shaping substantial
  interactions. Fetch source only for patterns actually chosen, then adapt
  behavior into existing `@vela/ui` and app-local compositions. GitHub, Entire,
  Hugging Face, TheoremDB, Linear, Ramp, and Tailwind Plus are task-pattern
  references, not brand or ontology templates.

## Editing workflow

- Use Bun only. Do not add npm, pnpm, Yarn, Turborepo, or app-local lockfiles.
- Keep `apps/www` static and read-only. It may import current committed release
  facts and shared brand/UI source; it must not read request state, connect to
  the projection or activity databases, host identity, or interpret protocol
  records.
- Preserve exact-state semantics and the distinction between Verification and
  acceptance.
- Preserve the canonical Vela sail unless an approved brand pass replaces it.
- Work mutations must cross `@vela/activity-data`. Do not connect an
  application to Postgres, add another activity store, or let
  `@vela/projection-data` depend on mutable activity.
- Reuse `@vela/projection-data` exact reads and canonical contracts. Do not add
  a second repository parser, index, source registry, graph builder, or manifest
  generator.
- Publish a Problem collection only through one exact, provider-loss-safe
  collection adapter with stable collection-qualified occurrence identity,
  per-item rights and source attribution, immutable roots, and
  `authority_effect:none`. Formal Conjectures declarations remain source-owned
  occurrences unless an exact upstream scientific Problem mapping exists;
  GitHub review and CI remain advisory source workflow, not Vela state.
- Store large artifact bytes outside Postgres. Activity records may retain
  roots, byte counts, metadata, and locators.
- Bind activity to exact Repository, Problem, Claim, and projection anchors.
  Surface staleness when canonical roots advance.
- Keep external session references on Attempts provider-neutral. Do not add Modal-, Buzz-, or
  vendor-specific runtime code without a separate product decision.
- Export only unsigned `vela.submission.v3` payloads that validate against the
  pinned public schema. Signing uses an explicit local handoff and a user-held
  key. Hosted code may not call the local signing helper.
- Do not add a server-held signer, repository authority key, hosted Decision,
  direct Standing write, or second scientific database.
- For Next.js work, read the relevant guide in `node_modules/next/dist/docs/`
  before relying on remembered framework behavior.
- Preserve unrelated dirty work. Use `git diff` to separate your changes.

## Verification

Run focused checks while editing, then the relevant root checks before handoff:

```bash
bun install --frozen-lockfile
bun run check:brand
bun run check:design-system
bun run check:boundary
bun run check:activity
bun run lint
bun run typecheck
bun run test
bun run build
bun run test:roots
bun run test:manifests
git diff --check
```

`check:public-output` runs only inside `bun run build`, so a skipped build
skips the secret scan.

The projection integration suites under `packages/projection-data/integration/`
self-skip without `VELA_PROJECTION_DATABASE_URL`, and a skipped suite reads as
a green gate. Their database-free assertions live in
`packages/projection-data/tests/` and run everywhere; the live-catalogue half
still needs the database. Before merging a change that touches the projection
write path — `schema.sql`, `migrations/`, `scripts/projection-store.mjs`, or
`scripts/projection-builder.mjs` — run the strict form with the SELECT-only
reader URL so a skip is an error rather than a pass:

```bash
VELA_REQUIRE_PROJECTION_TESTS=1 \
VELA_PROJECTION_DATABASE_URL=<reader url> \
  bun run --filter @vela/projection-data test
```

A brand-new table fails its live-catalogue lookup until its migration reaches
the database; that one named failure is the expected reading for a
table-adding change, and anything else must pass. The v0.440.0 release halted
mid-transaction on exactly the assertion this step now surfaces before merge.

Two of these are ordering rules, both learned by breaking them:

- **`rm -rf apps/problems/.next` before any production build that follows an
  edit under `packages/`.** `next build` reuses a stale compile of workspace
  packages, so the app serves the old code while the source says otherwise.
  This produced two false readings in one session — once showing a regression
  that did not exist, once showing a fix as absent.
- **Run `bun run --filter @vela/problems check:runtime` before deploying, not
  after.** It boots the built app and fetches real reader URLs. A change to a
  shared projection reader can leave the page you verified working while every
  page fed by the other reader raises; that shipped once and served 500 on
  every Problem detail page for a deployment. The full route sweep costs
  seconds and is the difference between "the page I changed works" and "the
  app works".

Database changes also require the activity migration, role, cross-tenant,
idempotency, version-conflict, append-only audit, and plane-independence tests.
Use the fixed Neon `main` branch and the separate `vela_activity` database. Do
not create a Neon branch for routine work.

Use the in-app Browser for responsive, keyboard, interaction, and visual QA,
against a local production build (`next start`) rather than `dev`. Drive it
through the harness's own browser tools; no separate automation stack is
installed, and none should be added.

Synthetic key events dispatched through those tools may not move focus, so
verify keyboard behaviour through `focus()`, computed styles and event-
cancellation probes rather than concluding from a keystroke that did nothing.

## Release safety

- RC deployments use noncanonical Vercel domains.
- Do not attach `problems.science`, change
  DNS, merge, or tag a final release without user authorization.
- Keep prior production deployments available for the rollback window.
- Deploy through `bun run deploy:problems`. Without `VERCEL_TOKEN` it falls
  back to the authenticated Vercel CLI and needs `VERCEL_GLOBAL_CONFIG` set to
  the CLI config directory — a path, not a secret. Do not deploy with
  `vercel --prod`: the script pins the project and team, asserts the
  deployment is production, and binds `VELA_SITE_COMMIT` to an exact SHA,
  which is what the deployment manifest reports.
- **Verify the `vela` binary by digest, not by name.** More than one build can
  report the same version while only one is an accepted generator:
  `config/vela-release.v1.json` declares the accepted digests and
  `integration/projection.test.ts` asserts a projection's
  `vela_binary_sha256` is one of them. A locally rebuilt binary of the right
  version is not automatically an accepted generator.
- **Never `git checkout --` a file that also holds uncommitted work.**
  Reverting a scratch edit that way discarded a real fix in the same file and
  shipped a typecheck error.

## Working with the projection locally

`apps/problems/.env.local` is required for any projection-backed page; without
it the app renders nothing real. Read the projection read-only from
`packages/projection-data`:

```bash
set -a && . ../../apps/problems/.env.local && set +a && bun -e '...'
```

using `neon()` from `@neondatabase/serverless`, and `sql.query(text, params)`
for parameterised SQL — the bare tagged template rejects that call shape.
