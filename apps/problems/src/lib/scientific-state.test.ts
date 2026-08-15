import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const cache = vi.hoisted(() => ({ calls: [] as unknown[][] }));
vi.mock("next/cache", () => ({
  unstable_cache: (reader: (...args: unknown[]) => unknown) => (...args: unknown[]) => {
    cache.calls.push(args);
    return reader(...args);
  },
}));

const reads = vi.hoisted(() => ({
  manifest: vi.fn(),
  repository: vi.fn(),
  detail: vi.fn(),
  sourceRead: vi.fn(),
  coverageRead: vi.fn(),
  corpusMapRead: vi.fn(),
  classify: vi.fn(),
  problemSlugs: vi.fn(),
  problems: vi.fn(),
  repositories: vi.fn(),
  sourceAudits: vi.fn(),
  publicRoute: vi.fn(),
}));

vi.mock("@vela/projection-data", () => ({
  projectionManifest: reads.manifest,
  projectionManifestAtRoot: reads.manifest,
  repositoryBySlug: reads.repository,
  problemDetail: reads.detail,
  nativeProblemSourceRead: reads.sourceRead,
  reviewedProblemSourceCoverageRead: reads.coverageRead,
  sourceCorpusMapRead: reads.corpusMapRead,
  classifyProblemDiscovery: reads.classify,
  problemRepositorySlugs: reads.problemSlugs,
  problemCatalogForRepository: reads.problems,
  problemsForRepository: vi.fn(),
  allRepositories: reads.repositories,
  formalConjecturesAuditRecordsForProblem: reads.sourceAudits,
  problemPublicRouteForLegacyPath: reads.publicRoute,
  /* Every Problem is addressed now, not only the reviewed ones. */
  canonicalProblemPath: (repository: string, problem: string) => (
    repository === "math" && /^[1-9][0-9]*$/u.test(problem)
      ? `/problems/erdos-problems/${problem}`
      : null
  ),
}));

import { bindReviewedProblemSourceCoverage, discoveredProblems, observedSourceCorpusMap, problemDiscoveryCollections, problemDiscoveryHubs, problemDiscoveryScopeQuery, problemSourceObservationCoverage, reviewedProblemSourceCoverage, scientificProblemState } from "./scientific-state";

const root = (digit: string) => `sha256:${digit.repeat(64)}`;

