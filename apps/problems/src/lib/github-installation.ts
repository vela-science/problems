import "server-only";

import { setTimeout as pause } from "node:timers/promises";
import { claimGitHubInstallation, syncGitHubRepositories } from "@vela/activity-data";
import { githubApp } from "./github-app";

export async function completeGitHubInstallation(input: {
  accountId: string;
  workosIdentityId: string;
  installationId: number;
}): Promise<void> {
  if (!Number.isSafeInteger(input.installationId) || input.installationId <= 0) throw new Error("GitHub installation id is invalid");
  const app = githubApp();
  const installation = await app.octokit.request("GET /app/installations/{installation_id}", { installation_id: input.installationId });
  if (installation.data.id !== input.installationId || installation.data.suspended_at !== null || installation.data.permissions.contents !== "read") {
    throw new Error("GitHub installation is not an active read-only installation");
  }
  let claimed = false;
  for (let attempt = 0; attempt < 8 && !claimed; attempt += 1) {
    try {
      await claimGitHubInstallation({
        accountId: input.accountId,
        workosIdentityId: input.workosIdentityId,
        githubUserId: Number(input.workosIdentityId),
        installationId: input.installationId,
      });
      claimed = true;
    } catch (error) {
      if (attempt === 7) throw error;
      await pause(350);
    }
  }
  const octokit = await app.getInstallationOctokit(input.installationId);
  const repositories = await octokit.paginate(octokit.rest.apps.listReposAccessibleToInstallation, { per_page: 100 });
  await syncGitHubRepositories(input.accountId, input.installationId, repositories.map((repository) => ({
    id: repository.id,
    node_id: repository.node_id,
    full_name: repository.full_name,
    visibility: repository.visibility,
    default_branch: repository.default_branch,
  })));
}
