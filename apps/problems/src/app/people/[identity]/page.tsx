import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { PageShell } from "@vela/ui/vela/page-shell";
import { PublicPerformerProfile } from "@/components/vela/public-performer-profile";
import { currentActivityAccount, profileByHandle, profileForPerformer } from "@/lib/hosted-account";
import { performerActivity, type PublicPerformerKind } from "@/lib/performer-activity";
import { performerIdFromSegment } from "@/lib/performer-route";

export const dynamic = "force-dynamic";

const resolveProfile = cache(async (identity: string) => {
  const performerId = performerIdFromSegment(identity);
  if (performerId) {
    /* Exact retained attribution remains readable when hosted profile storage
       is degraded. A profile redirect is a convenience join, not custody of
       the scientific record or a prerequisite for viewing its performer. */
    const linked = await profileForPerformer(performerId).catch(() => null);
    if (linked) permanentRedirect(`/people/${linked.handle}`);
    const activity = await performerActivity([performerId]);
    if (!activity.length) return null;
    const kinds = new Set(activity.map(({ performerKind }) => performerKind).filter((kind) => kind !== "unknown"));
    const kind: PublicPerformerKind = kinds.size === 1 ? [...kinds][0]! : "unknown";
    const names = activity.map(({ performerDisplayName }) => performerDisplayName).filter((name): name is string => Boolean(name));
    return {
      profile: null,
      performer: { id: performerId, name: names[0] ?? performerId, kind },
      activity,
    };
  }

  const viewer = await currentActivityAccount();
  const profile = await profileByHandle(identity, viewer?.activity.id ?? null);
  if (!profile) return null;
  if (profile.redirect && profile.handle !== identity) permanentRedirect(`/people/${profile.handle}`);
  return {
    profile,
    performer: null,
    activity: await performerActivity(profile.performers.map(({ performerId }) => performerId)),
  };
});

export async function generateMetadata({ params }: { params: Promise<{ identity: string }> }): Promise<Metadata> {
  const { identity } = await params;
  const resolved = await resolveProfile(identity);
  if (!resolved) return { title: "Contributor not found", robots: { index: false, follow: false } };
  const name = resolved.profile?.displayName ?? resolved.performer?.name ?? "Contributor";
  const index = resolved.profile?.visibility === "public" || Boolean(resolved.performer);
  return {
    title: name,
    description: `Public scientific activity and attribution for ${name} on problems.science.`,
    alternates: { canonical: `/people/${resolved.profile?.handle ?? identity}` },
    robots: { index, follow: index },
  };
}

export default async function ContributorProfilePage({ params }: { params: Promise<{ identity: string }> }) {
  const { identity } = await params;
  const resolved = await resolveProfile(identity);
  if (!resolved) notFound();
  return <PageShell archetype="default" className="py-6 sm:py-8">
    <PublicPerformerProfile {...resolved} />
  </PageShell>;
}
