import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription, AlertTitle } from "@vela/ui/components/alert";
import { PageShell } from "@vela/ui/vela/page-shell";
import { PublicProfileSettings } from "@/components/vela/public-profile-settings";
import { accountProfile, currentActivityAccount } from "@/lib/hosted-account";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Public profile",
  description: "Choose the public contributor information connected to your private problems.science account.",
  robots: { index: false, follow: false },
};

export default async function AccountPublicProfilePage() {
  const account = await currentActivityAccount();
  if (!account) redirect("/sign-in?returnTo=/account/profile");
  const profile = await accountProfile(account.activity.id).catch(() => undefined);

  return <PageShell archetype="default" layout="reading" className="flex flex-col gap-8">
    <header className="border-b pb-6">
      <Link href="/account" className="inline-flex min-h-11 items-center gap-2 text-meta text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:min-h-9"><HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden className="size-4" />Account</Link>
      <h1 className="mt-4 text-display">Public profile</h1>
      <p className="mt-3 max-w-2xl text-body text-muted-foreground">Choose a public name, links, and visibility.</p>
    </header>
    {profile === undefined
      ? <Alert><AlertTitle>Profile settings are unavailable</AlertTitle><AlertDescription>Your private account remains active. Reload before changing public information.</AlertDescription></Alert>
      : <PublicProfileSettings profile={profile} accountName={account.hosted.displayName} />}
  </PageShell>;
}
