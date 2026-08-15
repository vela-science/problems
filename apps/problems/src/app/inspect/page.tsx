import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CodebaseInspectionView } from "@/components/vela/codebase-inspection-view";
import { inspectGitHubCodebase, normalizeGitHubLocator } from "@/lib/codebase-inspection";
import { publicGitHub } from "@/lib/github-app";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Public codebase inspection", robots: { index: false, follow: false } };

export default async function PublicInspectionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const parameters = await searchParams;
  const url = typeof parameters.url === "string" ? parameters.url : "";
  const requestedCommit = typeof parameters.commit === "string" && parameters.commit ? parameters.commit : undefined;
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
  return <CodebaseInspectionView codebase={inspection as unknown as Record<string, unknown>} retained={false} />;
}
