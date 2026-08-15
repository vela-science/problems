import { notFound, permanentRedirect } from "next/navigation";
import { canonicalProblemPath } from "@vela/projection-data";
import type { ProblemPageQuery } from "@/components/vela/problem-page";

export const dynamic = "force-dynamic";

/* The retired Problem address.
 *
 * `/p/{repository}/{number}` put the Repository in the reader's URL, which
 * made a source-owned question look like a property of the Repository reading
 * it. It stayed because it was the only address the unreviewed Problems had;
 * now every Problem has a canonical one, so this renders nothing and forwards.
 *
 * The redirect is permanent and carries the query through, because the mode,
 * workspace, object, inspector and error parameters are URL-backed product
 * state — dropping them would land a reader on a different view of the page
 * they asked for. This is the whole of the route: a retired path that still
 * rendered a Problem would be a second Problem surface, which is what it was. */
const CARRIED = ["mode", "workspace", "object", "inspector", "workError"] as const;

export default async function RetiredProblemPath({ params, searchParams }: PageProps<"/p/[repository]/[problem]"> & { searchParams: Promise<ProblemPageQuery> }) {
  const [{ repository, problem }, query] = await Promise.all([params, searchParams]);
  const canonical = canonicalProblemPath(repository, problem);
  if (!canonical) notFound();
  const carried = new URLSearchParams();
  for (const key of CARRIED) {
    const value = (query as Record<string, string | undefined>)[key];
    if (typeof value === "string" && value) carried.set(key, value);
  }
  const search = carried.toString();
  permanentRedirect(search ? `${canonical}?${search}` : canonical);
}
