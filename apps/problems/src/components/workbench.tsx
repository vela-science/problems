import Link from "next/link";
import {
  assessAnchorFreshness,
  ensureCurrentAccount,
  getProblemActivity,
  listWorkspaces,
  type ScientificAnchor,
} from "@vela/activity-data";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { Input } from "@vela/ui/components/input";
import { Label } from "@vela/ui/components/label";
import { Textarea } from "@vela/ui/components/textarea";
import type { HostedAccount } from "@/lib/auth";
import type { ScientificProblemState } from "@/lib/scientific-state";
import { WorkAction } from "@/components/work-action";
import {
  addDiscussionAction,
  attachArtifactAction,
  createApproachAction,
  createAttemptAction,
  createWorkspaceAction,
  createWorkRequestAction,
  followProblemAction,
  forkApproachAction,
  saveSubmissionDraftAction,
  updateAttemptAction,
} from "@/app/actions/activity";

type State = NonNullable<ScientificProblemState>;
type Scope = { repository: string; problem: string; workspaceId: string };
type Row = Record<string, unknown>;

const string = (row: Row, ...keys: string[]) => keys.map((key) => row[key]).find((value): value is string => typeof value === "string") ?? "";
const number = (row: Row, ...keys: string[]) => keys.map((key) => row[key]).find((value): value is number => typeof value === "number") ?? 1;
const commandKey = () => crypto.randomUUID();

function ScopeFields({ scope }: { scope: Scope }) {
  return <><input type="hidden" name="repository" value={scope.repository} /><input type="hidden" name="problem" value={scope.problem} /><input type="hidden" name="workspaceId" value={scope.workspaceId} /><input type="hidden" name="idempotencyKey" value={commandKey()} /></>;
}

function FormField({ label, name, placeholder, required = true, value, type = "text" }: { label: string; name: string; placeholder?: string; required?: boolean; value?: string; type?: string }) {
  const id = `${name}-${value ?? placeholder ?? "field"}`
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  return <div className="grid gap-1.5"><Label htmlFor={id}>{label}</Label><Input id={id} name={name} placeholder={placeholder} required={required} defaultValue={value} type={type} /></div>;
}

function EmptyWorkspace({ state, accountId }: { state: State; accountId: string }) {
  return <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
    <div className="border p-5 sm:p-6"><p className="text-eyebrow uppercase text-muted-foreground">Create the activity plane</p><h2 className="mt-2 text-title">Start a workspace for this Problem</h2><p className="mt-2 max-w-prose text-body text-muted-foreground">A workspace groups follows, approaches, attempts, notes, assignments, rooted artifact references, and unsigned draft Submissions. It carries no repository authority.</p>
      <form action={createWorkspaceAction} className="mt-6 grid gap-4 sm:max-w-xl">
        <input type="hidden" name="repository" value={state.repositorySlug} /><input type="hidden" name="problem" value={state.problem.problem} /><input type="hidden" name="idempotencyKey" value={commandKey()} />
        <FormField label="Workspace name" name="name" placeholder="Erdős problem working group" />
        <FormField label="URL slug" name="slug" placeholder="erdos-working-group" />
        <Button className="w-fit" type="submit">Create workspace</Button>
      </form>
    </div>
    <aside className="border-l-2 border-foreground pl-4 text-meta text-muted-foreground"><p className="font-medium text-foreground">Identity boundary</p><p className="mt-2">Hosted account <code>{accountId}</code> identifies workspace membership only. It is not copied into Vela signer identity.</p></aside>
  </section>;
}

