import "server-only";

import { unstable_cache } from "next/cache";

import {
  allRepositories,
  classifyProblemDiscovery,
  commitsForRepository,
  formalConjecturesAuditRecordsForProblem,
  nativeProblemSourceRead,
  projectionManifest,
  projectionManifestAtRoot,
  problemRepositorySlugs,
  problemCatalogForRepository,
  problemDetail,
  problemPublicRouteForCanonicalPath,
  canonicalProblemPath,
  reviewedProblemSourceCoverageRead,
  repositoryBySlug,
  sourceCorpusMapRead,
  type ProblemRecord,
  type ProblemSourceCoverageSummary,
  type SourceCorpusMapRead,
} from "@vela/projection-data";


export type ProblemDiscovery = {
  releaseRoot: string;
  repository: string;
  collection: { key: string; name: string } | null;
  problem: string;
  /* Null only for an address this release cannot compute; callers link
     conditionally rather than emitting a path that resolves to nothing. */
  canonicalPath: string | null;
  publicEntityId?: string;
  domain: { key: string; name: string } | null;
  /** Explicit taxonomy only. Erdős declares no Field, so this is null. */
  field: { key: string; name: string } | null;
  /** Flat, unordered source-native subject vocabulary presented as Topics. */
  topics: Array<{ key: string; name: string }>;
  hubs: Array<{ key: string; name: string }>;
  theme: string;
  record: ProblemRecord;
};

export type ReviewedProblemSourceCoverage = Omit<ProblemSourceCoverageSummary, "problems"> & {
  problems: Array<ProblemSourceCoverageSummary["problems"][number] & {
    route: string;
  }>;
};

export type ObservedSourceCorpusMap = SourceCorpusMapRead;

export type ProblemSourceObservationCoverage = "complete" | "partial" | "unobserved";

/**
 * Binds each discovered Problem to the observation coverage declared by its
 * primary Source in the same immutable projection release. Coverage describes
 * the Source observation only. It never describes Problem completeness,
 * correctness, identity, or Standing.
 */
export function problemSourceObservationCoverage(
  corpus: ObservedSourceCorpusMap,
  catalog: ProblemDiscovery[],
): Map<string, ProblemSourceObservationCoverage> {
  const catalogRoots = new Set(catalog.map(({ releaseRoot }) => releaseRoot));
  if (catalogRoots.size !== 1 || !catalogRoots.has(corpus.release_root)) {
    throw new Error("Problem source observation coverage and discovery catalog do not share one exact release");
  }
  const bySource = new Map<string, ProblemSourceObservationCoverage>();
  for (const source of corpus.inventory.sources) {
    if (bySource.has(source.source_id)) {
      throw new Error(`Problem source observation coverage repeats Source ${source.source_id}`);
    }
    bySource.set(source.source_id, source.coverage_status);
  }
  const byRoute = new Map<string, ProblemSourceObservationCoverage>();
  for (const problem of catalog) {
    /* Keyed by the address a reader uses. A Problem this release cannot
       address has no key and no row to key. */
    const route = problem.canonicalPath;
    if (!route) continue;
    const coverage = bySource.get(problem.record.source_id);
    if (!coverage) {
      throw new Error(`Problem ${route} primary Source ${problem.record.source_id} is absent from the complete source inventory`);
    }
    if (byRoute.has(route)) {
      throw new Error(`Problem source observation coverage repeats public route ${route}`);
    }
    byRoute.set(route, coverage);
  }
  return byRoute;
}

function exactReviewedProblemMatches(coverage: ProblemSourceCoverageSummary, catalog: ProblemDiscovery[]) {
  const catalogRoots = new Set(catalog.map(({ releaseRoot }) => releaseRoot));
  if (catalogRoots.size !== 1 || !catalogRoots.has(coverage.release_root)) {
    throw new Error("Reviewed Problem source coverage and discovery catalog do not share one exact release");
  }
  return coverage.problems.map((problem) => {
    const matches = catalog.filter(({ record }) => (
      record.source_id === problem.canonical_occurrence.source_id
      && record.node_id === problem.canonical_occurrence.native_id
      && record.native_kind === problem.canonical_occurrence.native_kind
    ));
    if (matches.length !== 1) {
      throw new Error(`Reviewed Problem source coverage canonical occurrence ${problem.entity_id} resolves to ${matches.length} public routes`);
    }
    return { problem, match: matches[0]! };
  });
}

/**
 * Reads source inventory and discovery from one immutable projection release.
 * The catalogue supplies only the exact root; source-native corpus records are
 * not joined to or promoted into public Problem identities.
 */
