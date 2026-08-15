import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type GitHubInstallState = {
  accountId: string;
  workosIdentityId: string;
  nonce: string;
  expiresAt: number;
};

export const GITHUB_INSTALL_CALLBACK_PATH = "/account/connections/github";

function key(environment: Readonly<Record<string, string | undefined>>): string {
  const value = environment.WORKOS_COOKIE_PASSWORD;
  if (!value || value.length < 32) throw new Error("installation state signing is unavailable");
  return value;
}

function signature(payload: string, environment: Readonly<Record<string, string | undefined>>): string {
  return createHmac("sha256", key(environment)).update(`problems.github-install.v1\0${payload}`).digest("base64url");
}

export function createGitHubInstallState(
  accountId: string,
  workosIdentityId: string,
  now = Date.now(),
  environment: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const body: GitHubInstallState = {
    accountId,
    workosIdentityId,
    nonce: randomBytes(24).toString("base64url"),
    expiresAt: now + 10 * 60 * 1000,
  };
  const payload = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${payload}.${signature(payload, environment)}`;
}

export function readGitHubInstallState(
  state: string,
  now = Date.now(),
  environment: Readonly<Record<string, string | undefined>> = process.env,
): GitHubInstallState {
  const [payload, supplied, extra] = state.split(".");
  if (!payload || !supplied || extra) throw new Error("invalid GitHub installation state");
  const expected = signature(payload, environment);
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) throw new Error("invalid GitHub installation state");
  const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<GitHubInstallState>;
  if (typeof value.accountId !== "string" || typeof value.workosIdentityId !== "string"
    || typeof value.nonce !== "string" || typeof value.expiresAt !== "number" || value.expiresAt < now) {
    throw new Error("expired or malformed GitHub installation state");
  }
  return value as GitHubInstallState;
}
