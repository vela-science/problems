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
`../../docs/architecture/target-bound-approach-adr.md`. The additive migration
candidate has been created and exercised only against a disposable local
database. It has not been applied to Neon or any live database.

Target-bound writes have a separate server-only rollout gate:
`VELA_TARGET_BOUND_APPROACH_ENABLED`. Only exact `true` enables them; absent,
`false`, and malformed values are disabled. Apply and verify the additive
migration first, then deploy the binding-aware application with this gate off.
The new reader cannot run before the migration because it requires the added
columns. `db:live-proof` must begin with zero bound rows and is the first
authorized bound write; after it runs, rollback only to the binding-aware
default-off build, never to the pre-binding reader. The application role keeps
no base-table access throughout this sequence.
