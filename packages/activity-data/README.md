# `@vela/activity-data`

This server-only package owns all hosted Problems activity. It reads and writes
only the separate `vela_activity` database through `VELA_ACTIVITY_DATABASE_URL`;
scientific projection reads remain owned by `@vela/projection-data`.

## Clean operator bootstrap

Database creation is deliberately outside the schema runner because
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
The rooted runner is the only schema entrypoint. It applies the sorted SQL
fragments in `schema/` once to an empty database, reports their aggregate root,
and thereafter requires the exact current table and column inventory. This is
the clean pre-release baseline; it has no predecessor migration reader or
parallel compatibility schema.

The database-privilege phase also revokes PostgreSQL's default public access
to `vela_projection`, then restores `CONNECT` to the stable no-login
`vela_projection_reader` permission role. Versioned projection logins inherit
the stable role and receive no
direct cross-plane grant. Without the public revocation, a per-role denial
would be illusory because every activity role would inherit `CONNECT` from
`PUBLIC`.

## Runtime boundary

The app role gets `CONNECT` (without `TEMP`) on `vela_activity`, `USAGE` on `activity_api`, and
`EXECUTE` on its security-definer functions. It has no access to `activity`
tables, the Problems database, or repository authority keys. Large artifact
bytes stay outside Postgres; only roots, bounded metadata, and locators belong
in this package. The one bounded-byte exception is a Workspace's Loro canvas
update stream: each append-only activity update is limited to 256 KiB,
content-root checked in SQL, exact-Problem anchored, and carries
`authority_effect = 'none'`.

The exact current permission matrix and Workspace-promotion threat model live
in `../../docs/security/vela-web-threat-model.md`.

Current writers create Problem-scoped Approaches, Attempts, Research Blocks,
discussion notes, canvas updates, and unsigned Submission drafts. Generic
agent sessions, transcripts, checkpoints, provider locators, retired Target
bindings and source-owned execution lineage are outside this database. The
application role has execute access only to membership-gated API functions and
no base-table access. Canvas bytes coordinate one shared Workspace document;
they are not Artifact bytes, protocol records, Git history, or scientific
State.
