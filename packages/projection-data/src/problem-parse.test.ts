import type { HashRoot } from "./canonical";
import { describe, expect, test } from "bun:test";
import { problemClaimsFromBindingRows, problemFromRow } from "./index";
import { createRepositorySourceBinding } from "./math-sources";
import { problemResolutionConfig, reviewedProblemBindingOccurrences } from "./problem-resolution";
import { repositoryKey } from "./registry";

function row(overrides: Record<string, unknown> = {}) {
  return {
    problem: "1",
    node_id: "erdos:1",
    source_id: "source:erdos-problems",
    content_root: `sha256:${"a".repeat(64)}`,
    claim_id: "vcl_exact",
    statement: "If $A\\subseteq \\{1,\\ldots,N\\}$ has distinct subset sums then $N \\gg 2^{n}$.",
    declared_status: "open",
    formalized: true,
    prize: "$500",
    tags: ["additive combinatorics", "number theory"],
    oeis: ["A276661"],
    lean_url: "https://github.com/google-deepmind/formal-conjectures/blob/main/FormalConjectures/ErdosProblems/1.lean",
    source_ids: ["source:erdos-problems"],
    source_count: 1,
    ...overrides,
  };
}

describe("problemFromRow", () => {
  test("carries the declared status, the formalization flag, and the prize apart", () => {
    const problem = problemFromRow(row());
    expect(problem.declared_status).toBe("open");
    expect(problem.formalized).toBe(true);
    expect(problem.prize).toBe("$500");
    expect(problem.source_id).toBe("source:erdos-problems");
  });

  /* The source declares `Prize: no.` on 1,111 problems. That is a recorded
     absence, and it must not reach the row as a word the eyebrow would print. */
  test("a declared absence of prize is null, never the word", () => {
    expect(problemFromRow(row({ prize: null })).prize).toBeNull();
  });

  /* The three list fields are `array_agg` results, and `array_agg` over no rows
     is NULL rather than an empty array. A row with no OEIS entry, no subject,
     or no binding must still be a Problem the ledger can render. */
  test("an absent list is an empty list", () => {
    const bare = problemFromRow(row({ tags: null, oeis: null, source_ids: null, source_count: null }));
    expect(bare.tags).toEqual([]);
    expect(bare.oeis).toEqual([]);
    expect(bare.source_ids).toEqual([]);
    expect(bare.source_count).toBe(0);
  });

  /* Formalization is drawn as a mark and linked to a URL, and the two are read
     from different retained fields. Neither may be inferred from the other. */
  test("formalization is the flag, not the presence of a link", () => {
    expect(problemFromRow(row({ formalized: false, lean_url: null })).formalized).toBe(false);
    expect(problemFromRow(row({ formalized: false })).lean_url).toBeString();
    expect(problemFromRow(row({ lean_url: null })).formalized).toBe(true);
  });

  test("a problem with no bound source record still renders", () => {
    expect(problemFromRow(row({ statement: null })).statement).toBe("");
  });

  test("an unbound source Problem carries no Repository-local Claim", () => {
    expect(problemFromRow(row({ claim_id: null })).claim_id).toBeNull();
  });

  test("refuses a ledger row with multiple current Claims", () => {
    expect(() => problemFromRow(row({ current_claim_count: 2 })))
      .toThrow(/multiple current Repository Claims/u);
  });
});

