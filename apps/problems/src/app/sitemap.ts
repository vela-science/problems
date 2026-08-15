import type { MetadataRoute } from "next";
import { allClaimRouteIds, allRepositories, allProblemRouteIds, canonicalProblemPath, mathSourceRegistryRead, projectionManifest } from "@vela/projection-data";

const base = "https://problems.science";
export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [repositories, release, claims, problems, sources] = await Promise.all([allRepositories(), projectionManifest(), allClaimRouteIds(), allProblemRouteIds(), mathSourceRegistryRead({ includeRecords: false, limit: 1 })]);
  const routes = [
    "/",
    "/problems",
    "/work",
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
    ...claims.map(({ repository, id }) => `/repositories/${repository}/claims/${id}`),
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
    priority: route === "/" ? 1 : route === "/problems" ? 0.9 : route.startsWith("/repositories/") ? 0.8 : 0.6,
  }));
}
