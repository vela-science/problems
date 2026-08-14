/*
  Regenerate config/editorial-summary.v5.json from the projection.

  This is the one place that still needs VELA_PROJECTION_DATABASE_URL for the
  editorial site. Everything downstream reads the committed file, so apps/www
  builds with no credential at all.

  The direct release runs it whenever the projection advances, committing the
  result before requalification so snapshot and release cannot drift.

  Deliberately imports the schema module rather than ./editorial, because that
  reads the snapshot and would fail before the first generation.
*/
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { compactEditorialSummary, projectionRelease } from "../src/index.ts";
import { editorialSummarySchema } from "../src/editorial-schema.ts";

const target = fileURLToPath(new URL("../config/editorial-summary.v5.json", import.meta.url));

const summary = editorialSummarySchema.parse(compactEditorialSummary(await projectionRelease()));
writeFileSync(target, `${JSON.stringify(summary, null, 2)}\n`);

console.log(JSON.stringify({
  ok: true,
  schema: "vela.editorial-snapshot-write.v1",
  output: target,
  vela_version: summary.vela_version,
  generated_at: summary.generated_at,
  repositories: summary.repositories.length,
}));
