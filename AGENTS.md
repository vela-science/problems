# Vela Web — agent instructions

## Product boundary

This private Bun workspace contains two independently deployed Next.js
applications:

- `apps/www`: static editorial site for `www.vela.space`;
- `apps/observatory`: read-only scientific workbench for `app.vela.space`;
- `packages/brand`: framework-neutral tokens, fonts, marks, and licenses;
- `packages/ui`: shared React UI source built from shadcn `base-nova` on
  Base UI, plus stable Vela presentation semantics;
- `packages/frontier-data`: the only frontier, source-registry, search, graph,
  and deployment-manifest implementation.

Neither application signs, accepts, verifies, or mutates scientific state.
Canonical custody and authority remain in Vela and the frontier Git
repositories. Neon is a disposable read projection.

## Sources of truth

- Editorial routes: `apps/www/src/app`
- Editorial compositions and content: `apps/www/src/components`,
  `apps/www/src/content`, `apps/www/src/styles`
- Observatory routes and product compositions: `apps/observatory/src/app`,
  `apps/observatory/src/components`
- Brand contract: `packages/brand/vela.tokens.json` and its generated outputs
- Shared React primitives and semantics: `packages/ui`
- Frontier and math-source projections: `packages/frontier-data`
- Product and design contracts: `PRODUCT.md`, `DESIGN.md`,
  `docs/design-system.md`, and `docs/WEB.md`

Historical plans and audits preserve the paths and decisions that were current
when they were written. Do not mechanically rewrite them.

## Design-system workflow

- Install or update generic primitives only from
  `packages/ui/components.json`.
- Prefer the shared `@vela/ui` primitive before adding a generic component to
  an application. App-local code owns route composition, data controllers,
  the Sigma instrument, and authored editorial figures.
- Do not create a second primitive layer, app-local `components/ui`, copied
  token palette, or parallel icon library.
- Licensed Tailwind Plus source may be adapted inside this private repository.
  Record the source and license, normalize interaction through shadcn/Base UI,
  and keep one-off compositions app-local. Move a composition into `@vela/ui`
  only after it is stable and reused.
- Keep global styles to Tailwind imports, token/profile bridges, base
  typography, accessibility, print, and true cross-route requirements.
  Route presentation belongs with the route or component.
- Vela's visual thesis is **direction through evidence**. Sails express
  movement from state to direction; constellation lines express real
  relationships. Decorative star fields or generic space styling are not a
  substitute for information.

## Editing workflow

- Use Bun only. Do not add npm, pnpm, Yarn, Turborepo, or app-local lockfiles.
- Preserve exact-state semantics and the distinction between verification and
  acceptance.
- Preserve the canonical Vela sail unless an approved brand pass replaces it.
- Human accounts may personalize the Observatory, but must remain separate
  from Vela actor identity and repository authority. Do not add a signer,
  scientific-state mutation UI, writable frontier API, or a second frontier
  parser, index, or manifest generator.
- For Next.js work, read the relevant guide in `node_modules/next/dist/docs/`
  before relying on remembered framework behavior.
- Preserve unrelated dirty work. Use `git diff` to separate your changes.

## Verification

Run focused checks while editing, then the relevant root checks before
handoff:

```bash
bun install --frozen-lockfile
bun run check:brand
bun run check:design-system
bun run lint
bun run typecheck
bun run test
bun run build
bun run test:roots
bun run test:manifests
git diff --check
```

Use the Codex in-app Browser for responsive, keyboard, interaction, and visual
QA. Browser automation is not part of the installed toolchain.

## Release safety

- RC deployments use noncanonical Vercel projects and domains.
- Do not attach `www.vela.space` or `app.vela.space`, change DNS, or tag a
  final release before exact-root, responsive, accessibility, visual, and
  deployed-manifest gates pass.
- Keep the prior production deployments available for the rollback window.