describe("Problem Claim Binding provenance", () => {
  const releaseRoot = `sha256:${"f".repeat(64)}` as const;
  const repositoryId = repositoryKey("math");
  const entity = problemResolutionConfig.entities.find(({ problem_number }) => problem_number === 321)!;
  const occurrences = reviewedProblemBindingOccurrences(entity.canonical_occurrence);
  const selected = occurrences.filter(({ native_id }) => (
    native_id === "Erdos321.erdos_321" || native_id.endsWith(".variants.isTheta")
  ));

  function bindingRow(claimDigit: string, occurrenceIndex: number) {
    const occurrence = selected[occurrenceIndex]!;
    const claimId = `vcl_${claimDigit.repeat(64)}`;
    const claimRoot: HashRoot = `sha256:${claimDigit.repeat(64)}`;
    const binding = createRepositorySourceBinding({
      schema: "vela.repository-source-binding.v1",
      release_root: releaseRoot,
      repository_id: repositoryId,
      binding_id: `binding:problem-321:${claimDigit}:${occurrenceIndex}`,
      source_id: occurrence.source_id,
      observation_root: `sha256:${String(occurrenceIndex + 1).repeat(64)}`,
      native_id: occurrence.native_id,
      native_record_root: `sha256:${String(occurrenceIndex + 3).repeat(64)}`,
      binding_kind: "snapshot",
      repository_object_kind: "claim",
      repository_object_id: claimId,
      repository_object_root: claimRoot,
      local_standing_effect: "none",
    });
    return {
      claim_id: claimId,
      claim_root: claimRoot,
      standing: "accepted",
      assertion: "The corrected local Claim.",
      assertion_kind: "theoretical",
      conditions: [],
      created_at: "2026-08-14T00:00:00Z",
      source_title: "Authenticated Submission",
      source_type: "submission",
      source_path: `records/claims/${claimDigit}.json`,
      record: { relations: [{ kind: "corrects", target_claim_id: `vcl_${"0".repeat(64)}` }] },
      contested: false,
      retracted: false,
      evidence_count: 1,
      proposal_recorded: true,
      binding_id: binding.binding_id,
      binding_root: binding.binding_root,
      binding_row_root: binding.binding_root,
      binding_source_id: binding.source_id,
      binding_observation_root: binding.observation_root,
      binding_native_id: binding.native_id,
      binding_native_record_root: binding.native_record_root,
      binding_kind: binding.binding_kind,
      binding_repository_object_root: binding.repository_object_root,
      local_standing_effect: binding.local_standing_effect,
      binding_native_kind: occurrence.native_kind,
      binding_content_root: occurrence.content_root,
    };
  }

  test("preserves every exact reviewed occurrence Binding on one current Claim", () => {
    const result = problemClaimsFromBindingRows({
      rows: [bindingRow("a", 0), bindingRow("a", 1)],
      releaseRoot,
      repositoryId,
      problemLabel: "math/321",
      occurrences,
    });
    expect(result.current_claim_id).toBe(`vcl_${"a".repeat(64)}`);
    expect(result.claims).toHaveLength(1);
    expect(result.claims[0]!.source_bindings.map(({ relation_kind }) => relation_kind)).toEqual([
      "formal_statement_reference",
      "formal_statement_reference",
    ]);
    expect(result.claims[0]!.source_bindings.every(({ authority_effect, translation_disposition }) => (
      authority_effect === "none" && translation_disposition === "unresolved"
    ))).toBe(true);
  });

  test("refuses two current Claims instead of selecting the lexical first", () => {
    expect(() => problemClaimsFromBindingRows({
      rows: [bindingRow("a", 0), bindingRow("b", 1)],
      releaseRoot,
      repositoryId,
      problemLabel: "math/321",
      occurrences,
    })).toThrow(/multiple current Repository Claims/u);
  });
});

