import { Badge } from "@vela/ui/components/badge";
import { PageIntro } from "@/components/vela/page-intro";
import { Disclosure } from "@/components/vela/disclosure";

function text(value: unknown): string { return typeof value === "string" ? value : ""; }

/* One panel of blocks, not three identical cards.
 *
 * This was three `rounded-xl border p-5` sections stacked down the page. Three
 * frames, all the same weight, none of them meaning "this differs from that" —
 * the shape DESIGN.md names as card soup. The three blocks do belong together:
 * they are one inspection, read top to bottom. So they share one container and
 * are separated by a rule, which is what a group of related blocks looks like
 * everywhere else in this product. */
function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-3 p-5">
    <h2 className="text-subtitle font-medium">{title}</h2>
    {children}
  </section>;
}

/* An exact value is a label and a digest, not a sentence starting with a word
   that happens to be the label. */
function Root({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-3">
    <dt className="text-meta text-muted-foreground">{label}</dt>
    <dd className="break-all font-mono text-micro">{value}</dd>
  </div>;
}

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

    <div className="divide-y rounded-lg border">
      <Block title="Exact revision">
        <dl className="space-y-2">
          <Root label="commit" value={commit} />
          <Root label="tree" value={text(codebase.source_tree)} />
        </dl>
        <p className="text-body text-muted-foreground">Branch movement does not change this inspection. {retained ? `Current sync state: ${text(codebase.sync_state)}.` : "Sign in only if you want to save this inspected revision."}</p>
      </Block>

      <Block title="Native Vela integration">
        {inspected ? <><p className="text-body">Manifest <Badge variant="secondary">{text(inspected.manifest_root)}</Badge></p>
          <p className="text-body text-muted-foreground">Profiles: {Array.isArray(inspected.profiles) ? inspected.profiles.length : 0}; bindings: {Array.isArray(inspected.bindings) ? inspected.bindings.length : 0}; methods: {Array.isArray(inspected.methods) ? inspected.methods.length : 0}.</p></>
          : <p className="text-body text-muted-foreground">No supported native integration was established. The codebase remains inspected at its exact revision.</p>}
        {/* Not the general authority boundary: the specific confusion this
            page invites, which is reading a green GitHub check as acceptance. */}
        <p className="text-body text-muted-foreground">Structural inspection only. No scientific methods were run. A GitHub status does not accept scientific work or change Repository state.</p>
        <Disclosure summaryClassName="text-body" summary="Inspect roots">
          <dl className="mt-2 space-y-2">
            <Root label="inspection" value={text(codebase.inspection_root)} />
            <Root label="receipt" value={text(codebase.receipt_root)} />
          </dl>
        </Disclosure>
      </Block>

      <Block title="Continue locally">
        <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-micro"><code>{`git clone ${text(codebase.canonical_locator)}\ncd ${fullName.split("/")[1] ?? "codebase"}\ngit checkout --detach ${commit}\nvela integration inspect . --json\nvela integration check . --json`}</code></pre>
        <p className="text-body text-muted-foreground">Continue in your chosen local editor or agent. Its files, environment, secrets, execution, and session history stay local; you may attach an exact reference or selected artifact when preparing a Contribution. No hosted signer or Decision is available here.</p>
      </Block>
    </div>
  </>;
}
