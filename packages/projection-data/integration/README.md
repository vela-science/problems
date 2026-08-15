# integration — integration tests that need a live projection database

These suites query Neon. Everything in `../tests` is pure and runs anywhere.

The split keeps the package's pure parser/projector checks independent of a live
provider while preserving an explicit database-backed qualification surface.

The failure that prompted this was schema drift: code began reading
`projection.verifications` before the live projection exposed it, so provider-backed
checks died on `42P01 undefined_table`. The current model uses one desired-state
`schema.sql` as the desired-state mirror plus a content-rooted forward migration
ledger. `db:migrate` is explicit and runs before projection activation.

So:

| script | runs | needs a database |
|---|---|---|
| `check` | `tests` | no — safe in any build |
| `check:db` | `integration` | yes |
| `test` | both | no, but the db suites self-skip |

The suites here already guard themselves: they read
`VELA_PROJECTION_DATABASE_URL` and `describe.skip` when it is absent, and
`VELA_REQUIRE_PROJECTION_TESTS=1` turns that skip into a hard failure for CI that
is supposed to have a database. Keep that guard — the directory split is about
which *builds* opt in, not a replacement for it.

**Do not fold these back into `../tests`.** If a new suite needs Neon, it belongs
here.
