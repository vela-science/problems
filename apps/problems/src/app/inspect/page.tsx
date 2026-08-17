import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageShell } from "@vela/ui/vela/page-shell";
import { CodebaseInspectionView } from "@/components/vela/codebase-inspection-view";
import { inspectGitHubCodebase, normalizeGitHubLocator, normalizeRequestedCommit } from "@/lib/codebase-inspection";
import { publicGitHub } from "@/lib/github-app";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Public codebase inspection", robots: { index: false, follow: false } };

export default async function PublicInspectionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const parameters = await searchParams;
  const url = typeof parameters.url === "string" ? parameters.url : "";
  /* The signed-out form reaches this route by GET, so the commit arrives in
     the URL and may never have passed the field's own pattern. */
  const requested = normalizeRequestedCommit(parameters.commit);
  if (!requested) redirect("/import?error=invalid_commit");
  const requestedCommit = requested.commit;
  let fullName: string;
  try {
    ({ fullName } = normalizeGitHubLocator(url));
  } catch {
    redirect("/import?error=invalid_url");
  }
  let inspection;
  try {
    inspection = await inspectGitHubCodebase({ octokit: publicGitHub(), fullName, requestedCommit });
  } catch {
    redirect("/import?error=unavailable");
  }
  if (inspection.visibility !== "public") redirect("/import?error=public_only");
  if (!requestedCommit) {
    const exact = new URLSearchParams({ url, commit: inspection.source_commit });
    redirect(`/inspect?${exact}`);
  }
  return <PageShell archetype="default" layout="reading" className="flex flex-col gap-7">
    <CodebaseInspectionView codebase={inspection as unknown as Record<string, unknown>} retained={false} />
  </PageShell>;
}
