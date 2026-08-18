import Link from "next/link";
import {
  ActivityDataError,
  assessAnchorFreshness,
  ensureCurrentAccount,
  getProblemActivity,
  listProblemWorkspaces,
  scientificAnchorRoot,
  type ProblemActivity,
  type ScientificAnchor,
  type Workspace,
} from "@vela/activity-data";
import { Alert, AlertDescription, AlertTitle } from "@vela/ui/components/alert";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { Input } from "@vela/ui/components/input";
import { Label } from "@vela/ui/components/label";
import { Textarea } from "@vela/ui/components/textarea";
import { RootedArtifactFrame } from "@vela/ui/vela/rooted-artifact-frame";
import { IdempotencyField } from "@/components/vela/idempotency-field";
import { currentReview } from "@/components/vela/problem-provenance";
import type { AccountIdentity } from "@/lib/auth";
import type { ScientificProblemState } from "@/lib/scientific-state";
import { FormSelect } from "@/components/vela/form-select";
import { RecordId } from "@/components/vela/record-id";
import { WorkAction } from "@/components/vela/work-action";
import { WorkspaceShell } from "@/components/vela/workspace-shell";
import { WorkspaceCrdtNote } from "@/components/vela/workspace-crdt-note";
import type {
  WorkspaceAnchorState,
  WorkspaceAuditEntry,
  WorkspaceInspectorTab,
  WorkspaceObject,
  WorkspaceDiscussionEntry,
} from "@/components/vela/workspace-types";
import {
  addDiscussionAction,
  appendWorkspaceCrdtUpdateAction,
  attachArtifactAction,
  createApproachAction,
  createAttemptAction,
  createWorkspaceAction,
  followProblemAction,
  forkApproachAction,
  saveSubmissionDraftAction,
  updateAttemptAction,
} from "@/app/actions/activity";

type State = NonNullable<ScientificProblemState>;
type Scope = { repository: string; problem: string; workspaceId: string; expectedAnchorRoot: string };

function ScopeFields({ scope }: { scope: Scope }) {
  return <><input type="hidden" name="repository" value={scope.repository} /><input type="hidden" name="problem" value={scope.problem} /><input type="hidden" name="workspaceId" value={scope.workspaceId} /><input type="hidden" name="expectedAnchorRoot" value={scope.expectedAnchorRoot} /><IdempotencyField /></>;
}

/* Mirror of the transition CHECK in `activity_api.update_attempt`: the SQL
 * stays the enforcer, this map only stops the form from offering a move the
 * database will refuse with a generic alert. Terminal states offer nothing —
 * a completed, failed, or abandoned Attempt is closed. */
const ATTEMPT_TRANSITIONS: Record<string, Array<{ value: string; label: string }>> = {
  planned: [{ value: "running", label: "Running" }, { value: "abandoned", label: "Abandoned" }],
  running: [{ value: "paused", label: "Paused" }, { value: "completed", label: "Completed" }, { value: "failed", label: "Failed" }, { value: "abandoned", label: "Abandoned" }],
  paused: [{ value: "running", label: "Running" }, { value: "abandoned", label: "Abandoned" }],
};

function FormField({ label, name, placeholder, required = true, value, type = "text" }: { label: string; name: string; placeholder?: string; required?: boolean; value?: string; type?: string }) {
  const id = `${name}-${value ?? placeholder ?? "field"}`.toLowerCase().replace(/[^a-z0-9_-]+/gu, "-").replace(/^-+|-+$/gu, "");
  return <div className="grid gap-1.5"><Label htmlFor={id}>{label}</Label><Input id={id} name={name} placeholder={placeholder} required={required} defaultValue={value} type={type} /></div>;
}

function StaleActivityNotice() {
  return <Alert className="mt-5 bg-muted/30"><AlertTitle>Earlier activity anchor</AlertTitle><AlertDescription>This record remains readable, but controls are unavailable because its exact Problem or Repository anchor is no longer current. Start a new Approach from the current Problem instead of silently editing historical context.</AlertDescription></Alert>;
}

