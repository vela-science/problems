"use server";

import { redirect } from "next/navigation";
import { canonicalJson, sha256 } from "@vela/projection-data/canonical";
import { listGitHubConnections, saveConnectedCodebase } from "@vela/activity-data";
import { currentActivityAccount } from "@/lib/hosted-account";
import { githubApp, publicGitHub } from "@/lib/github-app";
import { inspectGitHubCodebase, normalizeGitHubLocator } from "@/lib/codebase-inspection";

export async function importCodebase(formData: FormData) {
  const account = await currentActivityAccount();
  if (!account) redirect("/sign-in?returnTo=/import");
  const [installationText, repositoryText] = String(formData.get("repository") ?? "").split(":");
  const repositoryId = Number(repositoryText);
  const installationId = Number(installationText);
  const requestedCommit = String(formData.get("commit") ?? "").trim() || undefined;
  let result;
  let payload: Record<string, unknown>;
  if (Number.isSafeInteger(repositoryId) && repositoryId > 0 && Number.isSafeInteger(installationId) && installationId > 0) {
    const connections = await listGitHubConnections(account.activity.id);
    const selected = connections.repositories.find((repository) => repository.repositoryId === repositoryId && repository.installationId === installationId);
    if (!selected) redirect("/import?error=access");
    const octokit = await githubApp().getInstallationOctokit(installationId);
    try {
      result = await inspectGitHubCodebase({ octokit, fullName: selected.fullName, requestedCommit });
    } catch {
      redirect("/import?error=unavailable");
    }
    payload = { ...result, import_method: "github_app", installation_id: installationId,
      installation_permissions_root: sha256(canonicalJson({ contents: "read", metadata: "read" })) };
  } else {
    let fullName: string;
    try {
      ({ fullName } = normalizeGitHubLocator(String(formData.get("url") ?? "")));
    } catch {
      redirect("/import?error=invalid_url");
    }
    try {
      result = await inspectGitHubCodebase({ octokit: publicGitHub(), fullName, requestedCommit });
    } catch {
      redirect("/import?error=unavailable");
    }
    if (result.visibility !== "public") redirect("/import?error=public_only");
    payload = { ...result, import_method: "public_url", installation_id: null, installation_permissions_root: null };
  }
  const saved = await saveConnectedCodebase(account.activity.id, payload);
  redirect(`/codebases/${saved.id}`);
}
