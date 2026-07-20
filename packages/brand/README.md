# Vela brand source

`vela.tokens.json` is the checked-in DTCG source used by both public web
applications. `bun run --filter @vela/brand build` produces the shared CSS
and TypeScript outputs; app-specific extensions consume the semantic variables.
`vela-mark-full.svg` and `vela-mark-micro.svg` are the current audited exports
used by the site.

Applications call `scripts/sync-web-assets.mjs` before development and builds.
This keeps the package as the single source for self-hosted fonts and, where
requested, the provisional favicon instead of checking duplicate copies into
each application.

`reference/2026-07-v1.1/` preserves the current production brief, messaging rules, asset
manifest, and acceptance checklist from the July 2026 designer handoff. Its
`MANIFEST.sha256` records every original handoff file, including the PDF, DOCX,
and visual references that are deliberately not copied into this repository.

The older `reference/2026-07/` directory remains historical. Reference images
are art direction, not production artwork; they are hashed but not copied,
traced, or shipped. The sail remains provisional until the acceptance checklist
and visual-similarity review are complete.
