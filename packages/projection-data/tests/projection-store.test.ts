import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  activateCandidate,
  assertCandidateRetainsCorpus,
  completeCandidateTables,
  corpusDropOverrideVariable,
  corpusRetentionRefusals,
  deterministicRowChunks,
  insertCandidate,
  projectionWriteChunkRows,
  publicTableOrder,
  releaseFacts,
  releaseFactsEqual,
  classifyReleaseSelectionRefusal,
  ReleaseSelectionRefusal,
  releaseSelectionRefusalKinds,
  selectStoredRelease,
  verifyCandidate,
} from "../scripts/projection-store.mjs";
import { canonicalJson, sha256 } from "../src/canonical";

const root = (digit: string) => `sha256:${digit.repeat(64)}`;

function manifest(overrides: Record<string, unknown> = {}) {
  return {
    schema: "vela.projection-release-manifest",
    generated_at: "2026-07-24T12:00:00Z",
    activation_time: "2026-07-24T12:01:00Z",
    release_root: root("1"),
    vela_version: "vela 0.914.1",
    vela_binary_sha256: root("2"),
    table_roots: { repositories: root("3"), claims: root("4") },
    source_registry: {
      schema: "vela.math-source-registry-release.v1",
      declaration_root: root("7"),
      observation_bundle_root: root("8"),
      source_count: 1,
      observation_count: 1,
      native_record_count: 2,
      release_source_count: 1,
      repository_binding_count: 1,
    },
    source_repositories: [{
      slug: "erdos",
      commit: "a".repeat(40),
      tree: "b".repeat(40),
      event_log_root: root("5"),
    }],
    ...overrides,
  };
}

