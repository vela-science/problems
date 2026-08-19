import "server-only";
import { formalConjecturesCollection, problemDiscoveryConfig, repositoryRegistry } from "@vela/projection-data";
import type { PublishedProblemCollection } from "./problem-collections";

/* Public collection navigation follows explicit source profiles and declared
 * canonical namespaces. A source occurrence does not become a collection just
 * because it contains something problem-shaped, and a Repository name never
 * substitutes for the collection-local namespace. Keep this projection-backed
 * derivation server-only; clients receive the small serializable result. */
const repositoryCollections: PublishedProblemCollection[] = problemDiscoveryConfig.profiles
  .flatMap((profile) => repositoryRegistry.repositories.some(
    ({ canonical_problem_namespace }) => canonical_problem_namespace === profile.collection.key,
  ) ? [{ namespace: profile.collection.key, name: profile.collection.name }] : [])
  .filter((collection, index, collections) => (
    collections.findIndex(({ namespace }) => namespace === collection.namespace) === index
  ));

export const publishedProblemCollections: PublishedProblemCollection[] = [
  ...repositoryCollections.map((collection) => ({ ...collection, identifierKind: "number" as const })),
  {
    namespace: formalConjecturesCollection.collection_id,
    name: formalConjecturesCollection.name,
    identifierKind: "slug",
    recordLabels: Object.fromEntries(formalConjecturesCollection.data.items.map((item) => [item.route_slug, item.title])),
  },
];