function EmptyWorkspace({ state, accountId }: { state: State; accountId: string }) {
  void accountId;
  const sourceTitle = state.source?.title ?? `Problem ${state.problem.problem}`;
  const sourceCount = state.sources?.occurrences?.length ?? 0;
  return <section aria-labelledby="empty-workspace-heading" className="mt-6 min-w-0">
    <header className="flex flex-wrap items-center justify-between gap-3"><h2 id="empty-workspace-heading" className="text-title">Workspace</h2><Badge variant="outline">signed in</Badge></header>
    <div className="mt-5 overflow-hidden rounded-xl border bg-background lg:grid lg:min-h-[34rem] lg:grid-cols-[15rem_minmax(0,1fr)_16rem]">
      <nav aria-label="Problem files" className="border-b bg-muted/15 p-4 lg:border-b-0 lg:border-r"><p className="text-eyebrow uppercase text-muted-foreground">Files</p><Link href={`?view=sources`} className="mt-3 block rounded-lg border bg-background p-3 hover:bg-muted/30"><span className="block truncate text-label font-medium">{sourceTitle}</span><span className="mt-1 block text-micro text-muted-foreground">{sourceCount} retained source records</span></Link></nav>
      <div className="min-w-0 border-b p-4 lg:border-b-0 lg:p-6"><p className="text-eyebrow uppercase text-muted-foreground">Canvas</p><div className="mt-5 rounded-xl border border-dashed bg-muted/10 p-5 sm:p-7"><h3 className="text-subtitle">Start a workspace</h3><p className="mt-1 text-compact text-muted-foreground">Keep notes, Research Blocks, and a contribution draft with this Problem.</p><form action={createWorkspaceAction} className="mt-6 grid gap-4 sm:max-w-lg"><input type="hidden" name="repository" value={state.repositorySlug} /><input type="hidden" name="problem" value={state.problem.problem} /><IdempotencyField /><FormField label="Workspace name" name="name" placeholder="Problem working group" /><FormField label="URL slug" name="slug" placeholder="problem-working-group" /><Button className="w-fit" type="submit">Create workspace</Button></form></div></div>
      <aside aria-label="Workspace tools" className="p-4 lg:border-l"><p className="text-eyebrow uppercase text-muted-foreground">Workspace tools</p><ul className="mt-3 divide-y border-y text-compact"><li className="py-3"><span className="font-medium">Research Blocks</span><span className="block text-micro text-muted-foreground">No items</span></li><li className="py-3"><span className="font-medium">Notes</span><span className="block text-micro text-muted-foreground">No notes</span></li><li className="py-3"><span className="font-medium">Contribution draft</span><span className="block text-micro text-muted-foreground">Not started</span></li></ul><p className="mt-4 text-micro text-muted-foreground">Account access manages workspace membership only.</p></aside>
    </div>
  </section>;
}

function ActivityUnavailable({ code }: { code: ActivityDataError["code"] | "unknown" }) {
  const message = code === "unauthorized"
    ? "This account is not a member of the selected Workspace."
    : code === "not_found"
      ? "The selected Workspace no longer exists."
      : "Workspace activity could not be read. Scientific State remains available.";
  return <Alert variant="destructive" className="mt-8"><AlertTitle>Workspace unavailable</AlertTitle><AlertDescription>{message} Reload the page or choose another Workspace.</AlertDescription></Alert>;
}

function MutationError({ code }: { code?: string }) {
  if (!code) return null;
  const title = code === "conflict" ? "A newer version is available" : "Workspace action refused";
  const body = code === "conflict"
    ? "Another update advanced this activity record. Reloaded values are shown below; review them before trying the action again."
    : code === "unauthorized"
      ? "Your current account no longer has permission to change this Workspace."
      : "No activity change was retained. Review the fields and current scientific anchor before trying again.";
  return <Alert variant="destructive" className="mb-4"><AlertTitle>{title}</AlertTitle><AlertDescription>{body}</AlertDescription></Alert>;
}

/* Three paragraphs explaining what a Workspace is sat above every Workspace,
   signed in or out, filling most of the first screen before any object. The
   reader is already in the Workspace; what they need from this band is the two
   links out of it. The boundary it described is still stated where it binds —
   on the canvas note, on the draft export, and in the documentation — rather
   than restated above work that is already underway. */
function NewApproachForm({ scope }: { scope: Scope }) {
  return <form action={createApproachAction} className="space-y-4"><ScopeFields scope={scope} /><FormField label="Title" name="title" placeholder="Reduce to a finite obstruction" /><div className="grid gap-1.5"><Label htmlFor="approach-summary">Summary</Label><Textarea id="approach-summary" name="summary" required placeholder="What will this direction test, and what would falsify it?" /></div><Button type="submit">Create approach</Button></form>;
}

/* Scoped when rendered inside an Approach or Attempt pane: the entry names
 * the object it discusses, which is what lets the inspector's per-object
 * discussion filter match anything. The overview's form stays unscoped. */
