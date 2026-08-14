import { canonicalJson, sha256, type HashRoot } from "./canonical";
import {
  occurrenceKey,
  problemResolutionConfig,
  type ProblemResolutionCandidateSource,
  type ProblemResolutionConfig,
  type ProblemSourceResolution,
} from "./problem-resolution";

export type ProblemSourceCoverageRow = {
  source_id: string;
  resolution_namespace: string;
  label: string;
  source_role: ProblemResolutionCandidateSource["source_role"];
  source_occurrences: number;
  reviewed_occurrences: number;
  statement_occurrences: number;
};

export type ProblemSourceCoverageSummaryInput = {
  release_root: HashRoot;
  resolver_root: HashRoot;
  semantics: ProblemSourceResolution["semantics"];
  entity: ProblemSourceResolution["entity"];
  resolution_namespace: string;
  problem_number: number;
  coverage: ProblemSourceCoverageRow[];
  candidate_limit: number;
};

export type ProblemSourceCoverageSummary = {
  schema: "vela.problem-source-coverage-read.v1";
  release_root: HashRoot;
  resolver_root: HashRoot;
  semantics: ProblemResolutionConfig["semantics"];
  coverage_complete: true;
  sources: Array<Pick<ProblemResolutionCandidateSource, "source_id" | "resolution_namespace" | "label" | "source_role">>;
  problems: Array<{
    entity_id: string;
    entity_label: string;
    resolution_namespace: string;
    problem_number: number;
    canonical_occurrence: NonNullable<ProblemSourceResolution["entity"]>["canonical_occurrence"];
    occurrence_count: number;
    reviewed_occurrence_count: number;
    candidate_occurrence_count: number;
    statement_occurrence_count: number;
    candidate_limit: number;
    coverage: ProblemSourceCoverageRow[];
  }>;
};

export const MAX_PROBLEM_SOURCE_COVERAGE_ENTITIES = 24;
export const MAX_PROBLEM_SOURCE_COVERAGE_SOURCES = 24;

export function assertProblemSourceCoverageBounds(config: ProblemResolutionConfig): void {
  if (config.entities.length > MAX_PROBLEM_SOURCE_COVERAGE_ENTITIES) {
    throw new Error(`Problem source coverage exceeds the reviewed ${MAX_PROBLEM_SOURCE_COVERAGE_ENTITIES}-entity bound`);
  }
  if (config.candidate_sources.length > MAX_PROBLEM_SOURCE_COVERAGE_SOURCES) {
    throw new Error(`Problem source coverage exceeds the reviewed ${MAX_PROBLEM_SOURCE_COVERAGE_SOURCES}-Source bound`);
  }
}

