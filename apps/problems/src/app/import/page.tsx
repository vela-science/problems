import type { Metadata } from "next";
import Link from "next/link";
import { listGitHubConnections } from "@vela/activity-data";
import { Button } from "@vela/ui/components/button";
import { Input } from "@vela/ui/components/input";
import { Label } from "@vela/ui/components/label";
import { PageShell } from "@vela/ui/vela/page-shell";
import { FormSelect } from "@/components/vela/form-select";
import { ContributionStepper } from "@/components/vela/contribution-stepper";
import { PageIntro } from "@/components/vela/page-intro";
import { currentActivityAccount } from "@/lib/hosted-account";
import { importCodebase } from "./actions";
import { ImportError, ImportSubmit } from "./import-feedback";
import { importErrorMessage } from "./import-errors";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Import codebase", robots: { index: false, follow: false } };

/* The field accepted exactly one spelling and named none of it.
 *
 * `pattern` alone rejects a 7-character short SHA at the browser's own prompt,
 * which says only that the value does not match the requested format — and the
 * requested format appeared nowhere on the page. The placeholder describes what
 * happens when the field is empty, which is the one case that needs no help.
 *
 * The hint is programmatically attached, not merely adjacent, and `title` is
 * what the browser reads out when the pattern rejects a value. Autocapitalize
 * and spellcheck are off because a phone keyboard will otherwise offer to
 * correct a hex digest.
 *
 * No placeholder. It held the sentence about the empty case, which the hint
 * now makes durably — a placeholder leaves the moment anyone types, and in the
 * monospace this field wants it overflowed the input at 375px anyway. */
function CommitField({ id }: { id: string }) {
  return <>
    <Label htmlFor={id}>Exact commit (optional)</Label>
    <Input
      id={id}
      name="commit"
      pattern="[0-9a-fA-F]{40}"
      title="A full 40-character commit SHA"
      aria-describedby={`${id}-hint`}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      className="font-mono"
    />
    <p id={`${id}-hint`} className="text-meta text-muted-foreground">
      The full 40-character SHA, not an abbreviated one. Leave it empty to pin the default branch head at import time.
    </p>
  </>;
}

function PublicFields() {
  return <>
    <div><h2 className="text-subtitle font-medium">Public GitHub URL</h2><p className="text-body text-muted-foreground">Uses the same immutable inspection path without GitHub identity or installation access.</p></div>
    <Label htmlFor="url">Repository URL</Label><Input id="url" name="url" type="url" required placeholder="https://github.com/owner/repository" />
    <CommitField id="public-commit" />
    <ImportSubmit variant="outline" pending="Inspecting">Inspect public codebase</ImportSubmit>
  </>;
}

export default async function ImportPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const account = await currentActivityAccount();
  const error = importErrorMessage((await searchParams).error);
  const connections = account ? await listGitHubConnections(account.activity.id) : null;
  return <PageShell archetype="default" layout="reading" className="flex flex-col gap-8">
    <PageIntro className="vela-work-hero" title="Connect a codebase" description="Connect one GitHub revision to your work. problems.science reads the metadata and files needed for inspection; it does not write to GitHub."
      signals={[{ label: "Access", value: "Read only", tone: "evidence" }, { label: "Revision", value: "Immutable", tone: "neutral" }]} />
    <ContributionStepper current={2} heading="Connect code to scientific work" />
    {error && <ImportError message={error} />}
    {!account ? <div className="grid gap-5 lg:grid-cols-[minmax(0,.75fr)_minmax(22rem,1.25fr)]"><div className="vela-data-hero rounded-xl p-5"><p className="text-eyebrow text-muted-foreground">Public inspection</p><h2 className="mt-2 text-subtitle">No account required</h2><p className="mt-2 text-body text-muted-foreground">Inspect a public codebase now. Sign in only to save the exact revision.</p>
      <Button nativeButton={false} render={<Link href="/sign-in?returnTo=/import" prefetch={false} />} className="mt-4">Sign in to save this revision</Button></div>
      <form action="/inspect" method="get" className="space-y-4 rounded-xl border bg-card p-5 shadow-sm"><PublicFields /></form></div> : <div className="grid gap-5 lg:grid-cols-2">
      {connections?.repositories.length ? <form action={importCodebase} className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <div><h2 className="text-subtitle font-medium">Selected GitHub codebase</h2><p className="text-body text-muted-foreground">Installation tokens are short lived and never stored.</p></div>
        <FormSelect label="Codebase" name="repository" options={connections.repositories.map((repository) => ({
          value: `${repository.installationId}:${repository.repositoryId}`,
          label: `${repository.fullName} (${repository.visibility})`,
        }))} />
        <CommitField id="private-commit" />
        <ImportSubmit pending="Pinning">Pin and inspect</ImportSubmit>
      </form> : <div className="vela-data-hero rounded-xl p-5"><h2 className="text-subtitle">No selected repositories</h2><p className="mt-2 text-body text-muted-foreground">Connect selected repositories from your account first.</p>
        <Button nativeButton={false} render={<Link href="/account/connections" />} className="mt-4">Connect GitHub</Button></div>}
      <form action={importCodebase} className="space-y-4 rounded-xl border bg-card p-5 shadow-sm"><PublicFields /></form>
    </div>}
  </PageShell>;
}
