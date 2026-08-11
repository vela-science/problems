import "server-only";

import {
  mathSourceRegistryRead,
  observatoryProjectionManifest,
  problemDetail,
  repositoryBySlug,
} from "@vela/observatory-data";

export const featuredProblems = [
  { repository: "math", problem: "203", dossier: "erdos-203", dossierRepository: "erdos", theme: "Exact bounded obstruction" },
  { repository: "math", problem: "264", dossier: "erdos-264", dossierRepository: "erdos", theme: "Correction and proof repair" },
  { repository: "math", problem: "321", dossier: "erdos-321", dossierRepository: "math", theme: "Source translation and semantic diff" },
  { repository: "math", problem: "521", dossier: "erdos-521", dossierRepository: "formal-conjectures", theme: "Formal proof qualification" },
  { repository: "math", problem: "730", dossier: "erdos-730", dossierRepository: "erdos", theme: "External proof boundary" },
] as const;

export type ScientificProblemState = Awaited<ReturnType<typeof scientificProblemState>>;

export async function scientificProblemState(repositorySlug: string, problemNumber: string) {
  const [manifest, repository, detail] = await Promise.all([
    observatoryProjectionManifest(),
    repositoryBySlug(repositorySlug),
    problemDetail(repositorySlug, problemNumber),
  ]);
  if (!repository || !detail) return null;
  const sourceRead = await mathSourceRegistryRead({
    root: manifest.release_root,
    nativeId: detail.record.node_id,
    nativeKind: "problem",
    includeRecords: true,
    limit: 2,
  });
  const sourceRecords = sourceRead.native_records.filter((record) => (
    record.native_id === detail.record.node_id && record.native_kind === "problem"
  ));
  if (sourceRecords.length !== 1) {
    throw new Error(`Problem ${repositorySlug}/${problemNumber} has ${sourceRecords.length} exact source records`);
  }
  const source = sourceRecords[0];
  const projectedRepository = manifest.source_repositories.find(
    (entry) => entry.repository_id === repository.status.repository.id,
  );
  if (!projectedRepository) throw new Error(`Repository ${repositorySlug} is absent from the exact projection manifest`);
  const claim = detail.claims[0] ?? null;
  const locator = source.locators.find((entry) => entry.url)?.url ?? null;

  return {
    repositorySlug,
    repositoryName: repository.status.repository.name,
    repository,
    problem: detail.record,
    claims: detail.claims,
    offers: detail.offers,
    reviews: detail.reviews,
    source,
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
