import type { Metadata } from "next";
import Link from "next/link";
import { listGitHubConnections } from "@vela/activity-data";
import { Button } from "@vela/ui/components/button";
import { Input } from "@vela/ui/components/input";
import { Label } from "@vela/ui/components/label";
import { PageShell } from "@vela/ui/vela/page-shell";
import { FormSelect } from "@/components/vela/form-select";
import { PageIntro } from "@/components/vela/page-intro";
import { currentActivityAccount } from "@/lib/hosted-account";
import { importCodebase } from "./actions";
import { ImportError, ImportSubmit } from "./import-feedback";
import { importErrorMessage } from "./import-errors";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Import codebase", robots: { index: false, follow: false } };

function PublicFields() {
  return <>
    <div><h2 className="text-subtitle font-medium">Public GitHub URL</h2><p className="text-body text-muted-foreground">Uses the same immutable inspection path without GitHub identity or installation access.</p></div>
    <Label htmlFor="url">Repository URL</Label><Input id="url" name="url" type="url" required placeholder="https://github.com/owner/repository" />
    <Label htmlFor="public-commit">Exact commit (optional)</Label><Input id="public-commit" name="commit" pattern="[0-9a-f]{40}" placeholder="default branch head at import time" />
    <ImportSubmit variant="outline" pending="Inspecting">Inspect public codebase</ImportSubmit>
  </>;
}

export default async function ImportPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const account = await currentActivityAccount();
  const error = importErrorMessage((await searchParams).error);
  const connections = account ? await listGitHubConnections(account.activity.id) : null;
  return <PageShell archetype="default" layout="reading" className="flex flex-col gap-8">
    <PageIntro title="Connect a codebase" description="Pin one Git revision, inspect its native Vela integration, and leave scientific authority unchanged."
      signals={[{ label: "Access", value: "Read only", tone: "evidence" }, { label: "Revision", value: "Immutable", tone: "neutral" }]} />
    {error && <ImportError message={error} />}
    {!account ? <><div className="rounded-xl border p-5"><p className="text-body text-muted-foreground">Inspect a public codebase without an account. Sign in only to retain its rooted receipt.</p>
      <Button nativeButton={false} render={<Link href="/sign-in?returnTo=/import" />} className="mt-4">Sign in to retain receipts</Button></div>
      <form action="/inspect" method="get" className="space-y-4 rounded-xl border p-5"><PublicFields /></form></> : <>
      {connections?.repositories.length ? <form action={importCodebase} className="space-y-4 rounded-xl border p-5">
        <div><h2 className="text-subtitle font-medium">Selected GitHub codebase</h2><p className="text-body text-muted-foreground">Installation tokens are short lived and never stored.</p></div>
        <FormSelect label="Codebase" name="repository" options={connections.repositories.map((repository) => ({
          value: `${repository.installationId}:${repository.repositoryId}`,
          label: `${repository.fullName} (${repository.visibility})`,
        }))} />
        <Label htmlFor="private-commit">Exact commit (optional)</Label><Input id="private-commit" name="commit" pattern="[0-9a-f]{40}" placeholder="default branch head at import time" />
        <ImportSubmit pending="Pinning">Pin and inspect</ImportSubmit>
      </form> : <div className="rounded-xl border p-5"><p className="text-body text-muted-foreground">Connect selected repositories from your account first.</p>
        <Button nativeButton={false} render={<Link href="/account/connections" />} className="mt-4">Connect GitHub</Button></div>}
      <form action={importCodebase} className="space-y-4 rounded-xl border p-5"><PublicFields /></form>
    </>}
  </PageShell>;
}
