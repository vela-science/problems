# Vela Web — agent instructions

## Product boundary

This repository is one Bun workspace with two static public applications:

- `apps/www`: Astro editorial site for `www.vela.space`;
- `apps/observatory`: Next.js read-only product for `app.vela.space`;
- `packages/brand`: the only token, font, and mark source;
- `packages/frontier-data`: the only frontier bundle, search, and deployment-manifest implementation.

The applications share brand assets and generated facts, never framework UI.
Neither application signs, accepts, or mutates scientific state.

## Source of truth

- Editorial routes and content: `apps/www/src/pages`, `apps/www/src/content`
- Editorial components and styles: `apps/www/src/components`, `apps/www/src/styles`
- Observatory routes: `apps/observatory/src/app`
- Observatory components: `apps/observatory/src/components`
- Brand contract: `packages/brand/vela.tokens.json` and generated outputs
- Frontier projection: `packages/frontier-data`
- Product and design contracts: `PRODUCT.md`, `DESIGN.md`, and `docs/WEB.md`

Historical plans and audits preserve the paths that were current when they were
written. Do not mechanically rewrite them.

## Editing workflow

- Use Bun only. Do not add npm, pnpm, Yarn, Turborepo, or app-local lockfiles.
- Preserve the essay content and the Observatory's exact-state semantics.
- Preserve the provisional Vela sail unless an approved brand pass replaces it.
- Do not add accounts, a database, a signer, an authority API, or mutation UI.
- Do not add a second frontier parser, search index, or manifest generator.
- Ported Observatory behavior retains provenance to archived `vela-site@34e3f20`.
- For Next.js work, read the relevant guide in `node_modules/next/dist/docs/`
  before relying on remembered framework behavior.

## Verification

```bash
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun run test
bun run build
bun run test:roots
bun run test:manifests
git diff --check
```

Use the Codex in-app Browser for responsive, keyboard, interaction, and visual
QA against local, release-candidate, and production builds. Keep the recorded
viewport matrix and findings with the release evidence; browser automation is
not part of this repository's installed toolchain.

## Release safety

- RC deployments use noncanonical Vercel projects and domains.
- Do not attach `www.vela.space` or `app.vela.space`, change DNS, or tag a final
  release before the documented visual, exact-root, responsive, accessibility,
  and deployed-manifest gates pass.
- Keep the prior production deployments available for the rollback window.
