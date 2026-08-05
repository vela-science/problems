/*
  Assert the committed editorial snapshot was produced by a Vela release the
  site can vouch for.

  This began as a module-scope throw in apps/www/src/data/substrate-state.ts — a
  hand-maintained Set of literal version strings that took every route down on a
  miss. It moved here to be a gate rather than a render-time exception.

  Now that the summary is a committed snapshot rather than a query, this needs no
  database: it compares two files in the repo, config/editorial-summary.v4.json
  against config/vela-release.v1.json. So it can run in `bun run check`, which
  CI executes on pull requests without secrets.

  Imported by relative path, not by package specifier: root scripts/ has no
  dependency on @vela/frontier-data, so the bare import does not resolve here.
*/
import { editorialSummary } from "../packages/frontier-data/src/editorial.ts";
import { velaRelease } from "../packages/frontier-data/src/release.ts";
import { assertProjectionCompatibility } from "./projection-compatibility.mjs";

console.log(JSON.stringify(
  assertProjectionCompatibility(editorialSummary.vela_version, velaRelease.version),
));
