import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@vela/ui/components/badge";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@vela/ui/components/item";
import { PageShell } from "@vela/ui/vela/page-shell";
import { PageIntro } from "@/components/vela/page-intro";
import { authConfiguration, currentAccount } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Account",
  description: "Your human identity in the Vela Problems.",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const configuration = authConfiguration();
  /* A destination that can only ever report its own absence is not a
     destination. Unconfigured, this route rendered 233 characters across a
     full-height page — a display heading saying "Account", which the trail and
     the account menu both already said, above three sentences explaining that
     there is nothing here. The account menu says it inline instead.

     Temporary (307), not permanent. Whether authentication is configured is a
     property of the environment, and a browser caches a 308 indefinitely — so
     a permanent redirect here would keep sending a reader away from their own
     account page for good, on the day the deployment finally configures one. */
  if (!configuration.enabled) redirect("/repositories");

  const account = await currentAccount();
  if (!account) redirect("/sign-in");

  return <PageShell archetype="default" layout="reading" className="flex flex-col gap-6">
    <PageIntro
      title="Account"
      description="Your signed-in human identity for personal Problems workflow. It is separate from scientific authorship and repository authority."
      signals={[
        { label: "Session", value: "Signed in", tone: "evidence" },
        { label: "Authority", value: "None", detail: "Web identity only", tone: "neutral" },
      ]}
    />
    <ItemGroup className="max-w-2xl">
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>{account.displayName}<Badge variant="secondary">Human account</Badge></ItemTitle>
          <ItemDescription>{account.email}</ItemDescription>
        </ItemContent>
      </Item>
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>Identity boundary</ItemTitle>
          <ItemDescription className="line-clamp-none">
            This WorkOS account is not a Vela actor ID. It cannot sign Submissions, issue Decisions, or access a Repository&apos;s repository authority key. A future explicit link may associate this account with an existing actor without changing either identity.
          </ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  </PageShell>;
}
