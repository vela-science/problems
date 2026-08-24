/* Ingest one Formal Conjectures frontier-census snapshot.
 *
 * Usage: node scripts/ingest-fc-frontier.mjs <census.jsonl> \
 *          --corpus <owner/repo> --commit <sha> [--upstream <owner/repo@sha>] \
 *          --toolchain <lean-toolchain> --measured-on <YYYY-MM-DD>
 *
 * The snapshot is rooted by the SHA-256 of the census file's exact bytes;
 * re-ingesting identical bytes is a no-op. Aggregation reimplements the
 * committed semantic authored/generated classification (vela-evals
 * analyze_census.py) so the database rows re-derive from the raw census.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { neon } from "../src/neon-client";

const args = process.argv.slice(2);
const positional = args.filter((value) => !value.startsWith("--"));
const option = (name) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? undefined : args[index + 1];
};
const censusPath = positional[0];
if (!censusPath) throw new Error("census jsonl path is required");
const corpus = option("corpus"); const commit = option("commit");
const toolchain = option("toolchain"); const measuredOn = option("measured-on");
const upstream = option("upstream") ?? null;
if (!corpus || !commit || !toolchain || !measuredOn) {
  throw new Error("--corpus, --commit, --toolchain and --measured-on are required");
}

const bytes = readFileSync(censusPath);
const censusRoot = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const rows = bytes.toString("utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
const byName = new Map(rows.map((row) => [row.name, row]));

function generated(row) {
  const name = row.name;
  if (row.internal || row.aux_rec || row.no_conf || row.proj_fn || row.kind === "rec") return true;
  const last = name.split(".").at(-1);
  if (/^eq_\d+$|^eq_def$/u.test(last)) {
    const parent = byName.get(name.split(".").slice(0, -1).join("."));
    if (parent && parent.kind === "defn") return true;
  }
  if (/^(match_\d+|_sunfold|sizeOf_spec|injEq|below|ibelow)$/u.test(last)) return true;
  if (name.includes(".below.") || name.includes(".ibelow.") || name.includes(".brecOn.")) return true;
  if (last === "mk" || name.includes(".mk.")) return true;
  return false;
}

const families = new Map();
const repairs = [];
let authored = 0;
for (const row of rows) {
  if (generated(row)) continue;
  authored += 1;
  const family = row.module.replace("FormalConjectures.", "").replaceAll("«", "").replaceAll("»", "");
  const entry = families.get(family) ?? { prove: 0, state: 0, repair: 0, kernel: 0, compiler: 0 };
  if (row.sorry) {
    if (row.stmt_hole && !row.stmt_hole_direct) { entry.repair += 1; repairs.push(row.name); }
    else if (row.stmt_hole_direct) entry.state += 1;
    else entry.prove += 1;
  } else if (row.compiler_trust) entry.compiler += 1;
  else entry.kernel += 1;
  families.set(family, entry);
}
const totals = { prove: 0, state: 0, repair: 0, kernel: 0, compiler: 0 };
for (const entry of families.values()) for (const key of Object.keys(totals)) totals[key] += entry[key];

const url = process.env.VELA_PROJECTION_DATABASE_URL;
if (!url) throw new Error("VELA_PROJECTION_DATABASE_URL is required");
const sql = neon(url);
const existing = await sql.query(
  "SELECT census_root FROM projection.fc_frontier_snapshots WHERE census_root = $1", [censusRoot]);
if (existing.length) {
  console.log(`snapshot ${censusRoot} already ingested; no-op`);
  process.exit(0);
}
await sql.query(
  `INSERT INTO projection.fc_frontier_snapshots (
     census_root, corpus_repository, corpus_commit, upstream_equivalent,
     lean_toolchain, measured_on, authored_declarations, family_count,
     prove_count, state_count, repair_count,
     kernel_settled_count, compiler_settled_count)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
  [censusRoot, corpus, commit, upstream, toolchain, measuredOn, authored,
   families.size, totals.prove, totals.state, totals.repair, totals.kernel, totals.compiler]);
for (const [family, entry] of families) {
  await sql.query(
    `INSERT INTO projection.fc_frontier_families (
       census_root, family, prove_count, state_count, repair_count,
       kernel_settled_count, compiler_settled_count)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [censusRoot, family, entry.prove, entry.state, entry.repair, entry.kernel, entry.compiler]);
}
for (const declaration of repairs.sort()) {
  await sql.query(
    "INSERT INTO projection.fc_frontier_repairs (census_root, declaration) VALUES ($1,$2)",
    [censusRoot, declaration]);
}
console.log(`ingested ${censusRoot}: authored=${authored} families=${families.size}`,
  totals, `repairs=${repairs.length}`);