function AddNoteForm({ scope, approachId, attemptId }: { scope: Scope; approachId?: string; attemptId?: string }) {
  return <form action={addDiscussionAction} className="space-y-4"><ScopeFields scope={scope} />{approachId ? <input type="hidden" name="approachId" value={approachId} /> : null}{attemptId ? <input type="hidden" name="attemptId" value={attemptId} /> : null}<div className="grid grid-cols-2 gap-3"><FormSelect label="Kind" name="kind" options={[{ value: "note", label: "Note" }, { value: "comment", label: "Comment" }]} /><FormSelect label="Visibility" name="visibility" options={[{ value: "workspace", label: "Workspace" }, { value: "private", label: "Private" }]} /></div><Textarea name="body" required placeholder="What changed your view of this Problem?" /><Button type="submit">Add entry</Button><p className="text-meta text-muted-foreground">Private notes are visible only to their author.</p></form>;
}

function ResearchBlockForm({ scope, attempts }: { scope: Scope; attempts: ProblemActivity["attempts"] }) {
  if (!attempts.length) return <Alert className="bg-muted/30"><AlertTitle>Start an Attempt first</AlertTitle><AlertDescription>A new Research Block must name the exact Attempt that produced it.</AlertDescription></Alert>;
  return <form action={attachArtifactAction} className="grid gap-4 sm:grid-cols-2"><ScopeFields scope={scope} /><div className="sm:col-span-2"><FormSelect label="Producing Attempt" name="attemptId" options={attempts.map((attempt) => ({ value: attempt.id, label: attempt.title }))} /><p className="mt-1.5 text-meta text-muted-foreground">The selected Attempt supplies this evidence&apos;s Problem and approach scope; no internal scope label is required.</p></div><FormSelect label="Evidence type" name="kind" options={[{ value: "proof", label: "Proof or proof attempt" }, { value: "computation", label: "Computation" }, { value: "dataset", label: "Dataset" }, { value: "review", label: "Review" }, { value: "negative-result", label: "Negative result" }, { value: "correction", label: "Correction" }, { value: "other", label: "Other bounded evidence" }]} /><FormField label="Artifact reference path" name="path" placeholder="artifacts/result.json" /><div className="sm:col-span-2"><FormField label="SHA-256 root" name="contentRoot" placeholder="sha256:…" /></div><FormField label="Locator" name="locator" placeholder="Optional external locator" required={false} /><FormField label="Media type" name="mediaType" placeholder="application/json" required={false} /><FormField label="Byte size" name="byteSize" placeholder="Optional" required={false} type="number" /><Button className="w-fit self-end" type="submit">Retain evidence reference</Button></form>;
}

function DraftForm({ scope, state, artifacts, drafts }: { scope: Scope; state: State; artifacts: ProblemActivity["artifacts"]; drafts: ProblemActivity["drafts"] }) {
  if (!artifacts.length) return <Alert className="bg-muted/30"><AlertTitle>Retain a Research Block first</AlertTitle><AlertDescription>The handoff derives its Artifact from one exact hosted Research Block. It does not ask you to retype roots that could drift.</AlertDescription></Alert>;
  /* One draft per anchor, revised in place. Saving used to mint a sibling
     draft on every submit — the SQL update branch existed and the form never
     named a draft to update — so the object tree grew one near-duplicate per
     save with no way to tell which was current. */
  const draft = drafts[0] ?? null;
  return <form action={saveSubmissionDraftAction} className="grid gap-4 sm:grid-cols-2"><ScopeFields scope={scope} />{draft ? <><input type="hidden" name="draftId" value={draft.id} /><input type="hidden" name="expectedVersion" value={draft.version} /><p className="text-meta text-muted-foreground sm:col-span-2">Saving revises the existing unsigned draft (v{draft.version}) for this anchor.</p></> : null}<div className="sm:col-span-2"><FormSelect label="Research Block" name="researchBlockId" options={artifacts.map((artifact) => ({ value: artifact.id, label: artifact.path }))} /></div><FormField label="Vela agent actor ID" name="actorId" placeholder="agent:my-research-agent" /><FormField label="Ed25519 public key (hex)" name="publicKey" placeholder="64 lowercase hex characters" /><FormSelect label="Requested change" name="requestedChange" options={[{ value: "add_claim", label: "Add Claim" }, ...(state.anchor.claimId ? [{ value: "correct_claim", label: "Correct bound Claim" }, { value: "supersede_claim", label: "Supersede bound Claim" }, { value: "retract_claim", label: "Retract bound Claim" }] : [])]} /><FormSelect label="Claim type" name="claimType" options={[{ value: "theoretical", label: "Theoretical" }, { value: "computational", label: "Computational" }, { value: "empirical", label: "Empirical" }, { value: "negative", label: "Negative" }, { value: "contradiction", label: "Contradiction" }]} /><div className="sm:col-span-2"><Label htmlFor="draft-assertion">Claim assertion</Label><Textarea id="draft-assertion" name="assertion" required placeholder="The exact assertion this Submission proposes" /></div><FormField label="Condition" name="condition" placeholder="Optional explicit condition" required={false} /><FormSelect label="Replayability" name="replayability" options={[{ value: "exact", label: "Exact" }, { value: "bounded", label: "Bounded" }, { value: "approximate", label: "Approximate" }, { value: "unavailable", label: "Unavailable" }, { value: "unknown", label: "Unknown" }]} /><FormField label="Caveat" name="caveat" placeholder="What this does not establish" /><FormField label="Producer check" name="checkMethod" placeholder="lake build" /><FormSelect label="Check outcome" name="checkOutcome" options={[{ value: "pass", label: "Pass" }, { value: "fail", label: "Fail" }, { value: "error", label: "Error" }, { value: "skipped", label: "Skipped" }, { value: "unknown", label: "Unknown" }]} /><div className="sm:col-span-2"><FormField label="Verification requirement" name="verificationRequirement" placeholder="Independent statement-fidelity review" /></div><Button className="w-fit sm:col-span-2" type="submit">Validate and save unsigned draft</Button></form>;
}

