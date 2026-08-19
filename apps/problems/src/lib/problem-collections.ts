export type PublishedProblemCollection = {
  namespace: string;
  name: string;
  identifierKind?: "number" | "slug";
  recordLabels?: Record<string, string>;
};

export function problemCollectionForPath(
  href: string,
  collections: PublishedProblemCollection[],
): (PublishedProblemCollection & { problem?: string }) | null {
  const match = href.match(/^\/problems\/([^/?#]+)(?:\/([^/?#]+))?(?:[?#]|$)/u);
  if (!match?.[1]) return null;
  const collection = collections.find(({ namespace }) => namespace === match[1]);
  if (!collection || (match[2] && collection.identifierKind !== "slug" && !/^[1-9][0-9]*$/u.test(match[2]))) return null;
  return { ...collection, ...(match[2] ? { problem: match[2] } : {}) };
}

export function problemCollectionRecordLabel(collection: PublishedProblemCollection & { problem?: string }): string {
  if (!collection.problem) return collection.name;
  if (collection.identifierKind === "slug") return `${collection.name} · ${collection.recordLabels?.[collection.problem] ?? collection.problem}`;
  return `${collection.name} · #${collection.problem}`;
}
