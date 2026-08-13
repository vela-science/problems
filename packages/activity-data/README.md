# `@vela/activity-data`

This server-only package owns all hosted Problems activity. It reads and writes
only the separate `vela_activity` database through `VELA_ACTIVITY_DATABASE_URL`;
scientific projection reads remain owned by `@vela/observatory-data`.

## One-time operator bootstrap

Database creation is deliberately outside the migration runner because
Postgres forbids `CREATE DATABASE` inside a transaction. On the existing Neon
project's main branch, an administrator must:

1. Apply `roles.sql` while connected to an existing administrative database.
2. Run `CREATE DATABASE vela_activity;` as one standalone autocommit statement.
   Neon keeps the database container under its administrative owner; the
   no-login `vela_activity_owner` owns the activity schemas and objects created
   under the migrator's explicit `SET ROLE`.
3. Apply `database-privileges.sql` while connected to `vela_activity`.
4. Provision the migrator and app passwords in Neon, then run `db:migrate` with
   `VELA_ACTIVITY_MIGRATOR_DATABASE_URL`.

Do not pass `roles.sql` or the `CREATE DATABASE` statement to `schema.mjs`.
The rooted runner is the only schema entrypoint: it accepts sorted files from
`migrations/` only, runs each unapplied migration transactionally, records its
exact root, and refuses unknown or rewritten ledger entries. There is no
parallel `schema.sql`; that would bypass the migration ledger and could lose
the transaction-local owner role between statements.

The database-privilege phase also revokes PostgreSQL's default public access
to `vela_observatory`, then restores `CONNECT` to the stable no-login
`observatory_projection_reader` permission role and the retained legacy reader
roles. Versioned projection logins inherit the stable role and receive no
direct cross-plane grant. Without the public revocation, a per-role denial
would be illusory because every activity role would inherit `CONNECT` from
`PUBLIC`.

## Runtime boundary

The app role gets `CONNECT` (without `TEMP`) on `vela_activity`, `USAGE` on `activity_api`, and
`EXECUTE` on its security-definer functions. It has no access to `activity`
tables, the Observatory database, or repository authority keys. Large artifact
bytes stay outside Postgres; only roots, bounded metadata, and locators belong
in this package.

The exact current permission matrix and Workspace-promotion threat model live
in `../../docs/security/vela-web-threat-model.md`. The Target-bound Approach
migration and rollback design live in
`../../docs/architecture/target-bound-approach-adr.md`.

## Target-bound Approach release state

On 2026-08-12, the `activity.schema_migrations` ledger on the Neon `main`
branch recorded `20260812_target_bound_approach` at
`2026-08-12T22:27:04.266Z` with the frozen root
`sha256:07ece86171ad085aaf61fc055030fc5642740a8deff450a39e5e091e96ef4ba9`.
Vercel production deployment `dpl_5V3urZxnbCpD28RTukVqYGTCbPqD` then served
the binding-aware reader from exact commit
`8231c1efd62912c4c95487569a63ffb1e189c805`. The production environment omitted
`VELA_TARGET_BOUND_APPROACH_ENABLED`, so the exact-literal gate kept
Target-bound creation disabled.

`activity:db:live-proof` passed after that default-off reader took production
traffic. The proof created the first bound Approach and one fork that inherited
its exact Target binding. At the release checkpoint, the database contained two
bound Approach rows for one Target, both with `authority_effect = 'none'`, and
one rooted audit entry for each write. The first write advanced the rollback
floor: production may use commit `8231c1efd62912c4c95487569a63ffb1e189c805`
or a later binding-aware reader with the flag absent or `false`; production must
not serve the pre-binding `9feb6975` reader again. Do not rerun the one-shot live
proof against this database because its zero-bound-row precondition has been
consumed.

Production later enabled `VELA_TARGET_BOUND_APPROACH_ENABLED` with exact `true`.
The write-enablement checkpoint deployment
`dpl_7KpFZumFChqPrNyDugwMeVQVsUiX` served Web commit
`2f6b11b847cf85651bd975f81da3237453bdbdb9` over projection release
`sha256:3f73ed2ac1408d704ed12e2e74616001dc2c2039d07c3d7fbf9031e1e2da8b26`.
Signed-in production shows the earlier packet-bound Approach as stale and the
current Target as eligible for new bound work. The full authenticated
narrow-screen, keyboard, zoom, and forced-colors matrix remains release debt;
write enablement does not imply that evidence already exists.

The later additive migration `20260813_execution_binding_lineage` is live at
root `sha256:36c2fb19749e1f2decd793228747973b21335b906d07488a73b020f8d4d075b0`.
Attempts, Research Blocks, and unsigned drafts can therefore retain the exact
packet/profile/capsule/result-contract lineage. Legacy rows remain null and are
not retroactively relabeled.

At the 2026-08-13 release-truth audit, the production deployment manifest at
`problems.science` reported deployment `dpl_GPkozXemijMU6CvpisrQhyJLR4CH`, Web
commit `03fee3e74b8e85855ced16622c7271079d291641`, and projection release
`sha256:2ac8fb5a79313fc0fdae6f23d4862d26f11f2682222eb1f58ae31513888e190c`.
That checkpoint proves the deployed application and read-only projection
identity. It does not close the authenticated narrow-screen, keyboard, zoom,
reduced-motion, forced-colors, or touch browser matrix.

Target-bound writes have a separate server-only rollout gate:
`VELA_TARGET_BOUND_APPROACH_ENABLED`. Only exact `true` enables them; absent,
`false`, and malformed values are disabled. The application role keeps no
base-table access while the binding-aware reader retains and displays exact
Target provenance.
