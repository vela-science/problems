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
in this package. The one bounded-byte exception is a Workspace's Loro canvas
update stream: each append-only activity update is limited to 256 KiB,
content-root checked in SQL, exact-Problem anchored, and carries
`authority_effect = 'none'`.

The exact current permission matrix and Workspace-promotion threat model live
in `../../docs/security/vela-web-threat-model.md`.

Earlier migrations added Target and execution-binding columns. Those columns
remain only so already-retained activity rows can be decoded without rewriting
history. Current writers create Problem-scoped Approaches, Sessions, Research
Blocks, and drafts. The `20260814_problem_scoped_activity` migration freezes
legacy bound rows and refuses any new Target or execution-binding lineage.

The additive migration `20260813_workspace_crdt` was applied to Neon `main` at
`2026-08-13T23:44:07.159Z` with root
`sha256:68ec2742414cc506d6a69406d8e99f7fe20ad71f44d61c02cfb7f3cc9c234a48`.
The first release state contained zero CRDT updates. The application role has
execute access to the two membership-gated API functions and no base-table
access. These mutable bytes coordinate the shared canvas note only; they are
not Artifact bytes, protocol records, Git history, or scientific State.

At the 2026-08-13 release-truth audit, the production deployment manifest at
`problems.science` reported deployment `dpl_GPkozXemijMU6CvpisrQhyJLR4CH`, Web
commit `03fee3e74b8e85855ced16622c7271079d291641`, and projection release
`sha256:2ac8fb5a79313fc0fdae6f23d4862d26f11f2682222eb1f58ae31513888e190c`.
That checkpoint proves the deployed application and read-only projection
identity. It does not close the authenticated narrow-screen, keyboard, zoom,
reduced-motion, forced-colors, or touch browser matrix.