export function EmptyHostedWorkspace({ state, accountId }: { state: State; accountId: string }) {
  return <EmptyWorkspace state={state} accountId={accountId} />;
}

function UnavailableHostedWorkspace({ state, code }: { state: State; code: ActivityDataError["code"] | "unknown" }) {
  void state;
  return <ActivityUnavailable code={code} />;
}

export function workspaceObjects({ state, activity, workspace, scope, currentAnchorRoot }: { state: State; activity: ProblemActivity; workspace: Workspace; scope: Scope; currentAnchorRoot: string }): WorkspaceObject[] {
  const isCurrent = (row: { anchorRoot: string }) => row.anchorRoot === currentAnchorRoot;
  const anchorMeta = (row: { anchorRoot: string }) => isCurrent(row) ? "current anchor" : "stale anchor";
  const objects: WorkspaceObject[] = [];

  objects.push({
    id: "workspace",
    group: "work",
    kind: "overview",
    label: workspace.name,
    summary: "The selected hosted activity context for this Problem.",
    meta: `${activity.approaches.length} approaches · ${activity.attempts.length} attempts · ${activity.artifacts.length} Research Blocks`,
    version: workspace.version,
    anchorRoot: currentAnchorRoot,
    content: <div><p className="text-eyebrow uppercase text-muted-foreground">Workspace overview</p><h2 className="mt-1 text-title">{workspace.name}</h2><p className="mt-2 max-w-2xl text-body text-muted-foreground">Move from a shared direction to an Attempt, an attached Research Block, review, and—when ready—an explicit local handoff.</p><p className="mt-3 max-w-2xl text-meta text-muted-foreground">This shared Workspace does not store generic agent sessions, transcripts, or checkpoints. Those remain in their native tools; an exact reference can be attached when it helps explain a Contribution.</p><dl className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-muted/25 p-4"><dt className="text-meta text-muted-foreground">Approaches</dt><dd className="mt-1 font-mono text-subtitle">{activity.approaches.length}</dd></div><div className="rounded-lg bg-muted/25 p-4"><dt className="text-meta text-muted-foreground">Attempts</dt><dd className="mt-1 font-mono text-subtitle">{activity.attempts.length}</dd></div><div className="rounded-lg bg-muted/25 p-4"><dt className="text-meta text-muted-foreground">Research Blocks</dt><dd className="mt-1 font-mono text-subtitle">{activity.artifacts.length}</dd></div></dl><div className="mt-8 grid gap-3"><WorkAction title="New Approach" description="Name a direction for this Problem."><NewApproachForm scope={scope} /></WorkAction><WorkAction title="Add a note" description="Share reasoning in this Workspace or keep it private."><AddNoteForm scope={scope} /></WorkAction><WorkAction title="Attach contribution evidence" description="Attach one Attempt result by exact root; artifact bytes remain at the selected external location."><ResearchBlockForm scope={scope} attempts={activity.attempts.filter(isCurrent)} /></WorkAction><WorkAction title="Prepare repository handoff" description="Build a portable unsigned payload to inspect and sign in your chosen local tool."><DraftForm scope={scope} state={state} artifacts={activity.artifacts.filter(isCurrent)} drafts={activity.drafts.filter(isCurrent)} /></WorkAction></div></div>,
    detail: <div className="text-meta text-muted-foreground"><p>Hosted records can reference exact State, but they do not change it.</p><p className="mt-2">Authority effect: <strong className="font-medium text-foreground">none</strong>.</p></div>,
  });

  objects.push({
    id: `codebase:${state.repositorySlug}`,
    group: "outputs",
    kind: "codebase",
    label: `${state.repositoryName} codebase`,
    summary: "The exact source revision and repository context for this Problem.",
    meta: `source ${state.anchor.sourceCommit?.slice(0, 8) ?? "unavailable"}`,
    anchorRoot: currentAnchorRoot,
    inspectorLabel: "source code",
    content: <div><div className="flex flex-wrap items-center gap-2"><p className="text-eyebrow uppercase text-muted-foreground">Codebase</p><Badge variant="outline">exact source revision</Badge><Badge variant="secondary">read only</Badge></div><h2 className="mt-2 text-title">{state.repositoryName}</h2><p className="mt-3 max-w-3xl text-body text-muted-foreground">Browse the scientific source at its retained revision. Local edits, builds, private branches, runtimes, work provenance, and signing stay outside this hosted Workspace; rooted outputs can return as Research Blocks.</p><dl className="mt-6 grid gap-4 text-meta sm:grid-cols-2"><div><dt className="text-muted-foreground">Source commit</dt><dd className="mt-1">{state.anchor.sourceCommit ? <RecordId value={state.anchor.sourceCommit} /> : "Unavailable"}</dd></div><div><dt className="text-muted-foreground">Source tree</dt><dd className="mt-1">{state.anchor.sourceTree ? <RecordId value={state.anchor.sourceTree} /> : "Unavailable"}</dd></div><div className="sm:col-span-2"><dt className="text-muted-foreground">Repository root</dt><dd className="mt-1"><RecordId value={state.anchor.repositoryRoot} /></dd></div></dl><div className="mt-6 flex flex-wrap gap-3"><Button nativeButton={false} variant="outline" render={<Link href={`/repositories/${state.repositorySlug}`} />}>Repository record</Button>{state.locator ? <Button nativeButton={false} render={<a href={state.locator} />}>Browse exact source</Button> : null}</div></div>,
    detail: <p className="text-meta text-muted-foreground">Any compatible tool may work from this revision and return a rooted Research Block. Generic Git-work provenance belongs to Entire when capture is available; it is omitted here.</p>,
  });

  for (const approach of activity.approaches) {
    const id = approach.id;
    const current = isCurrent(approach);
    const version = approach.version;
    const summary = approach.summary || "No summary retained.";
    const bindingDetail = <div className="text-meta text-muted-foreground"><p>Problem-scoped activity direction</p><p className="mt-2">Authority effect: <strong className="font-medium text-foreground">{approach.authorityEffect}</strong>.</p></div>;
    objects.push({ id: `approach:${id}`, recordId: id, parentId: approach.parentApproachId ? `approach:${approach.parentApproachId}` : null, group: "work", kind: "approach", label: approach.title || "Untitled approach", summary, meta: `problem direction · ${approach.state} · ${anchorMeta(approach)}`, version, anchorRoot: approach.anchorRoot, content: <div><div className="flex flex-wrap items-center gap-2"><p className="text-eyebrow uppercase text-muted-foreground">Approach · {approach.state}</p><Badge variant="secondary">Problem direction</Badge><Badge variant="secondary">authority none</Badge></div><h2 className="mt-2 text-title">{approach.title}</h2><p className="mt-3 max-w-3xl whitespace-pre-wrap text-body text-muted-foreground">{summary}</p>{current ? <div className="mt-7"><WorkAction title="Continue this direction" description="Fork the Approach or start one bounded Attempt."><div className="grid gap-6"><form action={forkApproachAction} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><ScopeFields scope={scope} /><input type="hidden" name="approachId" value={id} /><input type="hidden" name="expectedVersion" value={version} /><FormField label="Fork title" name="title" placeholder="Optional fork title" required={false} /><Button type="submit" size="sm" variant="outline">Fork approach</Button></form><form action={createAttemptAction} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><ScopeFields scope={scope} /><input type="hidden" name="approachId" value={id} /><FormField label="Attempt title" name="title" placeholder="Test the finite case" /><Button className="w-fit" type="submit" size="sm">Start Attempt</Button></form></div></WorkAction><div className="mt-5"><WorkAction title="Discuss this Approach" description="Retain a note on this exact Approach."><AddNoteForm scope={scope} approachId={id} /></WorkAction></div></div> : <StaleActivityNotice />}</div>, detail: bindingDetail });
  }

  for (const attempt of activity.attempts) {
    const id = attempt.id;
    const current = isCurrent(attempt);
    const version = attempt.version;
    const attemptState = attempt.state;
    objects.push({ id: `attempt:${id}`, recordId: id, parentId: `approach:${attempt.approachId}`, group: "work", kind: "attempt", label: attempt.title || "Untitled Attempt", summary: `Bounded Attempt; current lifecycle state is ${attemptState}.`, meta: `${attemptState} · ${anchorMeta(attempt)}`, version, anchorRoot: attempt.anchorRoot, content: <div><div className="flex flex-wrap items-center gap-2"><p className="text-eyebrow uppercase text-muted-foreground">Attempt</p><Badge>{attemptState}</Badge><Badge variant="outline">Problem-scoped</Badge><Badge variant="outline">v{version}</Badge></div><h2 className="mt-2 text-title">{attempt.title}</h2><p className="mt-3 max-w-3xl text-meta text-muted-foreground">This record captures the bounded relationship between an Approach and its Contributions. Generic performer, session, transcript, checkpoint, and resume provenance is omitted; consult Entire outside Vela when it was captured.</p>{current ? <>{(ATTEMPT_TRANSITIONS[attemptState] ?? []).length ? <form action={updateAttemptAction} className="mt-7 flex flex-wrap items-end gap-3 rounded-lg bg-muted/25 p-4"><ScopeFields scope={scope} /><input type="hidden" name="attemptId" value={id} /><input type="hidden" name="expectedVersion" value={version} /><FormSelect label="Move to" name="state" options={ATTEMPT_TRANSITIONS[attemptState]!} /><Button type="submit" size="sm" variant="outline">Update Attempt</Button></form> : <p className="mt-7 text-meta text-muted-foreground">This Attempt is closed as <span className="font-medium text-foreground">{attemptState}</span>; a closed Attempt keeps its record.</p>}<div className="mt-5"><WorkAction title="Discuss this Attempt" description="Retain a note on this exact Attempt."><AddNoteForm scope={scope} attemptId={id} /></WorkAction></div></> : <StaleActivityNotice />}</div> });
  }

  for (const artifact of activity.artifacts) {
    const id = artifact.id;
    objects.push({ id: `artifact:${id}`, recordId: id, parentId: artifact.attemptId ? `attempt:${artifact.attemptId}` : null, group: "outputs", kind: "research-block", label: artifact.path, summary: `${artifact.kind} retained by exact content root.`, meta: `Problem-scoped · ${anchorMeta(artifact)}`, anchorRoot: artifact.anchorRoot, content: <div><div className="flex flex-wrap items-center gap-2"><p className="text-eyebrow uppercase text-muted-foreground">Research Block · exact hosted Artifact reference</p><Badge variant="outline">Problem-scoped</Badge><Badge variant="secondary">authority none</Badge></div><h2 className="mt-2 text-title">{artifact.path}</h2><p className="mt-3 max-w-3xl text-body text-muted-foreground">A durable contribution reference. The Workspace retains its root and bounded metadata; bytes remain at the named external custody location.</p><div className="mt-6"><RootedArtifactFrame artifact={{ kind: artifact.kind, path: artifact.path, contentRoot: artifact.contentRoot, byteSize: artifact.byteSize, mediaType: artifact.mediaType, locator: artifact.locator }} /></div>{isCurrent(artifact) ? null : <StaleActivityNotice />}</div> });
  }

  for (const draft of activity.drafts) {
    const id = draft.id;
    objects.push({ id: `draft:${id}`, recordId: id, parentId: null, group: "outputs", kind: "draft", label: "Unsigned Submission draft", summary: "Anchor-scoped, schema-validated canonical payload bytes awaiting a local signing handoff.", meta: `Problem-scoped · ${anchorMeta(draft)}`, version: draft.version, anchorRoot: draft.anchorRoot, content: <div><div className="flex flex-wrap items-center gap-2"><p className="text-eyebrow uppercase text-muted-foreground">Portable handoff</p><Badge variant="outline">Problem-scoped</Badge><Badge variant="secondary">unsigned</Badge></div><h2 className="mt-2 text-title">Unsigned <code>vela.submission.v3</code></h2><p className="mt-3 max-w-3xl text-body text-muted-foreground">The hosted service validated the public schema. It cannot sign this payload, issue a Decision, or change Standing.</p><p className="mt-6"><RecordId value={draft.payloadRoot} /></p><Button className="mt-5" nativeButton={false} variant="outline" render={<Link href={`/drafts/${id}/export?workspace=${workspace.id}`} />}>Export canonical unsigned bytes</Button>{isCurrent(draft) ? null : <StaleActivityNotice />}</div> });
  }

  return objects;
}

