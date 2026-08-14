# Projection migrations

`schema.sql` is the complete clean-database baseline. The Coherence cutover
starts a new `vela_projection` database from that file, so no prelaunch
prelaunch migration or ledger row is carried into the current system.

Future changes that must preserve current production data may add an immutable
`.sql` file here. `scripts/schema.mjs` applies `schema.sql` first, applies new
migrations in filename order, and records each exact SHA-256 in
`projection.schema_migrations`. A migration must also state its final shape in
`schema.sql`, because provider-loss reconstruction starts from an empty
database and never depends on migration history.
