# Vela Web

The canonical public website for Vela. One Astro application combines the
editorial essays with a static, exact-root reader over published frontiers.
The site is a read-only projection: it never signs, accepts, or stores
scientific authority.

- Production: <https://www.vela.space/>
- Frontiers: <https://www.vela.space/frontiers>
- Vela protocol and CLI: <https://github.com/vela-science/vela>

## Local verification

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm check:brand
pnpm check:bundle
pnpm test
pnpm build
```

`data/site-frontier-bundle.v1.json` is generated from clean, pinned frontier
checkouts with the exact released Vela binary. It remains a build-time input;
pages are statically rendered and the full bundle is not sent to browsers.

The July 2026 designer handoff is recorded under `brand/reference/2026-07/`.
`brand/vela.tokens.json` is the core token source. Production CSS is generated
with `pnpm brand:generate`. Reference artwork is intentionally excluded.

## Licensing

- Code: Apache-2.0 OR MIT, at your option.
- Essays and original diagrams: CC BY 4.0.
- The Vela name and marks: trademark rights reserved.
- Fonts and third-party components: see `THIRD_PARTY_NOTICES.md`.

The exact-root projection was ported from `vela-science/vela-site` at commit
`724e425c1661da6dcc0ea759e85f2f7f85d3e4c0`. That repository retains its
independent history and its `v0.210.0` release.

Deployment, source-refresh, route, and canonical-host operations are documented
in [`docs/WEB.md`](docs/WEB.md).