describe("projection release equivalence", () => {
  test("classifies release-selection refusals without retaining database detail", () => {
    expect(classifyReleaseSelectionRefusal(new ReleaseSelectionRefusal(
      releaseSelectionRefusalKinds.expectedCurrentDrift,
      "private exact roots",
    ))).toBe("expected_current_drift");
    expect(classifyReleaseSelectionRefusal(new ReleaseSelectionRefusal(
      "invented_refusal",
      "private exact roots",
    ))).toBe("selection_refused");
    expect(classifyReleaseSelectionRefusal({ code: "40001", detail: "private row" }))
      .toBe("postgres_serialization");
    expect(classifyReleaseSelectionRefusal({
      code: "ERR_POSTGRES_SERVER_ERROR",
      errno: "40001",
      detail: "private row",
    })).toBe("postgres_serialization");
    expect(classifyReleaseSelectionRefusal({ code: "40P01", query: "private SQL" }))
      .toBe("postgres_deadlock");
    for (const code of ["25P03", "55P03", "57014"]) {
      expect(classifyReleaseSelectionRefusal({ code, connectionString: "private URL" }))
        .toBe("postgres_timeout");
    }
    expect(classifyReleaseSelectionRefusal(new Error("private driver failure")))
      .toBe("selection_refused");
  });

  test("the packaged selector emits only a stable refusal envelope", async () => {
    const script = resolve(import.meta.dir, "../scripts/select-projection-release.mjs");
    const source = readFileSync(script, "utf8");
    expect(source).toContain("refusal: classifyReleaseSelectionRefusal(error)");
    expect(source).not.toMatch(/console\.error\((?:error|String\(error\)|error\.message)/u);
    expect(source).not.toMatch(/error\.(?:stack|cause|detail|query|connectionString)/u);
    const environment = { ...process.env };
    delete environment.VELA_PROJECTION_WRITER_DATABASE_URL;
    const processResult = Bun.spawn(["bun", script], {
      env: environment,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(processResult.stdout).text(),
      new Response(processResult.stderr).text(),
      processResult.exited,
    ]);
    expect(exitCode).toBe(1);
    expect(stdout).toBe("");
    expect(JSON.parse(stderr)).toEqual({ ok: false, refusal: "selection_refused" });
  });

  test("requires explicit exact roots at both writer boundaries", async () => {
    await expect(activateCandidate({}, manifest())).rejects.toThrow(
      "expected current release root must be an exact lowercase sha256 root",
    );
    await expect(selectStoredRelease({}, {
      expectedCurrentRoot: root("1"),
      targetReleaseRoot: root("2"),
    })).rejects.toThrow("requires an interactive SQL transaction");
    await expect(selectStoredRelease({}, {
      expectedCurrentRoot: root("1"),
      targetReleaseRoot: root("1"),
    })).rejects.toThrow("already the expected current release");
  });

  test("ignores observation and activation metadata", () => {
    const current = manifest();
    const rebuilt = manifest({
      generated_at: "2026-07-25T08:00:00Z",
      activation_time: "2026-07-25T08:01:00Z",
      release_root: root("9"),
    });

    expect(releaseFactsEqual(current, rebuilt)).toBe(true);
    expect(releaseFacts(rebuilt)).not.toHaveProperty("activation_time");
    expect(releaseFacts(rebuilt)).not.toHaveProperty("generated_at");
    expect(releaseFacts(rebuilt)).not.toHaveProperty("release_root");
  });

  test("detects source, registry, table, manifest, and Vela identity changes", () => {
    const current = manifest();
    expect(releaseFactsEqual(current, manifest({
      source_repositories: [{
        ...current.source_repositories[0],
        commit: "c".repeat(40),
      }],
    }))).toBe(false);
    expect(releaseFactsEqual(current, manifest({
      table_roots: { ...current.table_roots, claims: root("6") },
    }))).toBe(false);
    expect(releaseFactsEqual(current, manifest({
      schema: "unexpected.manifest",
    }))).toBe(false);
    expect(releaseFactsEqual(current, manifest({
      vela_binary_sha256: root("7"),
    }))).toBe(false);
    expect(releaseFactsEqual(current, manifest({
      source_registry: {
        ...(current.source_registry as Record<string, unknown>),
        observation_bundle_root: root("9"),
      },
    }))).toBe(false);
  });
});

describe("projection public table inventory", () => {
  test("uses direct Submission, Proposal, and Verification relations", () => {
    expect(publicTableOrder).not.toContain("registrations");
    expect(publicTableOrder).not.toContain("proposal_object_links");
  });

  /* Every table, because every producer emits every table: the builder seeds
     the five registry tables to `[]` and the math projection fills them. The
     arm that used to substitute `[]` for a missing registry table was for
     candidates that predate them, and no producer can make one. */
  const completeTables = Object.fromEntries(publicTableOrder.map((table) => [table, []]));

  test("does not tolerate a missing established public table", () => {
    const { repositories: _repositories, ...incomplete } = completeTables;
    expect(() => completeCandidateTables(incomplete)).toThrow(
      "candidate is missing public table repositories",
    );
  });

  test("inserts immutable source rows without release scoping them", async () => {
    const operations: Array<{
      kind: "tag" | "query";
      text: string;
      params: unknown[];
    }> = [];
    const tx = Object.assign(
      (strings: TemplateStringsArray, ...params: unknown[]) => {
        operations.push({ kind: "tag", text: strings.join("$"), params });
        return operations.at(-1);
      },
      {
        query(text: string, params: unknown[]) {
          operations.push({ kind: "query", text, params });
          return operations.at(-1);
        },
      },
    );
    const sql = {
      async transaction(build: (value: typeof tx) => unknown[]) {
        return build(tx);
      },
    };
    const releaseRoot = root("a");
    const nativeRecords = Array.from(
      { length: projectionWriteChunkRows + 1 },
      (_, index) => ({
        observation_root: root("d"),
        source_id: "source:fixture",
        native_id: `fixture:${String(index).padStart(4, "0")}`,
        native_kind: "fixture",
        native_revision: null,
        title: `Fixture ${index}`,
        summary: null,
        locators: [],
        metadata: {},
        metadata_root: root("e"),
        content_root: null,
        availability: "reference_only",
        row_root: `sha256:${index.toString(16).padStart(64, "0")}`,
      }),
    );
    await insertCandidate(sql, {
      manifest: {
        release_root: releaseRoot,
        generated_at: "2026-07-30T12:00:00Z",
      },
      tables: {
        ...completeTables,
        /* The producer's shape: rights, adapter and coverage live on the
           declaration, not flat on the row. The fixture used to spell them
           flat, which is why the row builder's `row.rights ?? …` fallbacks
           looked live when only this fixture reached them. */
        source_declarations: [{
          source_id: "source:fixture",
          native_namespace: "fixture",
          publisher_or_maintainer: "Fixture",
          locators: [],
          attributed_claims: [],
          source_kind: "frozen_reference",
          snapshot_policy: { mode: "reference_only" },
          declaration: {
            rights: { access: "public" },
            adapter: { adapter_id: "fixture" },
            coverage: { repository_slugs: ["math"] },
          },
          declaration_root: root("c"),
          row_root: root("b"),
        }],
        source_observations: [],
        native_records: nativeRecords,
        release_sources: [],
        repository_source_bindings: [],
      },
    });

    const insert = operations.find(({ text }) => (
      text.includes("INSERT INTO projection.source_declarations")
    ));
    expect(insert?.text).toContain(
      "NULL::projection.source_declarations",
    );
    const rows = JSON.parse(String(insert?.params[0]));
    expect(rows[0]).not.toHaveProperty("release_root");
    expect(rows[0]).not.toHaveProperty("declaration");
    expect(rows[0]).toMatchObject({
      source_id: "source:fixture",
      declaration_root: root("c"),
      row_root: root("b"),
    });
    const nativeInserts = operations.filter(({ text }) => (
      text.includes("INSERT INTO projection.native_records")
    ));
    expect(nativeInserts).toHaveLength(2);
    expect(nativeInserts.map(({ params }) => (
      JSON.parse(String(params[0])).length
    ))).toEqual([projectionWriteChunkRows, 1]);
  });

  /*
    Every check in `verifyCandidate` above this one is self-consistency, and
    self-consistency is free at zero: an empty table has a real root and it
    matches the manifest that describes it. A build that reached the projection
    with no Claim, no binding and no Problem verified perfectly and activated,
    and the site went quiet behind a green run. The floor is what makes emptying
    a repository something someone has to say out loud.
  */
  const emptyCandidate = (activated: Record<string, number>) => {
    /* The empty table root, computed here rather than written down. */
    const emptyRoot = sha256(canonicalJson([]));
    const releaseRoot = root("e");
    const activatedRoot = root("d");
    const candidateManifest = {
      release_root: releaseRoot,
      table_roots: Object.fromEntries(
        publicTableOrder.map((table) => [table, emptyRoot]),
      ),
      source_repositories: [{
        repository_id: "8138c6da-46c4-47ee-b493-5bbfbec09b1e",
        slug: "math",
        graph_node_count: 0,
        graph_edge_count: 0,
        graph_claim_count: 0,
        problem_count: 0,
      }],
    };
    return {
      releaseRoot,
      activatedRoot,
      candidate: {
        manifest: candidateManifest,
        tables: Object.fromEntries(publicTableOrder.map((table) => [table, []])),
      },
      sql: {
        query(text: string) {
          if (text.includes("FROM projection.releases")) {
            return Promise.resolve([{ manifest: candidateManifest }]);
          }
          if (text.includes("AS native_records")) {
            return Promise.resolve([activated]);
          }
          if (text.includes("FROM projection.current_release")) {
            return Promise.resolve([{ release_root: activatedRoot }]);
          }
          if (text.includes("AS scoped_problems")) return Promise.resolve([{ scoped_problems: 0 }]);
          if (text.includes("AS problems")) return Promise.resolve([{ problems: 0 }]);
          return Promise.resolve([]);
        },
      },
    };
  };

  test("refuses to verify a candidate that empties the activated release", async () => {
    const { sql, candidate } = emptyCandidate({
      claims: 2_844,
      native_records: 5_998,
      problems: 1_217,
    });

    /* Every root and every row count in this candidate agrees with its own
       manifest, so the refusal can only come from the comparison. */
    const refusal = verifyCandidate(sql, candidate);
    await expect(refusal).rejects.toThrow("refusing to activate");
    /* The measures and both numbers, so a reader knows what was lost without
       running a query. */
    await expect(refusal).rejects.toThrow("claims 0, against 2844");
    await expect(refusal).rejects.toThrow("problems 0, against 1217");
    await expect(refusal).rejects.toThrow("native_records 0, against 5998");
    await expect(refusal).rejects.toThrow(corpusDropOverrideVariable);
  });

  test("a release that holds its corpus verifies, and a first release has none to hold", async () => {
    const { sql, candidate, releaseRoot } = emptyCandidate({
      claims: 0,
      native_records: 0,
      problems: 0,
    });
    await expect(verifyCandidate(sql, candidate)).resolves.toMatchObject({
      ok: true,
      release_root: releaseRoot,
      corpus: { claims: 0, problems: 0, native_records: 0 },
    });
  });

  test("names the drop without deciding it, and takes an explicit override", () => {
    const activated = { claims: 100, problems: 1_000, native_records: 40 };

    /* Half is the floor, so half still stands. */
    expect(corpusRetentionRefusals(activated, {
      claims: 50,
      problems: 500,
      native_records: 20,
    })).toEqual([]);
    /* Growth is never a drop, and neither is a measure that was already zero. */
    expect(corpusRetentionRefusals(
      { claims: 0, problems: 0, native_records: 0 },
      { claims: 0, problems: 0, native_records: 0 },
    )).toEqual([]);
    /* One measure collapsing is enough, even where the others are untouched. */
    expect(corpusRetentionRefusals(activated, {
      claims: 100,
      problems: 1_000,
      native_records: 0,
    })).toEqual(["native_records 0, against 40 in the activated release"]);

    const emptied = { claims: 0, problems: 0, native_records: 0 };
    expect(() => assertCandidateRetainsCorpus(activated, emptied, {}))
      .toThrow("refusing to activate");
    /* The override does not hide what it waved through. */
    expect(assertCandidateRetainsCorpus(activated, emptied, {
      [corpusDropOverrideVariable]: "1",
    })).toMatchObject({ ok: true, overridden: true });
    expect(assertCandidateRetainsCorpus(activated, emptied, {
      [corpusDropOverrideVariable]: "1",
    }).refusals).toHaveLength(3);
  });

  test("chunks high-volume rows deterministically", () => {
    const rows = Array.from(
      { length: projectionWriteChunkRows * 2 + 1 },
      (_, index) => ({ index }),
    );
    const chunks = deterministicRowChunks(rows);
    expect(chunks.map((chunk) => chunk.length)).toEqual([
      projectionWriteChunkRows,
      projectionWriteChunkRows,
      1,
    ]);
    expect(chunks.flat()).toEqual(rows);
    expect(() => deterministicRowChunks(rows, 0)).toThrow(
      "projection chunk size must be a positive safe integer",
    );
  });
});
