# Vela Web

Vela's public web product is one Bun workspace with two purpose-built, static
applications:

- `apps/www`: the Astro editorial site for Vela, essays, and long-form work;
- `apps/observatory`: the Next.js Observatory for exact frontier state;
- `packages/brand`: the governed token, font, and mark source;
- `packages/frontier-data`: the sole exact-root frontier projection.

The applications share facts and brand assets, not framework-specific UI.
Neither application signs, accepts, or mutates scientific state.

- Editorial production: <https://www.vela.space/>
- Observatory production: <https://app.vela.space/frontiers>
- Protocol and CLI: <https://github.com/vela-science/vela>

## Local verification

The repository pins Bun in `package.json` and `bun.lock`. Do not add npm, pnpm,
Yarn, Turborepo, or per-application lockfiles.

```bash
bun install --frozen-lockfile
bun run check
bun run lint
bun run test
bun run build
git diff --check
```

Run an application independently with `bun run dev:www` or
`bun run dev:observatory`. The shared frontier package validates
`site.frontier-bundle.v1` at build time; the complete bundle is never shipped
as a universal browser payload.

The July 2026 v1.1 designer handoff is recorded under
`packages/brand/reference/2026-07-v1.1/`. `packages/brand/vela.tokens.json` is
the DTCG source. Reference artwork is deliberately excluded, and the current
mark remains provisional.

## Licensing

- Code: Apache-2.0 OR MIT, at your option.
- Essays and original diagrams: CC BY 4.0.
- The Vela name and marks: trademark rights reserved.
- Fonts and third-party components: see `THIRD_PARTY_NOTICES.md`.

The Observatory product anatomy was studied from the archived `vela-site`
commit `34e3f20`; ported code carries provenance without merging unrelated Git
histories. See [`docs/observatory-provenance.md`](docs/observatory-provenance.md)
and [`docs/WEB.md`](docs/WEB.md).