describe("where the problem ledger's derived columns come from", () => {
  const indexSource = () => Bun.file(new URL("./index.ts", import.meta.url)).text();

  /* These four used to be regex-extracted from a Claim's assertion string, in
     two templates, and a pattern reading only one returned NULL on the other.
     They are now fields of the Source record, which is what they always were:
     upstream publishes them, this authority does not derive them, and reading
     them off an assertion required the assertion to exist. */
  test("status, formalization, prize and tags are read from Source metadata", async () => {
    const source = await indexSource();
    /* Flat scalar keys, `<field>_<leaf>`. A native record's metadata is flat
       scalars by contract, so the adapter's nested `status` object was retained
       as the text of its own JSON and `metadata -> 'status' ->> 'state'` was
       NULL on all 1,217 problems — a whole ledger reading as a source that
       recorded nothing. */
    expect(source).toContain("n.metadata ->> '${field}_${leaf}'");
    for (const accessor of [
      'declaredStateSql("status", "state")',
      'declaredStateSql("informal_status", "state")',
      'declaredStateSql("formalized", "state")',
      'declaredStateSql("formal_status", "url")',
    ]) {
      expect(source).toContain(accessor);
    }
    expect(source).toContain("n.metadata ->> 'prize'");
    /* Each declared state also reads the object and the string encodings, for
       the releases that were built before the adapter flattened them. */
    expect(source).toContain("WHEN 'string' THEN (n.metadata ->> '${field}')::jsonb ->> '${leaf}'");
    /* Tags and OEIS are lists, so they keep the array accessor rather than
       flattening into a fixed set of names. */
    expect(source).toContain('jsonArraySql("tags")');
    expect(source).toContain('jsonArraySql("oeis")');
    expect(source).not.toContain("substring(f.assertion");
  });

  /* Upstream regenerates `status` from `informal_status` and `formal_status` on
     every push and says so in its own tooling. Reading only the derived value
     would make this projection silently wrong the first time upstream changes
     how it combines them, so the primitive is read as the fallback and both
     travel into the record. */
  test("the derived status prefers upstream's own combination but keeps the primitive", async () => {
    const source = await indexSource();
    const status = source.slice(source.indexOf("const PROBLEM_STATUS_SQL"));
    expect(status.indexOf('declaredStateSql("status", "state")'))
      .toBeLessThan(status.indexOf('declaredStateSql("informal_status", "state")'));
  });

  /* Formalization is drawn as a mark and linked to a URL, and the two are
     separate upstream fields: at the pinned commit 604 problems are declared
     formalized and five carry a link. Deriving either from the other would
     invent one of the two numbers. */
  test("the Lean link is its own field, not the formalization flag", async () => {
    const source = await indexSource();
    expect(source).toContain('declaredStateSql("formal_status", "url")');
    expect(source).not.toContain("references");
  });

  /* The inner join to `claims` was the defect in one line: a Problem could not
     exist without a Claim, so 1,217 open questions were stored as accepted
     assertions. The Claim is now reached through the Source binding and is
     optional. */
  test("a Problem is anchored on the Source record and its Claim is optional", async () => {
    const source = await indexSource();
    expect(source).toContain("FROM projection.native_records n");
    expect(source).toContain("LEFT JOIN LATERAL");
    expect(source).not.toContain("f.claim_id = n.content ->> 'claim_id'");
    expect(source).not.toContain("f.imported_object_id=n.node_id");
    expect(source).toContain("reviewed_problem_occurrences");
    expect(source).toContain("occurrence.canonical_content_root = n.content_root");
    expect(source).toContain("occurrence.content_root = bound_native.content_root");
    const problemFrom = source.slice(
      source.indexOf("const PROBLEM_FROM"),
      source.indexOf("const sqlText", source.indexOf("const PROBLEM_FROM")),
    );
    expect(problemFrom).toContain("current_claim_count");
    expect(problemFrom).toContain("SELECT DISTINCT c.claim_id, c.claim_root, c.standing");
    expect(problemFrom).not.toContain("LIMIT 1");
  });

  test("the discovery catalogue has one bounded read model and no ledger facets", async () => {
    const source = await indexSource();
    const start = source.indexOf("export async function problemCatalogForRepository");
    const end = source.indexOf("/* Exported so the mapping", start);
    const catalog = source.slice(start, end);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    expect(catalog).toContain("Math.min(Math.max(input.limit ?? 5_000, 1), 5_000)");
    expect(catalog).toContain("limit + 1");
    expect(catalog).toContain("Promise.all([");
    expect(catalog).not.toContain("statusRows");
    expect(catalog).not.toContain("formalizationRows");
    expect(catalog).not.toContain("tagRows");
    expect(catalog).not.toContain("sourceRows]");
    expect(catalog).not.toContain("ProblemFacets");
  });

  test("the joined Problem reader carries each Claim's exact Verification rows", async () => {
    const source = await indexSource();
    const start = source.indexOf("export async function problemDetail");
    const end = source.indexOf("export async function allClaimRouteIds", start);
    const detail = source.slice(start, end);
    expect(detail).toContain("FROM projection.verifications verification");
    expect(detail).toContain("verification.proposal_id = ANY($3::text[])");
    expect(detail).toContain("verificationRows.filter((verification) => verification.proposal_id === review.proposal_id)");
    expect(detail).not.toContain("reviewRows.map((review) => reviewFromRow(review))");
  });
});
