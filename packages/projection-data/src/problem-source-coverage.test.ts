import { describe, expect, test } from "bun:test";
import { canonicalJson, sha256 } from "./canonical";
import {
  parseProblemResolutionConfig,
  problemResolutionConfig,
  type ProblemResolutionConfig,
} from "./problem-resolution";
import {
  MAX_PROBLEM_SOURCE_COVERAGE_ENTITIES,
  summarizeReviewedProblemSourceCoverage,
  type ProblemSourceCoverageSummaryInput,
} from "./problem-source-coverage";

const releaseRoot = sha256("coverage release");

function readsFor(config: ProblemResolutionConfig = problemResolutionConfig): ProblemSourceCoverageSummaryInput[] {
  const resolverRoot = sha256(canonicalJson(config));
  return config.entities.map((entity) => {
    const identities = [entity.canonical_occurrence, ...entity.reviewed_occurrences];
    return {
      release_root: releaseRoot,
      resolver_root: resolverRoot,
      semantics: { ...config.semantics },
      entity: {
        entity_id: entity.entity_id,
        resolution_namespace: entity.resolution_namespace,
        label: entity.label,
        problem_number: entity.problem_number,
        canonical_occurrence: { ...entity.canonical_occurrence },
        authority_effect: "none",
        identity_claim: "navigation_group_only",
      },
      resolution_namespace: entity.resolution_namespace,
      problem_number: entity.problem_number,
      coverage: config.candidate_sources
        .filter(({ resolution_namespace }) => resolution_namespace === entity.resolution_namespace)
        .map((source) => {
          const count = identities.filter(({ source_id }) => source_id === source.source_id).length;
          return {
            source_id: source.source_id,
            resolution_namespace: source.resolution_namespace,
            label: source.label,
            source_role: source.source_role,
            source_occurrences: count,
            reviewed_occurrences: count,
            statement_occurrences: source.statement_retention === "summary" ? count : 0,
          };
        }),
      candidate_limit: 250,
    };
  });
}

