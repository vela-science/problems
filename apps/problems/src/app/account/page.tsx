import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageShell } from "@vela/ui/vela/page-shell";
import { AccountProfile, type AccountProfileData } from "@/components/vela/account-profile";
import { authConfiguration } from "@/lib/auth";
import { githubAppConfiguration } from "@/lib/github-app";
import { accountGitHubConnections, accountProfile, accountWorkspaces, currentActivityAccount } from "@/lib/hosted-account";
import { githubIdentityForUser } from "@/lib/workos-identities";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Account",
  description: "Your private problems.science account, work, and connections.",
  robots: { index: false, follow: false },
};

async function loadResult<T>(read: () => Promise<T>): Promise<{ status: "ready"; value: T } | { status: "unavailable" }> {
  try {
    return { status: "ready", value: await read() };
  } catch {
    return { status: "unavailable" };
  }
}

export default async function AccountPage() {
  if (!authConfiguration().enabled) redirect("/problems");
  const account = await currentActivityAccount();
  if (!account) redirect("/sign-in?returnTo=/account");

  const [publicProfile, workspaces, githubIdentity, githubConnections] = await Promise.all([
    loadResult(() => accountProfile(account.activity.id)),
    loadResult(() => accountWorkspaces(account.activity.id)),
    loadResult(() => githubIdentityForUser(account.hosted.id)),
    loadResult(() => accountGitHubConnections(account.activity.id)),
  ]);

  const connections: AccountProfileData["connections"] = githubIdentity.status === "ready" && githubConnections.status === "ready"
    ? {
        status: "ready",
        value: {
          githubIdentityConnected: Boolean(githubIdentity.value),
          githubAppEnabled: githubAppConfiguration().enabled,
          data: githubConnections.value,
        },
      }
    : { status: "unavailable" };

  return <PageShell archetype="default" layout="reading" className="flex flex-col gap-10">
    <AccountProfile account={account.hosted} publicProfile={publicProfile} workspaces={workspaces} connections={connections} />
  </PageShell>;
}
