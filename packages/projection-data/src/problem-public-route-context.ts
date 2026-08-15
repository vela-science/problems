import { canonicalProblemPath } from "./registry";

/* Browser-safe navigation to a Problem's canonical address.
 *
 * This used to map the whole public-route table into a browser-reachable
 * constant. That was harmless while the table held six reviewed Problems and
 * would not have been: at 1,217 entries it is roughly 420 KB of route data in
 * a client chunk, which is the category error `check-budgets.mjs` exists to
 * catch — no browser file may embed the projection.
 *
 * An address is computed from the Repository's declared namespace, so this
 * module stays the same size whatever the release holds. */
export function publicProblemPathFromContext(repository: string, problem: string): string | null {
  return canonicalProblemPath(repository, problem);
}