describe("reviewed Problem source coverage", () => {
  test("summarizes all reviewed entities and exact Source profiles without authority semantics", () => {
    const coverage = summarizeReviewedProblemSourceCoverage(readsFor());
    expect(coverage).toMatchObject({
      schema: "vela.problem-source-coverage-read.v1",
      release_root: releaseRoot,
      coverage_complete: true,
      semantics: {
        authority_effect: "none",
        entity_effect: "navigation_group_only",
        statement_identity: "not_established",
        equivalence: "not_established",
      },
    });
    expect(coverage.sources).toHaveLength(8);
    expect(coverage.problems.map(({ problem_number }) => problem_number)).toEqual([203, 264, 321, 521, 730]);
    expect(coverage.problems.find(({ problem_number }) => problem_number === 321)).toMatchObject({
      entity_id: "problem:erdos:321",
      reviewed_occurrence_count: 8,
      candidate_occurrence_count: 0,
      candidate_limit: 250,
    });
    expect(JSON.stringify(coverage)).not.toMatch(/standing|verification|decision|event/iu);
  });

  test("keeps equal numbers in separate reviewed resolver namespaces", () => {
    const root = sha256("synthetic identity");
    const config = parseProblemResolutionConfig({
      schema: "vela.problem-resolution.v1",
      semantics: problemResolutionConfig.semantics,
      candidate_sources: [
        {
          source_id: "source:math-catalog",
          resolution_namespace: "math-problems",
          label: "Math catalogue",
          source_role: "problem_catalog",
          native_kinds: ["problem"],
          number_extraction: { kind: "metadata_integer", key: "problem_number" },
          statement_retention: "none",
        },
        {
          source_id: "source:math-activity",
          resolution_namespace: "math-problems",
          label: "Math activity",
          source_role: "attributed_activity_catalog",
          native_kinds: ["activity"],
          number_extraction: { kind: "metadata_integer", key: "problem_number" },
          statement_retention: "none",
        },
        {
          source_id: "source:biology-catalog",
          resolution_namespace: "biology-questions",
          label: "Biology catalogue",
          source_role: "problem_catalog",
          native_kinds: ["question"],
          number_extraction: { kind: "metadata_integer", key: "problem_number" },
          statement_retention: "none",
        },
        {
          source_id: "source:biology-activity",
          resolution_namespace: "biology-questions",
          label: "Biology activity",
          source_role: "attributed_activity_catalog",
          native_kinds: ["experiment"],
          number_extraction: { kind: "metadata_integer", key: "problem_number" },
          statement_retention: "none",
        },
      ],
      entities: [
        {
          entity_id: "problem:math:17",
          resolution_namespace: "math-problems",
          label: "Math 17",
          problem_number: 17,
          canonical_occurrence: { source_id: "source:math-catalog", native_id: "math:17", native_kind: "problem", content_root: root },
          reviewed_occurrences: [{ source_id: "source:math-activity", native_id: "math-work:17", native_kind: "activity", content_root: root, relation_kind: "attributed_activity_reference" }],
        },
        {
          entity_id: "problem:biology:17",
          resolution_namespace: "biology-questions",
          label: "Biology 17",
          problem_number: 17,
          canonical_occurrence: { source_id: "source:biology-catalog", native_id: "biology:17", native_kind: "question", content_root: root },
          reviewed_occurrences: [{ source_id: "source:biology-activity", native_id: "experiment:17", native_kind: "experiment", content_root: root, relation_kind: "attributed_activity_reference" }],
        },
      ],
    });
    const inputs = readsFor(config).map((read) => ({
      ...read,
      resolver_root: sha256(canonicalJson(config)),
    }));
    const coverage = summarizeReviewedProblemSourceCoverage(inputs, config);
    expect(coverage.problems.map(({ entity_id, resolution_namespace, problem_number }) => ({ entity_id, resolution_namespace, problem_number }))).toEqual([
      { entity_id: "problem:math:17", resolution_namespace: "math-problems", problem_number: 17 },
      { entity_id: "problem:biology:17", resolution_namespace: "biology-questions", problem_number: 17 },
    ]);
    expect(coverage.problems[0]!.coverage.map(({ source_id }) => source_id).sort()).toEqual(["source:math-activity", "source:math-catalog"]);
    expect(coverage.problems[1]!.coverage.map(({ source_id }) => source_id).sort()).toEqual(["source:biology-activity", "source:biology-catalog"]);
  });

  test("refuses root drift, missing entities and unknown Source coverage", () => {
    const reads = readsFor();
    expect(() => summarizeReviewedProblemSourceCoverage(reads.slice(1))).toThrow(/exactly 5 reviewed entity reads/u);

    const drifted = structuredClone(reads);
    drifted[0]!.resolver_root = sha256("drifted resolver");
    expect(() => summarizeReviewedProblemSourceCoverage(drifted)).toThrow(/resolver drifted/u);

    const unknown = structuredClone(reads);
    unknown[0]!.coverage[0]!.source_id = "source:unknown";
    expect(() => summarizeReviewedProblemSourceCoverage(unknown)).toThrow(/unknown or drifted Source coverage|unprofiled Source/u);

    const oversized = structuredClone(problemResolutionConfig);
    while (oversized.entities.length <= MAX_PROBLEM_SOURCE_COVERAGE_ENTITIES) {
      const number = 1_000 + oversized.entities.length;
      const entity = structuredClone(oversized.entities[0]!);
      entity.entity_id = `problem:erdos:${number}`;
      entity.label = `Erdős ${number}`;
      entity.problem_number = number;
      entity.canonical_occurrence.native_id = `erdos:${number}`;
      entity.canonical_occurrence.content_root = sha256(`canonical ${number}`);
      entity.reviewed_occurrences = entity.reviewed_occurrences.map((occurrence, index) => ({
        ...occurrence,
        native_id: `Erdos${number}.reference_${index}`,
        content_root: sha256(`reference ${number}/${index}`),
      }));
      oversized.entities.push(entity);
    }
    expect(() => summarizeReviewedProblemSourceCoverage([], oversized)).toThrow(/24-entity bound/u);
  });
});