export async function observedSourceCorpusMap(
  catalogPromise: Promise<ProblemDiscovery[]> = discoveredProblems(),
): Promise<ObservedSourceCorpusMap> {
  const catalog = await catalogPromise;
  const roots = new Set(catalog.map(({ releaseRoot }) => releaseRoot));
  if (roots.size !== 1) throw new Error("Observed source corpora require one exact discovery release");
  const root = [...roots][0]!;
  const corpus = await sourceCorpusMapRead({ root });
  if (corpus.release_root !== root) {
    throw new Error("Observed source corpora and discovery catalog do not share one exact release");
  }
  return corpus;
}

/**
 * Joins a reviewed resolver entity to its public Problem route only through the
 * exact canonical source occurrence. Problem numbers are never used as
 * identity. Missing, duplicate or cross-release joins refuse.
 */
export function bindReviewedProblemSourceCoverage(
  coverage: ProblemSourceCoverageSummary,
  catalog: ProblemDiscovery[],
): ReviewedProblemSourceCoverage {
  return {
    ...coverage,
    problems: exactReviewedProblemMatches(coverage, catalog).map(({ problem }) => {
      return {
        ...problem,
        route: `/problems/${problem.resolution_namespace}/${problem.problem_number}`,
      };
    }),
  };
}

export async function reviewedProblemSourceCoverage(
  catalogPromise: Promise<ProblemDiscovery[]> = discoveredProblems(),
): Promise<ReviewedProblemSourceCoverage> {
  const catalog = await catalogPromise;
  const roots = new Set(catalog.map(({ releaseRoot }) => releaseRoot));
  if (roots.size !== 1) throw new Error("Reviewed Problem source coverage requires one exact discovery release");
  const coverage = await reviewedProblemSourceCoverageRead({ root: [...roots][0]! });
  return bindReviewedProblemSourceCoverage(coverage, catalog);
}

export type ProblemDiscoveryTopic = {
  key: string;
  name: string;
  problemCount: number;
  localStanding: number;
};

export type ProblemDiscoveryCollection = {
  key: string;
  name: string;
  repositories: string[];
  problemCount: number;
  localStanding: number;
  fields: Array<{ key: string; name: string; problemCount: number }>;
  topics: ProblemDiscoveryTopic[];
};

export type ProblemDiscoveryHub = {
  key: string;
  name: string;
  domain: { key: string; name: string };
  problems: ProblemDiscovery[];
};

export function problemDiscoveryHubs(catalog: ProblemDiscovery[]): ProblemDiscoveryHub[] {
  const hubs = new Map<string, ProblemDiscoveryHub>();
  for (const problem of catalog) for (const hub of problem.hubs) {
    if (!problem.domain) throw new Error(`Profiled Hub ${hub.key} has no explicit scientific area`);
    const current = hubs.get(hub.key);
    if (current && (current.name !== hub.name || current.domain.key !== problem.domain.key)) {
      throw new Error(`Hub ${hub.key} has conflicting explicit discovery semantics`);
    }
    const route = `${problem.repository}/${problem.problem}`;
    if (current?.problems.some((entry) => `${entry.repository}/${entry.problem}` === route)) {
      throw new Error(`Hub ${hub.key} repeats Problem route ${route}`);
    }
    hubs.set(hub.key, {
      key: hub.key,
      name: hub.name,
      domain: problem.domain,
      problems: [...(current?.problems ?? []), problem],
    });
  }
  return [...hubs.values()].sort((left, right) => left.name.localeCompare(right.name) || left.key.localeCompare(right.key));
}

export function problemDiscoveryScopeQuery(scope: {
  domain?: string;
  hub?: string;
  collection?: string;
  field?: string;
  topic?: string;
}) {
  return {
    ...(scope.domain && scope.domain !== "all" ? { domain: scope.domain } : {}),
    ...(scope.hub && scope.hub !== "all" ? { hub: scope.hub } : {}),
    ...(scope.collection && scope.collection !== "all" ? { collection: scope.collection } : {}),
    ...(scope.field && scope.field !== "all" ? { field: scope.field } : {}),
    ...(scope.topic && scope.topic !== "all" ? { topic: scope.topic } : {}),
  };
}

/** A presentation index over exact projection facts. Repository metadata owns
 * collections only after the source declaration explicitly covers that
 * Repository. A Field exists only where a source profile explicitly owns one;
 * source-native tags remain one flat Topic vocabulary. Neither
 * layer invents a taxonomy or carries scientific authority. */