export async function Workbench({ state, hostedAccount, selectedWorkspace }: { state: State; hostedAccount: HostedAccount | null; selectedWorkspace?: string }) {
  if (!hostedAccount) return <section className="mt-8 border bg-muted/20 p-6 sm:p-8"><p className="text-eyebrow uppercase text-muted-foreground">Work mode</p><h2 className="mt-2 text-title">Sign in to coordinate work</h2><p className="mt-3 max-w-2xl text-body text-muted-foreground">State remains public and exact. A WorkOS session is used only for hosted account and workspace authorization; it never becomes a Vela actor or signer.</p><Button className="mt-6" nativeButton={false} render={<Link href="/sign-in" prefetch={false} />}>Sign in</Button></section>;

  const account = await ensureCurrentAccount({ workosUserId: hostedAccount.id, displayName: hostedAccount.displayName, email: hostedAccount.email });
  const workspaces = await listWorkspaces(account.id);
  if (!workspaces.length) return <EmptyWorkspace state={state} accountId={account.id} />;
  const workspace = workspaces.find((entry) => entry.id === selectedWorkspace) ?? workspaces[0];
  const scope = { repository: state.repositorySlug, problem: state.problem.problem, workspaceId: workspace.id };
  const activity = await getProblemActivity({ accountId: account.id, workspaceId: workspace.id, repositoryId: state.anchor.repositoryId, problemId: state.anchor.problemId });
  const currentAnchor = state.anchor as ScientificAnchor;

  return <div className="mt-8 space-y-10">
    <section aria-labelledby="workspace-heading" className="grid gap-5 border-b pb-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div><p className="text-eyebrow uppercase text-muted-foreground">Workspace</p><h2 id="workspace-heading" className="mt-1 text-title">{workspace.name}</h2><div className="mt-3 flex flex-wrap gap-2"><Badge variant="outline">{workspace.role}</Badge><Badge variant="secondary">activity only</Badge>{activity.following ? <Badge>following</Badge> : null}</div></div>
      <div className="flex flex-wrap items-start gap-2 lg:justify-end">
        {workspaces.map((entry) => <Button key={entry.id} nativeButton={false} size="sm" variant={entry.id === workspace.id ? "default" : "outline"} render={<Link href={`/p/${state.repositorySlug}/${state.problem.problem}?mode=work&workspace=${entry.id}`} />}>{entry.name}</Button>)}
        <form action={followProblemAction}><ScopeFields scope={scope} /><input type="hidden" name="following" value={activity.following ? "false" : "true"} /><Button type="submit" size="sm" variant="outline">{activity.following ? "Unfollow" : "Follow Problem"}</Button></form>
      </div>
    </section>

    <nav aria-label="Work sections" className="flex overflow-x-auto border-y divide-x">
      <a href="#directions" className="min-w-32 flex-1 px-4 py-3 text-meta hover:bg-muted/50"><span className="font-medium">Directions</span><span className="ml-2 font-mono text-muted-foreground">{activity.approaches.length}</span></a>
      <a href="#attempts" className="min-w-32 flex-1 px-4 py-3 text-meta hover:bg-muted/50"><span className="font-medium">Attempts</span><span className="ml-2 font-mono text-muted-foreground">{activity.attempts.length}</span></a>
      <a href="#notes" className="min-w-28 flex-1 px-4 py-3 text-meta hover:bg-muted/50"><span className="font-medium">Notes</span><span className="ml-2 font-mono text-muted-foreground">{activity.discussion.length}</span></a>
      <a href="#requests" className="min-w-32 flex-1 px-4 py-3 text-meta hover:bg-muted/50"><span className="font-medium">Requests</span><span className="ml-2 font-mono text-muted-foreground">{activity.workRequests.length}</span></a>
      <a href="#evidence" className="min-w-32 flex-1 px-4 py-3 text-meta hover:bg-muted/50"><span className="font-medium">Evidence</span><span className="ml-2 font-mono text-muted-foreground">{activity.artifacts.length}</span></a>
    </nav>

    {activity.anchors.length ? <details className="border-b pb-5"><summary className="cursor-pointer text-subtitle">Exact activity anchors</summary><ul className="mt-4 grid gap-3 sm:grid-cols-2">{activity.anchors.map((anchor) => { const freshness = assessAnchorFreshness(anchor, currentAnchor); return <li key={anchor.root} className="rounded-lg bg-muted/40 p-4"><div className="flex items-center justify-between gap-3"><span className="font-mono text-micro break-all">{anchor.root.slice(0, 24)}…</span><Badge variant={freshness.state === "current" ? "default" : "secondary"}>{freshness.state.replaceAll("_", " ")}</Badge></div>{"fields" in freshness ? <p className="mt-2 text-meta text-muted-foreground">Changed: {freshness.fields.join(", ")}</p> : null}</li>; })}</ul></details> : null}

    <section id="directions" aria-labelledby="approaches-heading" className="scroll-mt-20 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div><div className="flex items-end justify-between gap-4"><div><p className="text-eyebrow uppercase text-muted-foreground">Direction</p><h2 id="approaches-heading" className="mt-1 text-title">Approaches and forks</h2></div><span className="font-mono text-meta text-muted-foreground">{activity.approaches.length}</span></div>
        {activity.approaches.length ? <ol className="mt-4 divide-y border-y">{activity.approaches.map((approach) => { const id = string(approach, "id", "approach_id"); const version = number(approach, "version"); return <li key={id} className="py-5"><div className="flex flex-wrap items-center gap-2"><h3 className="text-subtitle">{string(approach, "title")}</h3><Badge variant="outline">v{version}</Badge>{string(approach, "parentApproachId", "parent_approach_id") ? <Badge variant="secondary">fork</Badge> : null}</div><p className="mt-2 text-body text-muted-foreground">{string(approach, "summary")}</p>
          <div className="mt-4"><WorkAction compact title="Continue this direction" description="Fork it or start a bounded attempt only when needed.">
            <div className="grid gap-6">
              <form action={forkApproachAction} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><ScopeFields scope={scope} /><input type="hidden" name="approachId" value={id} /><input type="hidden" name="expectedVersion" value={version} /><FormField label="Fork title" name="title" placeholder="Optional fork title" required={false} /><Button type="submit" size="sm" variant="outline">Fork approach</Button></form>
              <form action={createAttemptAction} className="grid gap-3 border-t pt-5 sm:grid-cols-2"><ScopeFields scope={scope} /><input type="hidden" name="approachId" value={id} /><FormField label="Attempt title" name="title" placeholder="Test the finite case" /><FormField label="Provider" name="provider" placeholder="human, Codex, local runner…" /><FormField label="Provider session reference" name="externalSessionId" placeholder="Optional external ID" required={false} /><FormField label="External locator" name="locator" placeholder="Optional https:// or local locator" required={false} /><Button className="w-fit sm:col-span-2" type="submit" size="sm">Start planned attempt</Button></form>
            </div>
          </WorkAction></div>
        </li>; })}</ol> : <p className="mt-4 border border-dashed p-5 text-body text-muted-foreground">No approach yet. Name a direction before starting an attempt.</p>}
      </div>
      <WorkAction title="New approach" description="Name a direction before starting an attempt."><form action={createApproachAction} className="space-y-4"><ScopeFields scope={scope} /><FormField label="Title" name="title" placeholder="Reduce to a finite obstruction" /><div className="grid gap-1.5"><Label htmlFor="approach-summary">Summary</Label><Textarea id="approach-summary" name="summary" required placeholder="What direction will this explore, and what would falsify it?" /></div><Button type="submit">Create approach</Button></form></WorkAction>
    </section>

    <section id="attempts" aria-labelledby="attempts-heading" className="scroll-mt-20"><div className="flex items-end justify-between"><div><p className="text-eyebrow uppercase text-muted-foreground">Execution</p><h2 id="attempts-heading" className="mt-1 text-title">Attempts</h2></div><span className="font-mono text-meta text-muted-foreground">{activity.attempts.length}</span></div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">{activity.attempts.map((attempt) => { const id = string(attempt, "id", "attempt_id"); const version = number(attempt, "version"); const attemptState = string(attempt, "state", "status") || "planned"; return <article key={id} className="border p-4"><div className="flex flex-wrap items-center gap-2"><h3 className="text-subtitle">{string(attempt, "title")}</h3><Badge>{attemptState}</Badge><Badge variant="outline">v{version}</Badge></div><p className="mt-2 text-meta text-muted-foreground">Provider: {string(attempt, "provider") || "unspecified"}</p><form action={updateAttemptAction} className="mt-4 flex flex-wrap items-end gap-2"><ScopeFields scope={scope} /><input type="hidden" name="attemptId" value={id} /><input type="hidden" name="expectedVersion" value={version} /><div><Label htmlFor={`state-${id}`}>Lifecycle</Label><select id={`state-${id}`} name="state" defaultValue={attemptState} className="mt-1 h-11 border bg-background px-3"><option>planned</option><option>running</option><option>paused</option><option>completed</option><option>failed</option><option>abandoned</option></select></div><Button type="submit" size="sm" variant="outline">Update</Button></form></article>; })}</div>
    </section>

    <section className="grid gap-6 lg:grid-cols-2">
      <div id="notes" className="scroll-mt-20"><WorkAction title="Add a note" description="Record reasoning for the workspace or keep it private."><form action={addDiscussionAction} className="space-y-4"><ScopeFields scope={scope} /><div className="grid grid-cols-2 gap-3"><label className="grid gap-1 text-meta">Kind<select name="kind" className="h-11 border bg-background px-3"><option value="note">Note</option><option value="comment">Comment</option></select></label><label className="grid gap-1 text-meta">Visibility<select name="visibility" className="h-11 border bg-background px-3"><option value="workspace">Workspace</option><option value="private">Private</option></select></label></div><Textarea name="body" required placeholder="What changed your view of this Problem?" /><Button type="submit">Add entry</Button><p className="text-meta text-muted-foreground">Private notes are visible only to their author.</p></form></WorkAction>
        <ul aria-label="Problem discussion" className="mt-3 divide-y border-y">{activity.discussion.map((entry) => <li key={string(entry, "id")} className="py-4"><div className="flex flex-wrap gap-2"><Badge variant="outline">{string(entry, "kind")}</Badge><Badge variant="secondary">{string(entry, "visibility")}</Badge></div><p className="mt-2 whitespace-pre-wrap text-body">{string(entry, "body")}</p></li>)}</ul></div>
      <div id="requests" className="scroll-mt-20"><WorkAction title="Request work" description="Assign a task or ask for an independent reproduction."><form action={createWorkRequestAction} className="space-y-4"><ScopeFields scope={scope} /><label className="grid gap-1 text-meta">Request type<select name="kind" className="h-11 border bg-background px-3"><option value="assignment">Assignment</option><option value="reproduction">Reproduction request</option></select></label><FormField label="Title" name="title" placeholder="Reproduce the bounded search" /><div className="grid gap-1.5"><Label htmlFor="request-detail">Instructions</Label><Textarea id="request-detail" name="detail" required placeholder="Scope, expected evidence, and completion condition" /></div><Button type="submit">Create request</Button></form></WorkAction>
        <ul aria-label="Work requests" className="mt-3 divide-y border-y">{activity.workRequests.map((request) => <li key={string(request, "id")} className="py-4"><div className="flex flex-wrap gap-2"><Badge variant="outline">{string(request, "kind")}</Badge><Badge>{string(request, "state")}</Badge></div><p className="mt-2 font-medium">{string(request, "title")}</p><p className="mt-1 text-meta text-muted-foreground">{string(request, "detail")}</p></li>)}</ul></div>
    </section>

    <section id="evidence" aria-labelledby="artifacts-heading" className="scroll-mt-20 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"><div><p className="text-eyebrow uppercase text-muted-foreground">Evidence references</p><h2 id="artifacts-heading" className="mt-1 text-title">Rooted artifacts</h2><p className="mt-2 max-w-prose text-body text-muted-foreground">Only roots, metadata, sizes, paths, and locators live here. Artifact bytes remain in Git, object storage, or the researcher&apos;s machine.</p><ul className="mt-4 divide-y border-y">{activity.artifacts.map((artifact) => <li key={string(artifact, "id", "artifact_id")} className="py-4"><div className="flex flex-wrap gap-2"><Badge variant="outline">{string(artifact, "kind")}</Badge><span className="font-mono text-meta break-all">{string(artifact, "contentRoot", "content_root", "digest")}</span></div><p className="mt-1 text-meta text-muted-foreground">{string(artifact, "path")}</p></li>)}</ul></div>
      <WorkAction title="Attach evidence" description="Reference a rooted artifact without uploading its bytes."><form action={attachArtifactAction} className="space-y-4"><ScopeFields scope={scope} /><FormField label="Kind" name="kind" placeholder="proof, dataset, transcript…" /><FormField label="Repository-relative path" name="path" placeholder="artifacts/result.json" /><FormField label="SHA-256 root" name="contentRoot" placeholder="sha256:…" /><FormField label="Locator" name="locator" placeholder="Optional external locator" required={false} /><FormField label="Media type" name="mediaType" placeholder="application/json" required={false} /><FormField label="Byte size" name="byteSize" placeholder="Optional" required={false} type="number" /><Button type="submit">Attach evidence</Button></form></WorkAction>
    </section>

    <section aria-labelledby="draft-heading" className="border-t pt-8"><div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"><div><p className="text-eyebrow uppercase text-muted-foreground">Portable handoff</p><h2 id="draft-heading" className="mt-1 text-title">Unsigned <code>vela.submission.v2</code> draft</h2><p className="mt-2 max-w-prose text-body text-muted-foreground">The server validates the public schema and semantic identity binding, then exports canonical payload bytes. Signing happens locally with a user-controlled key. Your WorkOS identity is never inserted.</p>{activity.drafts.length ? <ul className="mt-5 divide-y border-y">{activity.drafts.map((draft) => { const id = string(draft, "id", "draft_id"); return <li key={id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-mono text-meta">{string(draft, "payloadRoot", "payload_root")}</p><p className="mt-1 text-meta text-muted-foreground">Unsigned · schema validated</p></div><Button nativeButton={false} size="sm" variant="outline" render={<Link href={`/drafts/${id}/export?workspace=${workspace.id}`} />}>Export draft</Button></li>; })}</ul> : null}</div><aside className="border-l-2 border-foreground pl-4 text-meta"><p className="font-medium">Local authority handoff</p><p className="mt-2 text-muted-foreground">The response headers bind the exact payload root and payload type; the package&apos;s local helper signs the exported schema-valid JSON. The hosted service cannot silently sign.</p></aside></div>
      <div className="mt-6"><WorkAction title="Prepare a portable draft" description="Open the exact schema only when the work is ready to leave the workspace.">
        <form action={saveSubmissionDraftAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><ScopeFields scope={scope} /><FormField label="Vela agent actor ID" name="actorId" placeholder="agent:my-research-agent" /><FormField label="Ed25519 public key (hex)" name="publicKey" placeholder="64 lowercase hex characters" /><label className="grid gap-1 text-meta">Requested change<select name="requestedChange" className="h-11 border bg-background px-3"><option value="add_claim">Add Claim</option>{state.anchor.claimId ? <><option value="correct_claim">Correct bound Claim</option><option value="supersede_claim">Supersede bound Claim</option><option value="retract_claim">Retract bound Claim</option></> : null}</select></label><div className="grid gap-1.5 sm:col-span-2 lg:col-span-3"><Label htmlFor="draft-assertion">Claim assertion</Label><Textarea id="draft-assertion" name="assertion" required placeholder="The exact assertion this Submission proposes" /></div><label className="grid gap-1 text-meta">Claim type<select name="claimType" className="h-11 border bg-background px-3"><option>theoretical</option><option>computational</option><option>empirical</option><option>negative</option><option>contradiction</option></select></label><FormField label="Condition" name="condition" placeholder="Optional explicit condition" required={false} /><label className="grid gap-1 text-meta">Replayability<select name="replayability" className="h-11 border bg-background px-3"><option>exact</option><option>bounded</option><option>approximate</option><option>unavailable</option><option>unknown</option></select></label><FormField label="Artifact kind" name="artifactKind" placeholder="proof" /><FormField label="Artifact path" name="artifactPath" placeholder="artifacts/proof.lean" /><FormField label="Artifact root" name="artifactRoot" placeholder="sha256:…" /><FormField label="Caveat" name="caveat" placeholder="What this does not establish" /><FormField label="Producer check" name="checkMethod" placeholder="lake build" /><label className="grid gap-1 text-meta">Check outcome<select name="checkOutcome" className="h-11 border bg-background px-3"><option>pass</option><option>fail</option><option>error</option><option>skipped</option><option>unknown</option></select></label><div className="sm:col-span-2 lg:col-span-3"><FormField label="Verification requirement" name="verificationRequirement" placeholder="Independent statement-fidelity review" /></div><Button className="w-fit sm:col-span-2 lg:col-span-3" type="submit">Validate and save unsigned draft</Button>
        </form>
      </WorkAction></div>
    </section>

    <details className="border-t pt-5"><summary className="cursor-pointer text-subtitle">Append-only activity audit · {activity.audit.length}</summary><ol className="mt-4 max-h-80 overflow-auto divide-y border-y">{activity.audit.map((entry) => <li key={String(entry.sequence)} className="grid gap-1 py-3 text-meta sm:grid-cols-[5rem_12rem_minmax(0,1fr)]"><span className="font-mono">#{String(entry.sequence)}</span><span>{string(entry, "operation")}</span><span className="break-all font-mono text-muted-foreground">{string(entry, "request_root")}</span></li>)}</ol></details>
  </div>;
}
