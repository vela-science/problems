/*
  Release gate for projection/release skew.

  Deliberately NOT part of `bun run check`: reading the projection version needs
  VELA_PROJECTION_DATABASE_URL, and CI's pull-request job runs `check` without
  secrets. It belongs in the build chain, which already requires the database —
  which is also exactly where the old module-scope throw effectively fired.
*/
import { editorialSummary } from "@vela/frontier-data/editorial";
import { velaRelease } from "@vela/frontier-data/release";
import { assertProjectionCompatibility } from "./projection-compatibility.mjs";

console.log(JSON.stringify(
  assertProjectionCompatibility(editorialSummary.vela_version, velaRelease.version),
));
