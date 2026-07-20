# Vela mark system

The canonical mark sources live in `source/`. They preserve the Vela sail and
state-to-direction baseline while using separate optical drawings at full,
compact, micro, and 16 px sizes. The wordmark is outlined vector artwork rather
than a live font dependency.

Run `bun run --filter @vela/brand build:marks` to replace `exports/` and the
identity approval sheet deterministically. Run `bun run --filter @vela/brand
check` to verify source and export hashes, token colors, SVG constraints, and
favicon geometry.

The generated family includes color, monochrome, and reversed SVG, PNG, PDF,
and EPS output, plus favicon, Apple touch, social, and print-ready assets.

The similarity record is a broad, non-legal visual screen. It is not a
trademark opinion or legal clearance.
