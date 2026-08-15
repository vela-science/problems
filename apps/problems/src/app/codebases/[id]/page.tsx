import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getConnectedCodebase } from "@vela/activity-data";
import { Badge } from "@vela/ui/components/badge";
import { PageShell } from "@vela/ui/vela/page-shell";
import { PageIntro } from "@/components/vela/page-intro";
import { currentActivityAccount } from "@/lib/hosted-account";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Connected codebase", robots: { index: false, follow: false } };

function text(value: unknown): string { return typeof value === "string" ? value : ""; }

export default async function CodebasePage({ params }: { params: Promise<{ id: string }> }) {
  const account = await currentActivityAccount();
  if (!account) redirect("/sign-in");
  const codebase = await getConnectedCodebase(account.activity.id, (await params).id);
  if (!codebase) notFound();
  const fullName = text(codebase.full_name);
  const commit = text(codebase.source_commit);
  const status = text(codebase.inspection_status);
  const inspection = codebase.inspection as Record<string, unknown> | undefined;
  const detail = inspection?.detail as Record<string, unknown> | undefined;
  const inspected = detail?.inspected as Record<string, unknown> | undefined;
  return <PageShell archetype="default" layout="reading" className="flex flex-col gap-7">
    <PageIntro title={fullName} description="A connected codebase pinned to one immutable Git revision."
      signals={[{ label: "Inspection", value: status.replaceAll("_", " "), tone: status === "natively_verified" ? "evidence" : "neutral" },
        { label: "Authority", value: "None", detail: "Import only", tone: "neutral" }]} />
    <section className="space-y-3 rounded-xl border p-5"><h2 className="text-subtitle font-medium">Exact revision</h2>
      <p className="font-mono text-micro break-all">commit {commit}</p><p className="font-mono text-micro break-all">tree {text(codebase.source_tree)}</p>
      <p className="text-body text-muted-foreground">Branch movement does not change this receipt. Current sync state: {text(codebase.sync_state)}.</p></section>
    <section className="space-y-3 rounded-xl border p-5"><h2 className="text-subtitle font-medium">Native Vela integration</h2>
      {inspected ? <><p className="text-body">Manifest <Badge variant="secondary">{text(inspected.manifest_root)}</Badge></p>
        <p className="text-body text-muted-foreground">Profiles: {Array.isArray(inspected.profiles) ? inspected.profiles.length : 0}; bindings: {Array.isArray(inspected.bindings) ? inspected.bindings.length : 0}; methods: {Array.isArray(inspected.methods) ? inspected.methods.length : 0}.</p></>
        : <p className="text-body text-muted-foreground">No supported native integration was established. The codebase remains connected at its exact revision.</p>}
      <p className="text-body text-muted-foreground">Structural check only. Native Methods were not executed; GitHub status is not Verification, Decision, Standing, or Repository authority.</p>
      <details><summary className="cursor-pointer text-body">Inspect roots</summary><p className="mt-2 font-mono text-micro break-all">inspection {text(codebase.inspection_root)}<br />receipt {text(codebase.receipt_root)}</p></details>
    </section>
    <section className="space-y-3 rounded-xl border p-5"><h2 className="text-subtitle font-medium">Continue locally</h2>
      <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-micro"><code>{`git clone ${text(codebase.canonical_locator)}\ncd ${fullName.split("/")[1] ?? "codebase"}\ngit checkout --detach ${commit}\nvela integration inspect . --json\nvela integration check . --json`}</code></pre>
      <p className="text-body text-muted-foreground">Continue in your native editor, Codex, Claude, Entire, or another workbench. Keep its session/checkpoint as optional attributed provenance, then prepare a bounded Submission locally. No hosted signer or Decision is available here.</p>
    </section>
  </PageShell>;
}