function assertCount(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be a nonnegative safe integer`);
}

/**
 * Builds one exact, untruncated overview from successful bounded Problem-source
 * reads. It refuses missing entities, unknown Source profiles, root drift and
 * incomplete coverage rather than turning partial source data into a chart.
 * Equal numbers in different resolver namespaces remain distinct entities.
 */
export function summarizeReviewedProblemSourceCoverage(
  reads: ProblemSourceCoverageSummaryInput[],
  config: ProblemResolutionConfig = problemResolutionConfig,
): ProblemSourceCoverageSummary {
  assertProblemSourceCoverageBounds(config);
  if (reads.length !== config.entities.length) {
    throw new Error(`Problem source coverage requires exactly ${config.entities.length} reviewed entity reads`);
  }
  const resolverRoot = sha256(canonicalJson(config));
  const semanticRoot = sha256(canonicalJson(config.semantics));
  const releaseRoots = new Set(reads.map(({ release_root }) => release_root));
  if (releaseRoots.size !== 1) throw new Error("Problem source coverage reads span multiple projection releases");

  const readsByEntity = new Map<string, ProblemSourceCoverageSummaryInput>();
  for (const read of reads) {
    if (!read.entity) throw new Error("Problem source coverage cannot include an unreviewed Problem");
    if (readsByEntity.has(read.entity.entity_id)) throw new Error(`Problem source coverage repeats entity ${read.entity.entity_id}`);
    if (read.resolver_root !== resolverRoot || sha256(canonicalJson(read.semantics)) !== semanticRoot) {
      throw new Error(`Problem source coverage resolver drifted for ${read.entity.entity_id}`);
    }
    readsByEntity.set(read.entity.entity_id, read);
  }

  const namespaces = new Set(config.entities.map(({ resolution_namespace }) => resolution_namespace));
  const sources = config.candidate_sources
    .filter(({ resolution_namespace }) => namespaces.has(resolution_namespace))
    .map(({ source_id, resolution_namespace, label, source_role }) => ({ source_id, resolution_namespace, label, source_role }));

  const problems = config.entities.map((expected) => {
    const read = readsByEntity.get(expected.entity_id);
    if (!read?.entity) throw new Error(`Problem source coverage is missing reviewed entity ${expected.entity_id}`);
    if (
      read.resolution_namespace !== expected.resolution_namespace
      || read.problem_number !== expected.problem_number
      || read.entity.resolution_namespace !== expected.resolution_namespace
      || read.entity.problem_number !== expected.problem_number
      || read.entity.label !== expected.label
      || occurrenceKey(read.entity.canonical_occurrence) !== occurrenceKey(expected.canonical_occurrence)
      || read.entity.canonical_occurrence.content_root !== expected.canonical_occurrence.content_root
    ) {
      throw new Error(`Problem source coverage identity drifted for ${expected.entity_id}`);
    }
    if (!Number.isSafeInteger(read.candidate_limit) || read.candidate_limit < 1) {
      throw new Error(`Problem source coverage candidate bound is invalid for ${expected.entity_id}`);
    }

    const expectedSources = config.candidate_sources.filter(({ resolution_namespace }) => resolution_namespace === expected.resolution_namespace);
    if (read.coverage.length !== expectedSources.length) {
      throw new Error(`Problem source coverage is incomplete for ${expected.entity_id}`);
    }
    const coverageBySource = new Map(read.coverage.map((coverage) => [coverage.source_id, coverage]));
    if (coverageBySource.size !== read.coverage.length) {
      throw new Error(`Problem source coverage repeats Source coverage for ${expected.entity_id}`);
    }
    const coverage = expectedSources.map((profile) => {
      const value = coverageBySource.get(profile.source_id);
      if (
        !value
        || value.resolution_namespace !== profile.resolution_namespace
        || value.label !== profile.label
        || value.source_role !== profile.source_role
      ) {
        throw new Error(`Problem source coverage has unknown or drifted Source coverage for ${expected.entity_id}/${profile.source_id}`);
      }
      assertCount(value.source_occurrences, `${expected.entity_id}/${profile.source_id} occurrence count`);
      assertCount(value.reviewed_occurrences, `${expected.entity_id}/${profile.source_id} reviewed count`);
      assertCount(value.statement_occurrences, `${expected.entity_id}/${profile.source_id} statement count`);
      if (value.reviewed_occurrences > value.source_occurrences || value.statement_occurrences > value.source_occurrences) {
        throw new Error(`Problem source coverage exceeds exact occurrences for ${expected.entity_id}/${profile.source_id}`);
      }
      return { ...value };
    });
    if ([...coverageBySource].some(([sourceId]) => !expectedSources.some(({ source_id }) => source_id === sourceId))) {
      throw new Error(`Problem source coverage includes an unprofiled Source for ${expected.entity_id}`);
    }

    const occurrenceCount = coverage.reduce((sum, value) => sum + value.source_occurrences, 0);
    const reviewedOccurrenceCount = coverage.reduce((sum, value) => sum + value.reviewed_occurrences, 0);
    const statementOccurrenceCount = coverage.reduce((sum, value) => sum + value.statement_occurrences, 0);
    return {
      entity_id: expected.entity_id,
      entity_label: expected.label,
      resolution_namespace: expected.resolution_namespace,
      problem_number: expected.problem_number,
      canonical_occurrence: { ...expected.canonical_occurrence },
      occurrence_count: occurrenceCount,
      reviewed_occurrence_count: reviewedOccurrenceCount,
      candidate_occurrence_count: occurrenceCount - reviewedOccurrenceCount,
      statement_occurrence_count: statementOccurrenceCount,
      candidate_limit: read.candidate_limit,
      coverage,
    };
  });

  return {
    schema: "vela.problem-source-coverage-read.v1",
    release_root: reads[0]!.release_root,
    resolver_root: resolverRoot,
    semantics: { ...config.semantics },
    coverage_complete: true,
    sources,
    problems,
  };
}
