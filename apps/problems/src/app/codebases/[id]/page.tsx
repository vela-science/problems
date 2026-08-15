import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getConnectedCodebase } from "@vela/activity-data";
import { PageShell } from "@vela/ui/vela/page-shell";
import { CodebaseInspectionView } from "@/components/vela/codebase-inspection-view";
import { currentActivityAccount } from "@/lib/hosted-account";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Connected codebase", robots: { index: false, follow: false } };

export default async function CodebasePage({ params }: { params: Promise<{ id: string }> }) {
  const account = await currentActivityAccount();
  if (!account) redirect("/sign-in");
  const codebase = await getConnectedCodebase(account.activity.id, (await params).id);
  if (!codebase) notFound();
  return <PageShell archetype="default" layout="reading" className="flex flex-col gap-7">
    <CodebaseInspectionView codebase={codebase} retained />
  </PageShell>;
}
