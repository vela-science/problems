import { Badge } from "@vela/ui/components/badge";
import { PageIntro } from "@/components/vela/page-intro";
import { Disclosure } from "@/components/vela/disclosure";

function text(value: unknown): string { return typeof value === "string" ? value : ""; }

export function CodebaseInspectionView({ codebase, retained }: { codebase: Record<string, unknown>; retained: boolean }) {
  const fullName = text(codebase.full_name);
  const commit = text(codebase.source_commit);
  const status = text(codebase.inspection_status);
  const inspection = codebase.inspection as Record<string, unknown> | undefined;
  const detail = inspection?.detail as Record<string, unknown> | undefined;
  const inspected = detail?.inspected as Record<string, unknown> | undefined;
  return <>
    <PageIntro title={fullName} description={retained ? "A connected codebase pinned to one immutable Git revision." : "A public codebase inspected at one immutable Git revision; no account receipt was retained."}
      signals={[{ label: "Inspection", value: status.replaceAll("_", " "), tone: status === "natively_verified" ? "evidence" : "neutral" },
        { label: "Authority", value: "None", detail: "Inspection only", tone: "neutral" }]} />
    <section className="space-y-3 rounded-xl border p-5"><h2 className="text-subtitle font-medium">Exact revision</h2>
      <p className="font-mono text-micro break-all">commit {commit}</p><p className="font-mono text-micro break-all">tree {text(codebase.source_tree)}</p>
      <p className="text-body text-muted-foreground">Branch movement does not change this inspection. {retained ? `Current sync state: ${text(codebase.sync_state)}.` : "Sign in only if you want to save this inspected revision."}</p></section>
    <section className="space-y-3 rounded-xl border p-5"><h2 className="text-subtitle font-medium">Native Vela integration</h2>
      {inspected ? <><p className="text-body">Manifest <Badge variant="secondary">{text(inspected.manifest_root)}</Badge></p>
        <p className="text-body text-muted-foreground">Profiles: {Array.isArray(inspected.profiles) ? inspected.profiles.length : 0}; bindings: {Array.isArray(inspected.bindings) ? inspected.bindings.length : 0}; methods: {Array.isArray(inspected.methods) ? inspected.methods.length : 0}.</p></>
        : <p className="text-body text-muted-foreground">No supported native integration was established. The codebase remains inspected at its exact revision.</p>}
      <p className="text-body text-muted-foreground">Structural inspection only. No scientific methods were run. A GitHub status does not accept scientific work or change Repository state.</p>
      <Disclosure summaryClassName="text-body" summary="Inspect roots"><p className="mt-2 font-mono text-micro break-all">inspection {text(codebase.inspection_root)}<br />receipt {text(codebase.receipt_root)}</p></Disclosure>
    </section>
    <section className="space-y-3 rounded-xl border p-5"><h2 className="text-subtitle font-medium">Continue locally</h2>
      <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-micro"><code>{`git clone ${text(codebase.canonical_locator)}\ncd ${fullName.split("/")[1] ?? "codebase"}\ngit checkout --detach ${commit}\nvela integration inspect . --json\nvela integration check . --json`}</code></pre>
      <p className="text-body text-muted-foreground">Continue in your chosen local editor or agent. Its files, environment, secrets, execution, and session history stay local; you may attach an exact reference or selected artifact when preparing a Contribution. No hosted signer or Decision is available here.</p>
    </section>
  </>;
}
