# Release notes

One file per published version of this repository, named `v<version>.md`, where
`<version>` is the `version` field in the root `package.json`.

Thirty-six of these existed before this page did, described by no document and
maintained by no gate. They were not stale — the newest matched the current
version — but nothing said what they were for, and nothing would have noticed if
the next version bump shipped without one. A practice that survives only because
the people doing it remember is a practice that ends quietly.

So `release-notes.test.ts` holds the current version to a note here. Bumping
`package.json` without writing one fails the build, which is the only moment the
requirement is cheap to meet: the person bumping the version is the person who
knows what changed.

These are notes about this repository — the Observatory, the projection
pipeline, the editorial site. The protocol's releases are `vela-science/vela`'s
and are recorded there; the version this site pins is in
`packages/projection-data/config/vela-release.v1.json`.

Nothing links these into the published documentation, and that is deliberate.
They are a log for people working on the repository, not a surface the site
serves — which is why the coverage rule that holds `docs/` to its index does not
reach here.