type WorkspaceLoad =
  | { status: "empty"; accountId: string }
  | { status: "error"; code: ActivityDataError["code"] | "unknown" }
  | {
      status: "ready";
      workspaces: Workspace[];
      workspace: Workspace;
      scope: Scope;
      currentAnchor: ScientificAnchor;
      currentAnchorRoot: string;
      activity: ProblemActivity;
    };

async function loadWorkspace(state: State, hostedAccount: AccountIdentity, selectedWorkspace?: string): Promise<WorkspaceLoad> {
  try {
    const account = await ensureCurrentAccount({ workosUserId: hostedAccount.id, displayName: hostedAccount.displayName, email: hostedAccount.email });
    const workspaces = await listProblemWorkspaces(
      account.id,
      state.anchor.repositoryId,
      state.anchor.problemId,
    );
    if (!workspaces.length) return { status: "empty", accountId: account.id };
    const workspace = workspaces.find((entry) => entry.id === selectedWorkspace) ?? workspaces[0];
    const currentAnchor = state.anchor as ScientificAnchor;
    const currentAnchorRoot = scientificAnchorRoot(currentAnchor);
    const scope = { repository: state.repositorySlug, problem: state.problem.problem, workspaceId: workspace.id, expectedAnchorRoot: currentAnchorRoot };
    const activity = await getProblemActivity({ accountId: account.id, workspaceId: workspace.id, repositoryId: state.anchor.repositoryId, problemId: state.anchor.problemId, currentAnchorRoot });
    return { status: "ready", workspaces, workspace, scope, currentAnchor, currentAnchorRoot, activity };
  } catch (error) {
    return { status: "error", code: error instanceof ActivityDataError ? error.code : "unknown" };
  }
}

