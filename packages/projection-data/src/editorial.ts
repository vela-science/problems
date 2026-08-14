import editorialSummaryJson from "../config/editorial-summary.v5.json";
import { editorialSummarySchema, type EditorialSummary } from "./editorial-schema";

export { editorialSummarySchema } from "./editorial-schema";
export type { EditorialSummary } from "./editorial-schema";

/*
  The editorial summary is a committed snapshot, not a query.

  This module used to be `editorialSummarySchema.parse(compactEditorialSummary(
  await projectionRelease()))` — a top-level await on a Neon query at module
  scope. Importing anything from here opened a database connection as a side
  effect of the import, and apps/www is the only consumer, so every one of its
  ten routes needed a live database to render. The essays, the manifesto, the
  whitepaper and the 404 page all went down over it, none of which display
  projected data, and local frontend work required a production credential.

  apps/www is `output: 'static'`: it reads nine scalars from this and bakes them
  into HTML at build time. A committed, schema-validated file is the honest
  medium for that, and it is already the pattern next door in release.ts, which
  reads config/vela-release.v1.json.

  Three further things fall out of it. The snapshot and the release record now
  ship in the same commit, so they cannot drift into the version skew this used
  to throw on. The numbers become reviewable in a diff. And the nightly refresh
  can commit a new snapshot, which is what actually keeps the site current —
  today it only redeploys the Problems, so www's figures go stale silently.

  Regenerate with: bun run projection:snapshot   (needs the database once)

  Import the committed JSON as a module, matching release.ts. This keeps the
  snapshot in Astro's build graph; resolving it through import.meta.url instead
  pointed at a transient prerender chunk after bundling and made clean static
  builds fail even though the tracked snapshot was present.
*/

export const editorialSummary = editorialSummarySchema.parse(
  editorialSummaryJson,
) as EditorialSummary;
