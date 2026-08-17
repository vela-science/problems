import type { MetadataRoute } from "next";
import { allClaimRouteIds, allRepositories, allProblemRouteIds, canonicalProblemPath, mathSourceRegistryRead, projectionManifest, slugForRepositoryId } from "@vela/projection-data";

const base = "https://problems.science";
export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [repositories, release, claims, problems, sources] = await Promise.all([allRepositories(), projectionManifest(), allClaimRouteIds(), allProblemRouteIds(), mathSourceRegistryRead({ includeRecords: false, limit: 1 })]);
  const routes = [
    "/",
    "/problems",
    "/problems/erdos-problems",
    "/contribute",
    "/hubs",
    "/activity",
    "/repositories",
    "/graph",
    "/proposals",
    "/decisions",
    "/search",
    "/sources",
    ...repositories.flatMap((repository) => {
      const root = `/repositories/${repository.slug}`;
      return [
        root,
        ...(repository.graph ? [`${root}/graph`] : []),
        `${root}/claims`,
        `${root}/contribute`,
        `${root}/proposals`,
        `${root}/reproduce`,
      ];
    }),
    /* `repository` here is the `repository_id`, and the roots above are built
       from `slug` — so the sitemap advertised both addresses for one
       Repository and asked a crawler to index the UUID form of every Claim.
       One canonical address, the handle the app links. */
    ...claims
      .map(({ repository, id }) => {
        const slug = slugForRepositoryId(repository);
        return slug ? `/repositories/${slug}/claims/${id}` : null;
      })
      .filter((path): path is string => path !== null),
    /* One address per Problem. The Repository-scoped record view is a
       different page about the same Problem, so listing both asked a crawler
       to index two URLs for one record; that view now declares the canonical
       address instead of competing with it. */
    ...problems.map(({ repository, problem }) => canonicalProblemPath(repository, problem)).filter((path): path is string => path !== null),
    ...sources.sources.map(({ declaration }) => `/sources/${encodeURIComponent(declaration.source_id)}`),
  ];

  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(release.generated_at),
    changeFrequency: "weekly",
    priority: route === "/" ? 1 : route === "/problems" ? 0.9 : route === "/problems/erdos-problems" ? 0.85 : route.startsWith("/repositories/") ? 0.8 : 0.6,
  }));
}
