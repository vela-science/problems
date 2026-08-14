import { neon } from "@neondatabase/serverless";
import { normalizeProjectionManifest } from "../src/index.ts";
import { verifyStoredRelease } from "./projection-store.mjs";

const databaseUrl = process.env.VELA_PROJECTION_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("set VELA_PROJECTION_DATABASE_URL to the read-only Problems connection string");
}

const sql = neon(databaseUrl);
const current = await sql.query(`SELECT r.release_root, r.manifest, c.activated_at
  FROM projection.current_release c
  JOIN projection.releases r USING (release_root)
  WHERE c.singleton = true`);
if (current.length !== 1) throw new Error("the Problems must have exactly one current release");

const manifest = normalizeProjectionManifest(current[0].manifest);
if (manifest.release_root !== current[0].release_root) {
  throw new Error("current release pointer and manifest root disagree");
}
const verified = await verifyStoredRelease(sql, manifest.release_root);

console.log(JSON.stringify({
  ok: true,
  release_root: manifest.release_root,
  schema: manifest.schema,
  activated_at: current[0].activated_at,
  repositories: manifest.source_repositories.map((repository) => ({
    slug: repository.slug,
    commit: repository.commit,
    repository_root: repository.repository_root ?? null,
    origin_root: repository.origin_root ?? null,
    claims: repository.claim_count,
    nodes: repository.graph_node_count,
    edges: repository.graph_edge_count,
    problems: repository.problem_count,
  })),
  table_counts: verified.counts,
}));
