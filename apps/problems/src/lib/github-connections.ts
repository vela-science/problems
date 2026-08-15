type GitHubConnections = {
  installations: Array<{ installationId: number; suspended: boolean }>;
  repositories: Array<{ installationId: number }>;
};

export function accessibleGitHubRepositoryCount(connections: GitHubConnections): number {
  const activeInstallations = new Set(
    connections.installations
      .filter((installation) => !installation.suspended)
      .map((installation) => installation.installationId),
  );
  return connections.repositories.filter((repository) => activeInstallations.has(repository.installationId)).length;
}