export async function ProblemWorkspace({ state, hostedAccount, accountsEnabled = true, selectedWorkspace, selectedObject, selectedInspector, mutationError, basePath }: { state: State; hostedAccount: AccountIdentity | null; accountsEnabled?: boolean; selectedWorkspace?: string; selectedObject?: string; selectedInspector?: string; mutationError?: string; basePath: string }) {
  /* Offering sign-in on a deployment that has no identity provider is a dead
     control: `/sign-in` answers 503, and it is the only thing on the surface.
     Say what the deployment does instead. */
  if (!hostedAccount) {
    const claims = state.claims ?? [];
    const claim = claims.find((candidate) => candidate.id === state.currentClaimId) ?? null;
    const review = currentReview(state);
    const checkCount = review?.verification_records?.length ?? 0;
    const sourceTitle = state.source?.title ?? `Problem ${state.problem.problem}`;
    const sourceCount = state.sources?.occurrences?.length ?? 0;
    const signInHref = `/sign-in?returnTo=${encodeURIComponent(`${basePath}?view=work`)}`;
    return <section id="add-contribution" aria-labelledby="hosted-workspace-heading" className="mt-6 min-w-0 scroll-mt-16">
      <header className="flex flex-wrap items-center justify-between gap-3"><h2 id="hosted-workspace-heading" className="text-title">Workspace</h2><div className="flex flex-wrap gap-2">{state.locator ? <Button nativeButton={false} size="sm" variant="outline" render={<a href={state.locator} />}>Open source</Button> : null}{accountsEnabled ? <Button nativeButton={false} size="sm" render={<Link href={signInHref} prefetch={false} />}>Sign in to contribute</Button> : <Badge variant="outline">sign-in unavailable</Badge>}</div></header>
      <div className="mt-5 overflow-hidden rounded-xl border bg-background lg:grid lg:min-h-[34rem] lg:grid-cols-[15rem_minmax(0,1fr)_16rem]">
        <nav aria-label="Public Problem files" className="border-b bg-muted/15 p-4 lg:border-b-0 lg:border-r"><p className="text-eyebrow uppercase text-muted-foreground">Files</p><Link href={`${basePath}?view=sources`} className="mt-3 block rounded-lg border bg-background p-3 hover:bg-muted/30"><span className="block truncate text-label font-medium">{sourceTitle}</span><span className="mt-1 block text-micro text-muted-foreground">{sourceCount} retained source records</span></Link></nav>
        <div className="min-w-0 border-b p-4 lg:border-b-0 lg:p-6"><div className="flex items-center justify-between gap-3"><p className="text-eyebrow uppercase text-muted-foreground">Canvas</p><Badge variant="outline">public preview</Badge></div><ol className="mt-8 grid items-stretch sm:grid-cols-[minmax(7rem,1fr)_2rem_minmax(7rem,1fr)_2rem_minmax(7rem,1fr)]" aria-label="Public workspace context"><li className="rounded-lg border border-status-evidence/35 bg-status-evidence/5 p-4"><span className="text-eyebrow uppercase text-muted-foreground">Source</span><strong className="mt-2 block text-label">#{state.problem.problem}</strong></li><li aria-hidden className="grid place-items-center text-muted-foreground">→</li><li className="rounded-lg border border-status-caution/35 bg-status-caution/5 p-4"><span className="text-eyebrow uppercase text-muted-foreground">Contribution</span><strong className="mt-2 block text-label">{claim ? claim.standing.replaceAll("_", " ") : "None"}</strong></li><li aria-hidden className="grid place-items-center text-muted-foreground">→</li><li className="rounded-lg border border-status-progress/35 bg-status-progress/5 p-4"><span className="text-eyebrow uppercase text-muted-foreground">Checks</span><strong className="mt-2 block text-label">{checkCount}</strong></li></ol><div className="mt-8 flex justify-center"><Button nativeButton={false} size="sm" variant="outline" render={<Link href={`/graph?repository=${state.repositorySlug}&lens=research${claim ? `&node=${encodeURIComponent(claim.id)}` : ""}`} />}>Open research map</Button></div></div>
        <aside aria-label="Workspace tools" className="p-4 lg:border-l"><p className="text-eyebrow uppercase text-muted-foreground">Workspace tools</p><ul className="mt-3 divide-y border-y text-compact"><li className="py-3"><span className="font-medium">Research Blocks</span><span className="block text-micro text-muted-foreground">Sign in to view</span></li><li className="py-3"><span className="font-medium">Notes</span><span className="block text-micro text-muted-foreground">Sign in to view</span></li><li className="py-3"><span className="font-medium">Contribution draft</span><span className="block text-micro text-muted-foreground">Sign in to start</span></li></ul></aside>
      </div>
    </section>;
  }
  const loaded = await loadWorkspace(state, hostedAccount, selectedWorkspace);
  if (loaded.status === "error") return <UnavailableHostedWorkspace state={state} code={loaded.code} />;
  if (loaded.status === "empty") return <EmptyHostedWorkspace state={state} accountId={loaded.accountId} />;

  const { workspaces, workspace, scope, currentAnchor, currentAnchorRoot, activity } = loaded;
  const objects = workspaceObjects({
    state,
    activity,
    workspace,
    scope,
    currentAnchorRoot,
  });
  const object = objects.find((entry) => entry.id === selectedObject) ?? objects[0];
  const inspector = selectedInspector === "activity" || selectedInspector === "discussion" ? selectedInspector : "details" satisfies WorkspaceInspectorTab;
  const anchors: WorkspaceAnchorState[] = activity.anchors.map((anchor) => {
    const freshness = assessAnchorFreshness(anchor, currentAnchor);
    return { root: anchor.root, state: freshness.state, fields: "fields" in freshness ? [...freshness.fields] : [] };
  });
  if (!anchors.some((anchor) => anchor.root === currentAnchorRoot)) anchors.unshift({ root: currentAnchorRoot, state: "current", fields: [] });
  const audit: WorkspaceAuditEntry[] = activity.audit.map((entry) => ({ sequence: String(entry.sequence), operation: entry.operation, requestRoot: entry.requestRoot, anchorRoot: entry.anchorRoot, subjectKind: entry.subjectKind, subjectId: entry.subjectId }));
  const discussion: WorkspaceDiscussionEntry[] = activity.discussion.map((entry) => ({ id: entry.id, body: entry.body, kind: entry.kind, visibility: entry.visibility, anchorRoot: entry.anchorRoot, approachId: entry.approachId, attemptId: entry.attemptId }));
  const toolbar = <div><MutationError code={mutationError} /><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-eyebrow uppercase text-muted-foreground">Workspace</p><h2 id="workspace-heading" className="mt-1 text-title">{workspace.name}</h2><div className="mt-2 flex flex-wrap gap-2"><Badge variant="outline">{workspace.role}</Badge>{activity.following ? <Badge variant="outline">following current state</Badge> : null}</div></div><div className="flex flex-wrap items-center justify-end gap-2">{workspaces.map((entry) => <Button key={entry.id} nativeButton={false} size="sm" variant={entry.id === workspace.id ? "default" : "outline"} render={<Link href={`${basePath}?view=work&workspace=${entry.id}`} />}>{entry.name}</Button>)}<form action={followProblemAction}><ScopeFields scope={scope} /><input type="hidden" name="following" value={activity.following ? "false" : "true"} /><Button type="submit" size="sm" variant="outline">{activity.following ? "Unfollow current state" : "Follow current state"}</Button></form></div></div></div>;
  const canvasNote = <WorkspaceCrdtNote updates={activity.crdtUpdates} scope={scope} action={appendWorkspaceCrdtUpdateAction} />;
  return <WorkspaceShell objects={objects} selectedObject={object} inspectorTab={inspector} anchors={anchors} audit={audit} discussion={discussion} toolbar={toolbar} canvasNote={canvasNote} initialSurface={selectedObject ? "object" : "canvas"} />;
}