export function problemDiscoveryCollections(catalog: ProblemDiscovery[]): ProblemDiscoveryCollection[] {
  const collections = new Map<string, { name: string; problems: ProblemDiscovery[]; repositories: Set<string> }>();
  const routes = new Set<string>();
  for (const problem of catalog) {
    const route = `${problem.repository}/${problem.problem}`;
    if (routes.has(route)) throw new Error(`Problem discovery route ${route} is ambiguous across exact source rows`);
    routes.add(route);
    const key = problem.collection?.key ?? "unclassified";
    const name = problem.collection?.name ?? "Unclassified";
    const current = collections.get(key);
    if (current && current.name !== name) {
      throw new Error(`Collection ${key} has conflicting published names`);
    }
    collections.set(key, {
      name,
      problems: [...(current?.problems ?? []), problem],
      repositories: new Set([...(current?.repositories ?? []), problem.repository]),
    });
  }
  return [...collections.entries()].map(([key, collection]) => {
    const fields = new Map<string, { name: string; problems: ProblemDiscovery[] }>();
    const topics = new Map<string, { name: string; problems: ProblemDiscovery[] }>();
    for (const problem of collection.problems) {
      if (problem.field) {
        const current = fields.get(problem.field.key);
        if (current && current.name !== problem.field.name) throw new Error(`Field ${problem.field.key} has conflicting labels`);
        fields.set(problem.field.key, { name: problem.field.name, problems: [...(current?.problems ?? []), problem] });
      }
      for (const topic of problem.topics) {
        const current = topics.get(topic.key);
        if (current && current.name !== topic.name) throw new Error(`Topic ${topic.key} has conflicting labels`);
        topics.set(topic.key, { name: topic.name, problems: [...(current?.problems ?? []), problem] });
      }
    }
    return {
      key,
      name: collection.name,
      repositories: [...collection.repositories].sort(),
      problemCount: collection.problems.length,
      localStanding: collection.problems.filter((problem) => problem.record.local_standing).length,
      fields: [...fields.entries()].map(([key, field]) => ({ key, name: field.name, problemCount: field.problems.length }))
        .sort((left, right) => right.problemCount - left.problemCount || left.name.localeCompare(right.name)),
      topics: [...topics.entries()].map(([key, topic]) => ({
        key,
        name: topic.name,
        problemCount: topic.problems.length,
        localStanding: topic.problems.filter((problem) => problem.record.local_standing).length,
      })).sort((left, right) => right.problemCount - left.problemCount || left.name.localeCompare(right.name)),
    };
  }).sort((left, right) => right.problemCount - left.problemCount || left.name.localeCompare(right.name));
}

/** Projection-backed Problem discovery. */
const MAX_DISCOVERY_REPOSITORIES = 64;
const MAX_DISCOVERY_PROBLEMS = 5_000;

async function discoveredProblemsAtRoot(root: string): Promise<ProblemDiscovery[]> {
  const slugs = await problemRepositorySlugs(root);
  if (slugs.length > MAX_DISCOVERY_REPOSITORIES) {
    throw new Error(`Problem discovery exceeds the reviewed ${MAX_DISCOVERY_REPOSITORIES}-Repository catalog bound`);
  }
  const repositories: ProblemDiscovery[][] = [];
  let catalogCount = 0;
  for (const repository of slugs) {
    const [site, result] = await Promise.all([
      repositoryBySlug(repository, root),
      /* One exact, bounded catalogue read. `problemsForRepository`'s ordinary
         250-row pages include four facet aggregations for the Repository ledger;
         repeating those five times was the 12–14 second /problems hot path. */
      problemCatalogForRepository(repository, {
        root,
        limit: MAX_DISCOVERY_PROBLEMS,
      }),
    ]);
    catalogCount += result.total;
    if (catalogCount > MAX_DISCOVERY_PROBLEMS) {
      throw new Error(`Problem discovery exceeds the reviewed ${MAX_DISCOVERY_PROBLEMS}-record catalog bound`);
    }
    if (result.items.length !== result.total) {
      throw new Error(`Problem discovery catalogue read truncated ${repository} at ${result.items.length} of ${result.total} records`);
    }
    if (!site) throw new Error(`Published Problem collection ${repository} is missing exact Repository metadata`);
    repositories.push(result.items.map((problem) => {
      const profile = classifyProblemDiscovery(problem);
      const topics = profile.topics;
      return {
        releaseRoot: root,
        repository,
        collection: profile.collection,
        problem: problem.problem,
        canonicalPath: canonicalProblemPath(repository, problem.problem),
        domain: profile.area,
        field: profile.field,
        topics,
        hubs: profile.hubs,
        theme: topics.map(({ name }) => name).join(" · ") || "Unclassified source topic",
        record: problem,
      };
    }));
  }
  const catalog = repositories.flat();
  const routes = new Set<string>();
  for (const problem of catalog) {
    const route = `${problem.repository}/${problem.problem}`;
    if (routes.has(route)) throw new Error(`Problem discovery route ${route} is ambiguous across exact source rows`);
    routes.add(route);
  }
  /* The address every Problem row links to.
   *
   * This overlaid a canonical path only where the route table held a reviewed
   * entity — six of 1,217 — and left the rest on the retired
   * `/p/{repository}/{number}` form. So the release published a sitemap of
   * canonical addresses while the directory, Home and the Hub map all emitted
   * the retired one, and a reader copying a row's URL copied a redirect. The
   * path is computed for every Problem now; the reviewed entity is still
   * carried where one exists, because it is what the record page checks
   * against. */
  return catalog.map((problem) => {
    /* Looked up by the retired address, for all 1,217 Problems, on every
       catalogue build. The canonical path is already on the row. */
    const route = problem.canonicalPath ? problemPublicRouteForCanonicalPath(problem.canonicalPath) : null;
    return {
      ...problem,
      ...(route ? { publicEntityId: route.entity_id } : {}),
    };
  }).sort((left, right) => left.repository.localeCompare(right.repository)
    || left.problem.localeCompare(right.problem, undefined, { numeric: true }));
}

