import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.VELA_PROJECTION_WRITER_DATABASE_URL;
if (!databaseUrl) throw new Error("set VELA_PROJECTION_WRITER_DATABASE_URL");
const sql = neon(databaseUrl);
const [removed, observations, declarations] = await sql.transaction((tx) => [
  tx.query(`WITH retained AS (
    SELECT release.release_root
    FROM projection.releases release
    JOIN projection.releases current_entry
      ON current_entry.release_root = (
        SELECT release_root FROM projection.current_release WHERE singleton
      )
    WHERE release.activated_at IS NOT NULL
      AND release.activated_at <= current_entry.activated_at
    ORDER BY (release.release_root = current_entry.release_root) DESC,
      release.activated_at DESC, release.release_root DESC
    LIMIT 3
  ), disposable AS (
    SELECT r.release_root FROM projection.releases r
    WHERE r.release_root NOT IN (SELECT release_root FROM retained)
  )
  DELETE FROM projection.releases r USING disposable d
  WHERE r.release_root = d.release_root RETURNING r.release_root`),
  tx.query(`DELETE FROM projection.source_observations o
  WHERE NOT EXISTS (
    SELECT 1 FROM projection.release_sources r
    WHERE r.observation_root = o.observation_root
  )
  RETURNING o.observation_root`),
  tx.query(`DELETE FROM projection.source_declarations d
  WHERE NOT EXISTS (
    SELECT 1 FROM projection.source_observations o
    WHERE o.declaration_root = d.declaration_root
  )
  AND NOT EXISTS (
    SELECT 1 FROM projection.release_sources r
    WHERE r.declaration_root = d.declaration_root
  )
  RETURNING d.declaration_root`),
]);
console.log(JSON.stringify({
  schema: "vela.projection-prune-result.v1",
  ok: true,
  authority_effect: "none",
  retention: "current_and_two_predecessors",
  removed_releases: removed.map((row) => row.release_root),
  removed_observations: observations.map((row) => row.observation_root),
  removed_declarations: declarations.map((row) => row.declaration_root),
}));
