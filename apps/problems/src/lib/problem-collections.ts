export type PublishedProblemCollection = {
  namespace: string;
  name: string;
};

export function problemCollectionForPath(
  href: string,
  collections: PublishedProblemCollection[],
): (PublishedProblemCollection & { problem?: string }) | null {
  const match = href.match(/^\/problems\/([^/?#]+)(?:\/([1-9][0-9]*))?(?:[?#]|$)/u);
  if (!match?.[1]) return null;
  const collection = collections.find(({ namespace }) => namespace === match[1]);
  return collection ? { ...collection, ...(match[2] ? { problem: match[2] } : {}) } : null;
}
