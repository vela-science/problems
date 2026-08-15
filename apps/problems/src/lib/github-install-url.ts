export function githubInstallUrlForSlug(slug: string): string {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/u.test(slug)) throw new Error("GitHub App slug is invalid");
  return `https://github.com/apps/${slug}/installations/new`;
}
