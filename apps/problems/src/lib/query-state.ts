export type QueryUpdate = Record<string, string | number | null | undefined>;

export function queryChoice<T extends string>(
  params: Pick<URLSearchParams, "get">,
  key: string,
  choices: readonly T[],
  fallback: T,
): T {
  const value = params.get(key);
  return value && choices.includes(value as T) ? value as T : fallback;
}

function pageNumber(raw: string | null | undefined): number {
  const value = Number.parseInt(raw ?? "1", 10);
  return Number.isSafeInteger(value) && value > 0 ? value : 1;
}

export function queryPage(params: Pick<URLSearchParams, "get">, key = "page"): number {
  return pageNumber(params.get(key));
}

/* A server component receives Next's `searchParams` as a plain record, with no
   `get`, so the ledger routes cannot reach `queryPage` directly. */
export function pageFromSearchParams(
  query: Record<string, string | string[] | undefined>,
  key = "page",
): number {
  const value = query[key];
  return pageNumber(typeof value === "string" ? value : null);
}

export function updateQuery(
  params: Pick<URLSearchParams, "toString">,
  updates: QueryUpdate,
): string {
  const next = new URLSearchParams(params.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined || value === "") next.delete(key);
    else next.set(key, String(value));
  }
  return next.toString();
}

export function queryHref(pathname: string, params: Pick<URLSearchParams, "toString">, updates: QueryUpdate): string {
  const query = updateQuery(params, updates);
  return query ? `${pathname}?${query}` : pathname;
}
