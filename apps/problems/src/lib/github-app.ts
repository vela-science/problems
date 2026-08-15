import "server-only";

import { App, Octokit } from "octokit";
import { githubInstallUrlForSlug } from "./github-install-url";

const required = ["GITHUB_APP_ID", "GITHUB_APP_SLUG", "GITHUB_APP_PRIVATE_KEY", "GITHUB_APP_WEBHOOK_SECRET"] as const;

export type GitHubAppConfiguration =
  | { enabled: true; appId: number; slug: string; privateKey: string; webhookSecret: string }
  | { enabled: false; reason: "missing" | "invalid" };

export function githubAppConfiguration(environment: Readonly<Record<string, string | undefined>> = process.env): GitHubAppConfiguration {
  if (required.some((name) => !environment[name])) return { enabled: false, reason: "missing" };
  const appId = Number(environment.GITHUB_APP_ID);
  const slug = environment.GITHUB_APP_SLUG ?? "";
  const privateKey = (environment.GITHUB_APP_PRIVATE_KEY ?? "").replaceAll("\\n", "\n");
  const webhookSecret = environment.GITHUB_APP_WEBHOOK_SECRET ?? "";
  if (!Number.isSafeInteger(appId) || appId <= 0 || !/^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/u.test(slug)
    || !privateKey.includes("BEGIN RSA PRIVATE KEY") || webhookSecret.length < 32) {
    return { enabled: false, reason: "invalid" };
  }
  return { enabled: true, appId, slug, privateKey, webhookSecret };
}

let cached: App | undefined;
const BoundedOctokit = Octokit.defaults({ request: { timeout: 30_000 } });
export function githubApp(): App {
  const configuration = githubAppConfiguration();
  if (!configuration.enabled) throw new Error(`GitHub App is not configured: ${configuration.reason}`);
  cached ??= new App({
    Octokit: BoundedOctokit,
    appId: configuration.appId,
    privateKey: configuration.privateKey,
    webhooks: { secret: configuration.webhookSecret },
    log: { debug() {}, info() {}, warn() {}, error() {} },
  });
  return cached;
}

export function publicGitHub(): Octokit {
  return new BoundedOctokit({ log: { debug() {}, info() {}, warn() {}, error() {} } });
}

export function githubInstallUrl(environment: Readonly<Record<string, string | undefined>> = process.env): string {
  const configuration = githubAppConfiguration(environment);
  if (!configuration.enabled) throw new Error("GitHub App is not configured");
  return githubInstallUrlForSlug(configuration.slug);
}
