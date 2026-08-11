# Vela Web — agent instructions

## Product boundary

This private Bun workspace contains three independently deployable Next.js
applications and four shared packages:

- `apps/www`: static editorial site for `www.vela.space`;
- `apps/observatory`: exact, read-only scientific Observatory for
  `app.vela.space`;
- `apps/problems`: authenticated, writable research activity workbench for
  `problems.science`;
- `packages/brand`: framework-neutral tokens, fonts, marks, and licenses;
- `packages/ui`: shared React UI source built from shadcn `base-nova` on Base
  UI, plus stable Vela presentation semantics;
- `packages/observatory-data`: the only repository parser, source registry,
  search, graph, scientific projection, and deployment-manifest implementation;
- `packages/activity-data`: the only mutable product-data implementation.

Hosted Vela is non-authoritative. The Problems workbench may mutate account,
workspace, follow, approach, attempt, discussion, assignment, artifact-metadata,
provider-neutral session-reference, and unsigned Submission-draft records through
`@vela/activity-data`. It cannot issue a Vela Event or Decision, change
Standing, sign on a user's behalf, or hold a repository authority key.

The Observatory remains an exact SELECT-only projection. Canonical scientific
custody and authority remain in Vela Repository Git repositories. Hosted
accounts remain separate from Vela actor identities.

## Sources of truth

- Editorial routes: `apps/www/src/app`
- Editorial compositions and content: `apps/www/src/components`,
  `apps/www/src/content`, `apps/www/src/styles`
- Observatory routes and product compositions: `apps/observatory/src/app`,
  `apps/observatory/src/components`
- Problems routes and workbench compositions: `apps/problems/src/app`,
  `apps/problems/src/components`
- Brand contract: `packages/brand/vela.tokens.json` and its generated outputs
- Shared React primitives and semantics: `packages/ui`
- Repository and math-source projections: `packages/observatory-data`
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
  after two applications use a stable version.
- Keep global styles to Tailwind imports, token/profile bridges, base
  typography, accessibility, print, and cross-route requirements. Route
  presentation belongs with the route or component.
- Vela's visual thesis is **direction through evidence**. Sails express
  movement from state to direction; constellation lines express real
  relationships. Decorative star fields do not substitute for information.

## Editing workflow

- Use Bun only. Do not add npm, pnpm, Yarn, Turborepo, or app-local lockfiles.
- Preserve exact-state semantics and the distinction between Verification and
  acceptance.
- Preserve the canonical Vela sail unless an approved brand pass replaces it.
- Problems mutations must cross `@vela/activity-data`. Do not connect an
  application to Postgres, add another activity store, or let
  `@vela/observatory-data` depend on mutable activity.
- Reuse `@vela/observatory-data` exact reads and canonical contracts. Do not add
  a second repository parser, index, source registry, graph builder, or manifest
  generator.
- Store large artifact bytes outside Postgres. Activity records may retain
  roots, byte counts, metadata, and locators.
- Bind activity to exact Repository, Problem, Claim, and projection anchors.
  Surface staleness when canonical roots advance.
- Keep external session references on Attempts provider-neutral. Do not add Modal-, Buzz-, or
  vendor-specific runtime code without a separate product decision.
- Export only unsigned `vela.submission.v2` payloads that validate against the
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

Database changes also require the activity migration, role, cross-tenant,
idempotency, version-conflict, append-only audit, and plane-independence tests.
Use the fixed Neon `main` branch and the separate `vela_activity` database. Do
not create a Neon branch for routine work.

Use the Codex in-app Browser for responsive, keyboard, interaction, and visual
QA. Browser automation is not part of the installed toolchain.

## Release safety

- RC deployments use noncanonical Vercel projects and domains.
- Do not attach `www.vela.space`, `app.vela.space`, or `problems.science`, change
  DNS, merge, or tag a final release without user authorization.
- Keep prior production deployments available for the rollback window.