describe("Problems scientific state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cache.calls = [];
    reads.publicRoute.mockImplementation((pathname: string) => pathname === "/p/math/321" ? {
      canonical_path: "/problems/erdos-problems/321",
      entity_id: "problem:erdos:321",
    } : null);
    reads.manifest.mockResolvedValue({
      release_root: root("1"),
      generated_at: "2026-08-11T20:00:00Z",
      source_repositories: [{ repository_id: "repo:math", repository_root: root("2"), commit: "3".repeat(40), tree: "4".repeat(40) }],
    });
    reads.repository.mockResolvedValue({ status: { repository: { id: "repo:math", name: "Math" } } });
    reads.detail.mockResolvedValue({
      record: { node_id: "erdos:321", source_id: "source:erdos-problems", native_kind: "problem", problem: "321", statement: "A statement" },
      claims: [{ id: `vcl_${"5".repeat(64)}`, root: root("6"), standing: "accepted" }],
      current_claim_id: `vcl_${"5".repeat(64)}`,
      reviews: [],
    });
    reads.sourceRead.mockResolvedValue({
      resolution_namespace: "erdos-problems",
      problem_number: 321,
      canonical_record: { native_id: "erdos:321", native_kind: "problem", row_root: root("7"), observation_root: root("8"), locators: [{ url: "https://example.test/problem" }] },
      entity: {
        entity_id: "problem:erdos:321",
        canonical_occurrence: { source_id: "source:erdos-problems", native_id: "erdos:321", native_kind: "problem", content_root: root("9") },
      },
      occurrences: [], statements: [], relations: [], identity_events: [], coverage: [],
    });
    reads.coverageRead.mockResolvedValue({
      schema: "vela.problem-source-coverage-read.v1",
      release_root: root("1"),
      resolver_root: root("f"),
      semantics: {
        authority_effect: "none",
        entity_effect: "navigation_group_only",
        candidate_effect: "shared_namespace_and_source_number_only",
        statement_identity: "not_established",
        equivalence: "not_established",
      },
      coverage_complete: true,
      sources: [{ source_id: "source:erdos-problems", resolution_namespace: "erdos-problems", label: "Erdős Problems", source_role: "problem_catalog" }],
      problems: [{
        entity_id: "problem:erdos:321",
        entity_label: "Erdős 321",
        resolution_namespace: "erdos-problems",
        problem_number: 321,
        canonical_occurrence: { source_id: "source:erdos-problems", native_id: "erdos:321", native_kind: "problem", content_root: root("9") },
        occurrence_count: 2,
        reviewed_occurrence_count: 2,
        candidate_occurrence_count: 0,
        statement_occurrence_count: 1,
        candidate_limit: 250,
        coverage: [{ source_id: "source:erdos-problems", resolution_namespace: "erdos-problems", label: "Erdős Problems", source_role: "problem_catalog", source_occurrences: 1, reviewed_occurrences: 1, statement_occurrences: 0 }],
      }],
    });
    reads.corpusMapRead.mockResolvedValue({
      schema: "vela.source-corpus-map-read.v1",
      release_root: root("1"),
      profile_root: root("c"),
      semantics: {
        authority_effect: "none",
        identity_effect: "none",
        equivalence: "not_established",
        standing_effect: "none",
        classification_basis: "explicit_source_profile",
        record_count_effect: "inventory_only",
        source_values: "source_authored",
        unprofiled_sources: "inventory_only",
      },
      coverage_complete: true,
      inventory: {
        source_count: 1,
        observation_count: 1,
        observed_source_count: 1,
        unobserved_source_count: 0,
        native_record_count: 2,
        repository_binding_count: 0,
        source_kinds: [{ source_kind: "problem_collection", source_count: 1, native_record_count: 2 }],
        sources: [{
          source_id: "source:erdos-problems",
          source_kind: "problem_collection",
          declaration_root: root("d"),
          observation_root: root("8"),
          coverage_status: "complete",
          native_record_count: 2,
          repository_binding_count: 0,
        }],
      },
      corpora: [],
    });
    reads.sourceAudits.mockReturnValue([{ fixture_id: "conditional-erdos-321", authority_effect: "none" }]);
    reads.classify.mockImplementation((problem: { source_id: string; tags?: string[] }) => problem.source_id === "source:erdos-problems"
      ? {
        classification: "profiled",
        area: { key: "mathematics", name: "Mathematics" },
        collection: { key: "erdos-problems", name: "Erdős Problems" },
        field: null,
        topics: (problem.tags ?? []).map((key) => ({ key, name: key.replace(/\b\w/gu, (letter) => letter.toUpperCase()) })),
        hubs: [{ key: "erdos-problems", name: "Erdős Problems" }],
      }
      : { classification: "unclassified", area: null, collection: null, field: null, topics: [], hubs: [] });
    reads.problemSlugs.mockResolvedValue(["math"]);
    reads.repositories.mockResolvedValue([{ slug: "math", status: { repository: { name: "Math" } } }]);
    reads.problems.mockResolvedValue({
      total: 2,
      items: [
        { problem: "321", node_id: "erdos:321", native_kind: "problem", claim_id: `vcl_${"5".repeat(64)}`, source_id: "source:erdos-problems", statement: "A statement", declared_status: "solved", local_standing: "accepted", tags: ["number theory"], source_ids: ["source:erdos-problems"], source_count: 1 },
        { problem: "900", node_id: "erdos:900", native_kind: "problem", claim_id: null, source_id: "source:erdos-problems", statement: "Another statement", declared_status: "open", local_standing: null, tags: ["geometry"], source_ids: ["source:erdos-problems"], source_count: 2 },
      ],
    });
  });

  it("joins source audits only through the reviewed resolver namespace and Problem number", async () => {
    const state = await scientificProblemState("math", "321");
    expect(reads.sourceAudits).toHaveBeenCalledWith({
      resolution_namespace: "erdos-problems",
      problem_number: 321,
    });
    expect(state?.sourceAudits).toEqual([{ fixture_id: "conditional-erdos-321", authority_effect: "none" }]);
  });

  it("discovers Problems and flat Topic labels from exact projection rows", async () => {
    const problems = await discoveredProblems();
    expect(reads.problemSlugs).toHaveBeenCalledOnce();
    expect(cache.calls).toEqual([[root("1")]]);
    expect(reads.problems).toHaveBeenCalledWith("math", {
      root: root("1"),
      limit: 5_000,
    });
    expect(problems.map(({ repository, problem }) => `${repository}/${problem}`)).toEqual(["math/321", "math/900"]);
    expect(problems.find(({ problem }) => problem === "321")).toMatchObject({
      canonicalPath: "/problems/erdos-problems/321",
      publicEntityId: "problem:erdos:321",
      collection: { key: "erdos-problems", name: "Erdős Problems" },
      domain: { key: "mathematics", name: "Mathematics" },
      field: null,
      topics: [{ key: "number theory", name: "Number Theory" }],
      hubs: [{ key: "erdos-problems", name: "Erdős Problems" }],
      record: { declared_status: "solved", local_standing: "accepted" },
    });
    expect(problems.find(({ problem }) => problem === "900")).toMatchObject({ canonicalPath: "/problems/erdos-problems/900", field: null, topics: [{ key: "geometry", name: "Geometry" }], record: { local_standing: null } });
  });

  it("derives published collections with explicit Fields and flat Topics without promoting tag order", () => {
    const base = {
      problem: "1", field: null, topics: [{ key: "algebra", name: "Algebra" }], theme: "Algebra",
      collection: { key: "mathematics", name: "Mathematics" }, domain: { key: "mathematics", name: "Mathematics" }, hubs: [{ key: "source-math", name: "Source Math" }],
      record: { local_standing: null },
    } as unknown as Awaited<ReturnType<typeof discoveredProblems>>[number];
    const collections = problemDiscoveryCollections([
      { ...base, repository: "math" },
      { ...base, problem: "2", field: { key: "genetics", name: "Genetics" }, topics: [{ key: "genomics", name: "Genomics" }], repository: "biology", collection: { key: "biology", name: "Biology" }, domain: { key: "biology", name: "Biology" }, hubs: [{ key: "source-bio", name: "Source Bio" }], record: { local_standing: "accepted" } as typeof base.record },
    ]);
    expect(collections.map(({ key, name, repositories }) => ({ key, name, repositories }))).toEqual([
      { key: "biology", name: "Biology", repositories: ["biology"] },
      { key: "mathematics", name: "Mathematics", repositories: ["math"] },
    ]);
    expect(collections.flatMap(({ fields }) => fields.map(({ name }) => name))).toEqual(["Genetics"]);
    expect(collections.flatMap(({ topics }) => topics.map(({ name }) => name))).toEqual(["Genomics", "Algebra"]);
    expect(JSON.stringify(collections)).not.toContain("domain");

    const shared = problemDiscoveryCollections([
      { ...base, repository: "math" },
      { ...base, problem: "2", repository: "formal", record: { local_standing: null } as typeof base.record },
    ]);
    expect(shared).toHaveLength(1);
    expect(shared[0]).toMatchObject({ key: "mathematics", repositories: ["formal", "math"], problemCount: 2 });
    expect(() => problemDiscoveryCollections([
      base,
      { ...base, repository: "formal", problem: "2", collection: { key: "mathematics", name: "Conflicting name" } },
    ])).toThrow(/Collection mathematics has conflicting published names/u);
  });

  it("uses only the exact primary Source for opt-in Domain, Hub, and Topic ownership", async () => {
    reads.problems.mockResolvedValue({
      total: 1,
      items: [{
        problem: "321",
        claim_id: null,
        source_id: "source:unprofiled-catalog",
        source_ids: ["source:unprofiled-catalog", "source:erdos-problems"],
        declared_status: "open",
        local_standing: null,
        tags: ["number theory", "additive combinatorics"],
        source_count: 2,
      }],
    });
    const [problem] = await discoveredProblems();
    expect(problem).toMatchObject({
      domain: null,
      hubs: [],
      field: null,
      topics: [],
      theme: "Unclassified source topic",
    });
  });

  it("binds the reviewed coverage to routes only by canonical source occurrence identity", async () => {
    const coverage = await reviewedProblemSourceCoverage(discoveredProblems());
    expect(reads.coverageRead).toHaveBeenCalledWith({ root: root("1") });
    expect(coverage.problems).toEqual([
      expect.objectContaining({
        entity_id: "problem:erdos:321",
        route: "/problems/erdos-problems/321",
      }),
    ]);

    const wrongRelease = structuredClone(coverage);
    wrongRelease.release_root = root("e") as typeof wrongRelease.release_root;
    expect(() => bindReviewedProblemSourceCoverage(wrongRelease, [])).toThrow(/do not share one exact release/u);

    const catalog = await discoveredProblems();
    const sameNumberWrongIdentity = structuredClone(catalog);
    sameNumberWrongIdentity[0]!.record.node_id = "other:321";
    const exactCoverage = await reads.coverageRead.mock.results[0]!.value;
    expect(() => bindReviewedProblemSourceCoverage(exactCoverage, sameNumberWrongIdentity)).toThrow(/resolves to 0 public routes/u);
  });

  it("reads observed source corpora through the discovery catalogue's exact release only", async () => {
    const corpus = await observedSourceCorpusMap(discoveredProblems());
    expect(reads.corpusMapRead).toHaveBeenCalledWith({ root: root("1") });
    expect(corpus.release_root).toBe(root("1"));

    reads.corpusMapRead.mockResolvedValueOnce({ ...corpus, release_root: root("e") });
    await expect(observedSourceCorpusMap(discoveredProblems())).rejects.toThrow(/do not share one exact release/u);
    await expect(observedSourceCorpusMap(Promise.resolve([]))).rejects.toThrow(/require one exact discovery release/u);
  });

  it("binds primary-Source observation coverage without promoting it to Problem completeness", async () => {
    const catalog = await discoveredProblems();
    const corpus = await observedSourceCorpusMap(Promise.resolve(catalog));
    expect(problemSourceObservationCoverage(corpus, catalog)).toEqual(new Map([
      ["/problems/erdos-problems/321", "complete"],
      ["/problems/erdos-problems/900", "complete"],
    ]));

    expect(() => problemSourceObservationCoverage({ ...corpus, release_root: root("e") } as typeof corpus, catalog)).toThrow(/do not share one exact release/u);
    expect(() => problemSourceObservationCoverage({ ...corpus, inventory: { ...corpus.inventory, sources: [] } }, catalog)).toThrow(/absent from the complete source inventory/u);
  });

  it("refuses duplicate route identity instead of choosing one exact Source row", async () => {
    reads.problems.mockResolvedValue({
      total: 2,
      items: [
        { problem: "321", claim_id: null, source_id: "source:erdos-problems", source_ids: ["source:erdos-problems"], declared_status: "open", local_standing: null, tags: [], source_count: 1 },
        { problem: "321", claim_id: null, source_id: "source:other", source_ids: ["source:other"], declared_status: "open", local_standing: null, tags: [], source_count: 1 },
      ],
    });
    await expect(discoveredProblems()).rejects.toThrow(/ambiguous across exact source rows/u);
  });

  it("refuses an unbounded discovery corpus instead of fetching every page into memory", async () => {
    reads.problems.mockResolvedValue({ total: 5_001, items: [] });
    await expect(discoveredProblems()).rejects.toThrow(/5000-record catalog bound/u);
    expect(reads.problems).toHaveBeenCalledTimes(1);
  });

  it("keys Hubs by explicit identity and retains the complete hierarchy query", () => {
    const base = {
      repository: "math", problem: "321", collection: { key: "math", name: "Math" }, field: null, topics: [], theme: "Topic",
      domain: { key: "mathematics", name: "Mathematics" }, hubs: [{ key: "erdos", name: "Shared label" }],
      record: { local_standing: null },
    } as unknown as Awaited<ReturnType<typeof discoveredProblems>>[number];
    expect(() => problemDiscoveryHubs([
      base,
      { ...base, repository: "biology", problem: "321", domain: { key: "biology", name: "Biology" }, hubs: [{ key: "biology-hub", name: "Shared label" }] },
    ])).not.toThrow();
    expect(() => problemDiscoveryHubs([base, { ...base, hubs: [{ key: "erdos", name: "Conflicting label" }] }])).toThrow(/repeats Problem route|conflicting/u);
    expect(problemDiscoveryScopeQuery({ domain: "mathematics", hub: "erdos", collection: "math", field: "analytic", topic: "number-theory" })).toEqual({
      domain: "mathematics", hub: "erdos", collection: "math", field: "analytic", topic: "number-theory",
    });
  });

  it("composes an activity anchor only from exact Problems reads", async () => {
    const state = await scientificProblemState("math", "321");
    expect(reads.repository).toHaveBeenCalledWith("math", root("1"));
    expect(reads.detail).toHaveBeenCalledWith("math", "321", root("1"));
    expect(reads.sourceRead).toHaveBeenCalledWith(expect.objectContaining({ root: root("1"), sourceId: "source:erdos-problems", nativeId: "erdos:321", nativeKind: "problem" }));
    expect(state?.anchor).toEqual({
      projectionReleaseRoot: root("1"),
      repositoryId: "repo:math",
      repositoryRoot: root("2"),
      sourceCommit: "3".repeat(40),
      sourceTree: "4".repeat(40),
      problemId: "erdos:321",
      problemRecordRoot: root("7"),
      sourceObservationRoot: root("8"),
      claimId: `vcl_${"5".repeat(64)}`,
      claimRoot: root("6"),
      claimStanding: "accepted",
    });
  });
});
