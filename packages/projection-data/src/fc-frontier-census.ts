import { neon } from "./neon-client";

function databaseUrl(): string {
  const value = process.env.VELA_PROJECTION_DATABASE_URL;
  if (!value) throw new Error("VELA_PROJECTION_DATABASE_URL is required for Problems reads");
  return value;
}
const sql = () => neon(databaseUrl());

/* The Formal Conjectures frontier census: a derived, disposable projection
   over an external corpus checkout, rooted by the SHA-256 of its census file.
   It holds no authority and asserts nothing about Standing; reads return the
   most recently ingested snapshot, whole, so a page renders one exact root. */

export type FcFrontierFamily = {
  family: string;
  prove: number;
  state: number;
  repair: number;
  kernel: number;
  compiler: number;
};

export type FcFrontierSnapshot = {
  censusRoot: string;
  corpusRepository: string;
  corpusCommit: string;
  upstreamEquivalent: string | null;
  leanToolchain: string;
  measuredOn: string;
  authoredDeclarations: number;
  familyCount: number;
  totals: { prove: number; state: number; repair: number; kernel: number; compiler: number };
  topProveFamilies: FcFrontierFamily[];
  repairDeclarations: string[];
};

function integer(value: unknown, field: string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`fc frontier census field ${field} is not a nonnegative integer`);
  }
  return parsed;
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || !value) {
    throw new Error(`fc frontier census field ${field} is missing`);
  }
  return value;
}

export async function currentFcFrontier(
  options: { topFamilies?: number } = {},
): Promise<FcFrontierSnapshot | null> {
  const top = Math.min(Math.max(options.topFamilies ?? 12, 1), 50);
  const client = sql();
  const snapshots = await client.query(
    `SELECT census_root, corpus_repository, corpus_commit, upstream_equivalent,
            lean_toolchain, measured_on::text AS measured_on,
            authored_declarations, family_count, prove_count, state_count,
            repair_count, kernel_settled_count, compiler_settled_count
       FROM projection.fc_frontier_snapshots
      ORDER BY ingested_at DESC, census_root DESC
      LIMIT 1`,
  ) as Record<string, unknown>[];
  const snapshot = snapshots[0];
  if (!snapshot) return null;
  const censusRoot = text(snapshot.census_root, "census_root");
  const [families, repairs] = await Promise.all([
    client.query(
      `SELECT family, prove_count, state_count, repair_count,
              kernel_settled_count, compiler_settled_count
         FROM projection.fc_frontier_families
        WHERE census_root = $1
        ORDER BY prove_count DESC, family
        LIMIT $2`,
      [censusRoot, top],
    ) as Promise<Record<string, unknown>[]>,
    client.query(
      `SELECT declaration FROM projection.fc_frontier_repairs
        WHERE census_root = $1 ORDER BY declaration`,
      [censusRoot],
    ) as Promise<Record<string, unknown>[]>,
  ]);
  return {
    censusRoot,
    corpusRepository: text(snapshot.corpus_repository, "corpus_repository"),
    corpusCommit: text(snapshot.corpus_commit, "corpus_commit"),
    upstreamEquivalent: snapshot.upstream_equivalent == null
      ? null
      : text(snapshot.upstream_equivalent, "upstream_equivalent"),
    leanToolchain: text(snapshot.lean_toolchain, "lean_toolchain"),
    measuredOn: text(snapshot.measured_on, "measured_on"),
    authoredDeclarations: integer(snapshot.authored_declarations, "authored_declarations"),
    familyCount: integer(snapshot.family_count, "family_count"),
    totals: {
      prove: integer(snapshot.prove_count, "prove_count"),
      state: integer(snapshot.state_count, "state_count"),
      repair: integer(snapshot.repair_count, "repair_count"),
      kernel: integer(snapshot.kernel_settled_count, "kernel_settled_count"),
      compiler: integer(snapshot.compiler_settled_count, "compiler_settled_count"),
    },
    topProveFamilies: families.map((row) => ({
      family: text(row.family, "family"),
      prove: integer(row.prove_count, "family prove_count"),
      state: integer(row.state_count, "family state_count"),
      repair: integer(row.repair_count, "family repair_count"),
      kernel: integer(row.kernel_settled_count, "family kernel_settled_count"),
      compiler: integer(row.compiler_settled_count, "family compiler_settled_count"),
    })),
    repairDeclarations: repairs.map((row) => text(row.declaration, "repair declaration")),
  };
}