/* The release root is part of Next's cache key. The projection rows are
   immutable under that root, so navigation and separate serverless instances
   can reuse the assembled catalogue without risking pointer drift. */
const cachedDiscoveredProblemsAtRoot = unstable_cache(
  discoveredProblemsAtRoot,
  ["problems-problem-discovery-v1"],
  { revalidate: 3_600 },
);

export async function discoveredProblems(): Promise<ProblemDiscovery[]> {
  const root = (await projectionManifest()).release_root;
  return cachedDiscoveredProblemsAtRoot(root);
}

export type ScientificProblemState = Awaited<ReturnType<typeof scientificProblemState>>;

export async function featuredProblemStates() {
  const discovered = await discoveredProblems();
  return Promise.all(discovered.slice(0, 12).map(async (feature) => ({
    feature,
    state: await scientificProblemState(feature.repository, feature.problem, feature.releaseRoot),
  })));
}


export async function recentScientificChanges(limit = 8) {
  const repositories = await allRepositories();
  const histories = await Promise.all(repositories.map(async (repository) => ({
    repository: { slug: repository.slug, name: repository.status.repository.name },
    history: await commitsForRepository(repository.slug, { limit }),
  })));
  return histories.flatMap(({ repository, history }) => history.items.map((commit) => ({
    repository,
    commit,
  }))).sort((left, right) => right.commit.committed_at.localeCompare(left.commit.committed_at)).slice(0, limit);
}

async function scientificProblemStateAtRoot(repositorySlug: string, problemNumber: string, root: string) {
  const manifest = await projectionManifestAtRoot(root);
  const [repository, detail] = await Promise.all([
    repositoryBySlug(repositorySlug, manifest.release_root),
    problemDetail(repositorySlug, problemNumber, manifest.release_root),
  ]);
  if (!repository || !detail) return null;
  const sources = await nativeProblemSourceRead({
    root: manifest.release_root,
    sourceId: detail.record.source_id,
    nativeId: detail.record.node_id,
    nativeKind: detail.record.native_kind,
  });
  if (!sources) throw new Error(`Problem ${repositorySlug}/${problemNumber} has no exact source record`);
  const source = sources.canonical_record;
  const projectedRepository = manifest.source_repositories.find(
    (entry) => entry.repository_id === repository.status.repository.id,
  );
  if (!projectedRepository) throw new Error(`Repository ${repositorySlug} is absent from the exact projection manifest`);
  const claim = detail.claims.find(({ id }) => id === detail.current_claim_id) ?? null;
  const locator = source.locators.find((entry) => entry.url)?.url ?? null;
  const sourceAudits = formalConjecturesAuditRecordsForProblem({
    resolution_namespace: sources.resolution_namespace,
    problem_number: sources.problem_number,
  });

  return {
    repositorySlug,
    repositoryName: repository.status.repository.name,
    repository,
    problem: detail.record,
    claims: detail.claims,
    currentClaimId: detail.current_claim_id,
    reviews: detail.reviews,
    source,
    sources,
    sourceAudits,
    locator,
    anchor: {
      repositoryId: repository.status.repository.id,
      repositoryRoot: projectedRepository.repository_root,
      sourceCommit: projectedRepository.commit,
      sourceTree: projectedRepository.tree,
      problemId: detail.record.node_id,
      problemRecordRoot: source.row_root,
      sourceObservationRoot: source.observation_root,
      claimId: claim?.id ?? null,
      claimRoot: claim?.root ?? null,
      claimStanding: claim?.standing ?? null,
      projectionReleaseRoot: manifest.release_root,
    },
  };
}

const cachedScientificProblemStateAtRoot = unstable_cache(
  scientificProblemStateAtRoot,
  ["problems-scientific-problem-state-v1"],
  { revalidate: 3_600 },
);

export async function scientificProblemState(repositorySlug: string, problemNumber: string, requestedRoot?: string) {
  const root = requestedRoot
    ? (await projectionManifestAtRoot(requestedRoot)).release_root
    : (await projectionManifest()).release_root;
  return cachedScientificProblemStateAtRoot(repositorySlug, problemNumber, root);
}
