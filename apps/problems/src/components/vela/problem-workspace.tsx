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
import { formalFilePath } from "@/components/vela/formal-statement-card";
import { ProblemActivityRecords } from "@/components/vela/problem-activity-records";
import { ContributionPath } from "@/components/vela/contribution-path";
import type { AccountIdentity } from "@/lib/auth";
import type { ScientificProblemState } from "@/lib/scientific-state";
import { problemWorkbenchHandoff } from "@/lib/workbench-handoff";
import { FormSelect } from "@/components/vela/form-select";
import { RecordId } from "@/components/vela/record-id";
import { formatDate } from "@/lib/format";
import { CandidateBanner } from "@/components/vela/candidate-banner";
import { Reach } from "@/components/vela/reach";
import { WorkAction } from "@/components/vela/work-action";
import { problemReachCaption, problemReachStops } from "@/lib/problem-reach";
import { problemWatch, problemWatchSentence, type ProblemWatch } from "@/lib/problem-watch";
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
import { Disclosure } from "@/components/vela/disclosure";

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

/* An exact value typed by hand needs the shape stated, not hinted.
 *
 * A 64-character Ed25519 key and a `sha256:` root were plain text fields whose
 * only guidance was a placeholder, and a placeholder disappears the moment you
 * start typing. One wrong character produced a draft that failed validation
 * later, after the reader believed it was saved — the highest-error-rate input
 * in the product had the least support in it.
 *
 * `pattern` refuses the submit at the browser, the hint stays visible while
 * typing and is bound with `aria-describedby`, and mono with no autocorrect
 * stops a phone keyboard from capitalising a hex digit. */
const EXACT_FORMATS: Record<string, { pattern: string; hint: string }> = {
  publicKey: { pattern: "[0-9a-f]{64}", hint: "64 lowercase hex characters, no prefix." },
  contentRoot: { pattern: "sha256:[0-9a-f]{64}", hint: "sha256: followed by 64 lowercase hex characters." },
};

function FormField({ label, name, placeholder, required = true, value, type = "text" }: { label: string; name: string; placeholder?: string; required?: boolean; value?: string; type?: string }) {
  const id = `${name}-${value ?? placeholder ?? "field"}`.toLowerCase().replace(/[^a-z0-9_-]+/gu, "-").replace(/^-+|-+$/gu, "");
  const exact = EXACT_FORMATS[name];
  return <div className="grid gap-1.5">
    <Label htmlFor={id}>{label}</Label>
    <Input
      id={id}
      name={name}
      placeholder={placeholder}
      required={required}
      defaultValue={value}
      type={type}
      pattern={exact?.pattern}
      aria-describedby={exact ? `${id}-format` : undefined}
      autoCapitalize={exact ? "off" : undefined}
      autoCorrect={exact ? "off" : undefined}
      spellCheck={exact ? false : undefined}
      className={exact ? "font-mono" : undefined}
    />
    {exact ? <p id={`${id}-format`} className="text-meta text-muted-foreground">{exact.hint}</p> : null}
  </div>;
}

function StaleActivityNotice() {
  return <Alert className="mt-5 bg-muted/30"><AlertTitle>Earlier activity anchor</AlertTitle><AlertDescription>This record remains readable, but controls are unavailable because its exact Problem or Repository anchor is no longer current. Start a new Approach from the current Problem instead of silently editing historical context.</AlertDescription></Alert>;
}

/* The exact field names the record uses, not the TypeScript property names the
   comparison happens to be written in. A reader who copies `problem_record_root`
   out of here can find it in the projection; `problemRecordRoot` exists nowhere
   but this codebase. */
const anchorFieldNames: Record<string, string> = {
  repositoryId: "repository_id",
  repositoryRoot: "repository_root",
  sourceCommit: "source_commit",
  sourceTree: "source_tree",
  projectionReleaseRoot: "projection_release_root",
  problemId: "problem_id",
  problemRecordRoot: "problem_record_root",
  sourceObservationRoot: "source_observation_root",
  claimId: "claim_id",
  claimRoot: "claim_root",
  claimStanding: "claim_standing",
};

/* The watch, firing.
 *
 * A follow binds to one exact anchor and never migrates, so a followed root
 * that is no longer current is the product's own way of saying the record moved
 * while this reader was away. Until now the surface discarded that and drew an
 * unpressed Follow button, which read as "you are not watching this" — the
 * opposite of the truth.
 *
 * Acknowledging is the ordinary Follow command against the current anchor, so
 * this introduces no new record type and no notification store. The reader
 * presses Follow and is now watching the state they have just been shown. */
function WatchNotice({ watch, scope }: { watch: ProblemWatch; scope: Scope }) {
  const fields = "fields" in watch.moved ? watch.moved.fields : [];
  return <Alert className="mb-5 bg-muted/30">
    <AlertTitle>This record moved since you started watching</AlertTitle>
    <AlertDescription>
      <p>{problemWatchSentence(watch)}</p>
      <p className="mt-2 text-meta text-muted-foreground">
        Watching since {formatDate(watch.since)}. {fields.length
          ? <>Changed: <span className="font-mono text-micro">{fields.map((field) => anchorFieldNames[field] ?? field).join(" ")}</span>.</>
          : null}
      </p>
      <p className="mt-2 text-meta text-muted-foreground">
        Reaching a stage is not a question being answered. A Repository accepting a Claim is a separate act, and this
        notice never reports one.
      </p>
      <form action={followProblemAction} className="mt-3">
        <ScopeFields scope={scope} />
        <input type="hidden" name="following" value="true" />
        <Button type="submit" size="sm" variant="outline">Watch the current state</Button>
      </form>
    </AlertDescription>
  </Alert>;
}

function EmptyWorkspace({ state, accountId, workbenchHandoff }: { state: State; accountId: string; workbenchHandoff?: string | null }) {
  void accountId;
  const sourceTitle = state.source?.title ?? `Problem ${state.problem.problem}`;
  const sourceCount = state.sources?.occurrences?.length ?? 0;
  return <section aria-labelledby="empty-workspace-heading" className="mt-6 min-w-0">
    <header className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><h2 id="empty-workspace-heading" className="text-title">Workspace</h2><Badge variant="outline">signed in</Badge></div>{workbenchHandoff ? <Button nativeButton={false} size="sm" variant="outline" render={<a href={workbenchHandoff} />}>Continue locally</Button> : null}</header>
    {workbenchHandoff ? <p className="mt-2 text-meta text-muted-foreground">Open this exact Problem, source revision, and authority Repository in Workbench. This handoff does not clone, switch, upload, or execute anything.</p> : null}
    {/* No Files rail, no Canvas, no "Workspace tools" list.
        A hosted workspace coordinates: it keeps notes, approaches and a
        contribution draft beside the Problem. Choosing a checkout, running
        tools and capturing evidence are Workbench's, and its README draws the
        line — "problems.science owns shared discovery and coordination".
        Drawing three columns of instrument the browser does not own advertised
        a product that is not this one, and two of the three columns were an
        empty placeholder anyway. */}
    <div className="vela-object-surface mt-5 overflow-hidden p-5 sm:p-7">
      <h3 className="text-subtitle">Start a workspace</h3>
      <p className="mt-1 max-w-[68ch] text-compact text-muted-foreground">Keep notes, approaches and a contribution draft with this Problem. Source files and local tools stay in Workbench; this is where the work is coordinated and handed on.</p>
      <form action={createWorkspaceAction} className="mt-6 grid gap-4 sm:max-w-lg">
        <input type="hidden" name="repository" value={state.repositorySlug} />
        <input type="hidden" name="problem" value={state.problem.problem} />
        <IdempotencyField />
        <FormField label="Workspace name" name="name" placeholder="Problem working group" />
        <FormField label="URL slug" name="slug" placeholder="problem-working-group" />
        <Button className="w-fit" type="submit">Create workspace</Button>
      </form>
      <p className="mt-6 border-t pt-4 text-meta text-muted-foreground">{sourceCount} retained source record{sourceCount === 1 ? "" : "s"} for {sourceTitle}. <Link href="./sources" className="font-medium text-foreground underline underline-offset-4">open Sources</Link>.</p>
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

/* The counterpart to `MutationError`. A save that only reports its failures
   asks the reader to infer success from the page redrawing, which is the one
   inference this product should never ask for. Named per operation, because
   "Saved" does not say what now exists. */
const MUTATION_DONE: Record<string, string> = {
  approach: "Approach saved to this Workspace.",
  attempt: "Attempt started.",
  "attempt-state": "Attempt state updated.",
  note: "Entry added.",
  canvas: "Canvas update saved.",
  evidence: "Research Block retained by its exact root.",
  draft: "Unsigned draft validated and saved. It still needs signing in your local tool.",
};

function MutationDone({ code }: { code?: string }) {
  const message = code ? MUTATION_DONE[code] : null;
  if (!message) return null;
  return <Alert className="mb-4 border-[color-mix(in_oklab,var(--status-progress)_45%,var(--border))] bg-[color-mix(in_oklab,var(--status-progress)_7%,transparent)]">
    <AlertTitle>Saved</AlertTitle>
    <AlertDescription>{message} Scientific state is unchanged: a Repository Decision is what moves it.</AlertDescription>
  </Alert>;
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
  return <form action={attachArtifactAction} className="grid gap-4 sm:grid-cols-2"><ScopeFields scope={scope} /><div className="sm:col-span-2"><FormSelect label="Producing Attempt" name="attemptId" options={attempts.map((attempt) => ({ value: attempt.id, label: attempt.title }))} /><p className="mt-1.5 text-meta text-muted-foreground">The selected Attempt supplies this evidence&apos;s Problem and approach scope; no internal scope label is required.</p></div><FormSelect label="Evidence type" name="kind" options={[{ value: "proof", label: "Proof or proof attempt" }, { value: "computation", label: "Computation" }, { value: "dataset", label: "Dataset" }, { value: "review", label: "Review" }, { value: "negative-result", label: "Negative result" }, { value: "correction", label: "Correction" }, { value: "other", label: "Other bounded evidence" }]} /><FormField label="Artifact reference path" name="path" placeholder="artifacts/result.json" /><div className="sm:col-span-2"><FormField label="SHA-256 root" name="contentRoot" /></div><FormField label="Locator" name="locator" placeholder="Optional external locator" required={false} /><FormField label="Media type" name="mediaType" placeholder="application/json" required={false} /><FormField label="Byte size" name="byteSize" placeholder="Optional" required={false} type="number" /><Button className="w-fit self-end" type="submit">Retain evidence reference</Button></form>;
}

function DraftForm({ scope, state, artifacts, drafts }: { scope: Scope; state: State; artifacts: ProblemActivity["artifacts"]; drafts: ProblemActivity["drafts"] }) {
  if (!artifacts.length) return <Alert className="bg-muted/30"><AlertTitle>Retain a Research Block first</AlertTitle><AlertDescription>The handoff derives its Artifact from one exact hosted Research Block. It does not ask you to retype roots that could drift.</AlertDescription></Alert>;
  /* One draft per anchor, revised in place. Saving used to mint a sibling
     draft on every submit — the SQL update branch existed and the form never
     named a draft to update — so the object tree grew one near-duplicate per
     save with no way to tell which was current. */
  const draft = drafts[0] ?? null;
  return <form action={saveSubmissionDraftAction} className="grid gap-4 sm:grid-cols-2"><ScopeFields scope={scope} />{draft ? <><input type="hidden" name="draftId" value={draft.id} /><input type="hidden" name="expectedVersion" value={draft.version} /><p className="text-meta text-muted-foreground sm:col-span-2">Saving revises the existing unsigned draft (v{draft.version}) for this anchor.</p></> : null}<div className="sm:col-span-2"><FormSelect label="Research Block" name="researchBlockId" options={artifacts.map((artifact) => ({ value: artifact.id, label: artifact.path }))} /></div><FormField label="Vela agent actor ID" name="actorId" placeholder="agent:my-research-agent" /><FormField label="Ed25519 public key" name="publicKey" /><FormSelect label="Requested change" name="requestedChange" options={[{ value: "add_claim", label: "Add Claim" }, ...(state.anchor.claimId ? [{ value: "correct_claim", label: "Correct bound Claim" }, { value: "supersede_claim", label: "Supersede bound Claim" }, { value: "retract_claim", label: "Retract bound Claim" }] : [])]} /><FormSelect label="Claim type" name="claimType" options={[{ value: "theoretical", label: "Theoretical" }, { value: "computational", label: "Computational" }, { value: "empirical", label: "Empirical" }, { value: "negative", label: "Negative" }, { value: "contradiction", label: "Contradiction" }]} /><div className="sm:col-span-2"><Label htmlFor="draft-assertion">Claim assertion</Label><Textarea id="draft-assertion" name="assertion" required placeholder="The exact assertion this Submission proposes" /></div><FormField label="Condition" name="condition" placeholder="Optional explicit condition" required={false} /><FormSelect label="Replayability" name="replayability" options={[{ value: "exact", label: "Exact" }, { value: "bounded", label: "Bounded" }, { value: "approximate", label: "Approximate" }, { value: "unavailable", label: "Unavailable" }, { value: "unknown", label: "Unknown" }]} /><FormField label="Caveat" name="caveat" placeholder="What this does not establish" /><FormField label="Producer check" name="checkMethod" placeholder="lake build" /><FormSelect label="Check outcome" name="checkOutcome" options={[{ value: "pass", label: "Pass" }, { value: "fail", label: "Fail" }, { value: "error", label: "Error" }, { value: "skipped", label: "Skipped" }, { value: "unknown", label: "Unknown" }]} /><div className="sm:col-span-2"><FormField label="Verification requirement" name="verificationRequirement" placeholder="Independent statement-fidelity review" /></div><Button className="w-fit sm:col-span-2" type="submit">Validate and save unsigned draft</Button></form>;
}

export function EmptyHostedWorkspace({ state, accountId, workbenchHandoff }: { state: State; accountId: string; workbenchHandoff?: string | null }) {
  return <EmptyWorkspace state={state} accountId={accountId} workbenchHandoff={workbenchHandoff} />;
}

function UnavailableHostedWorkspace({ state, code }: { state: State; code: ActivityDataError["code"] | "unknown" }) {
  void state;
  return <ActivityUnavailable code={code} />;
}

export function workspaceObjects({ state, activity, workspace, scope, currentAnchorRoot, basePath }: { state: State; activity: ProblemActivity; workspace: Workspace; scope: Scope; currentAnchorRoot: string; basePath: string }): WorkspaceObject[] {
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
    content: <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-title">{workspace.name}</h2><Badge variant="outline">shared workspace</Badge></div><dl className="mt-5 grid overflow-hidden rounded-lg border bg-[var(--vela-surface-sunken)] sm:grid-cols-3"><div className="px-4 py-3"><dt className="text-meta text-muted-foreground">Approaches</dt><dd className="mt-1 font-mono text-subtitle">{activity.approaches.length}</dd></div><div className="border-t px-4 py-3 sm:border-l sm:border-t-0"><dt className="text-meta text-muted-foreground">Attempts</dt><dd className="mt-1 font-mono text-subtitle">{activity.attempts.length}</dd></div><div className="border-t px-4 py-3 sm:border-l sm:border-t-0"><dt className="text-meta text-muted-foreground">Research Blocks</dt><dd className="mt-1 font-mono text-subtitle">{activity.artifacts.length}</dd></div></dl><div className="mt-6 grid gap-3"><WorkAction title="New approach" description="Name a research direction."><NewApproachForm scope={scope} /></WorkAction><WorkAction title="Add note" description="Add reasoning to this workspace."><AddNoteForm scope={scope} /></WorkAction><WorkAction title="Attach evidence" description="Record a file an Attempt produced, by its exact content root. Vela calls one a Research Block."><ResearchBlockForm scope={scope} attempts={activity.attempts.filter(isCurrent)} /></WorkAction><WorkAction title="Prepare local handoff" description="Export an unsigned payload for your local tool."><DraftForm scope={scope} state={state} artifacts={activity.artifacts.filter(isCurrent)} drafts={activity.drafts.filter(isCurrent)} /></WorkAction></div></div>,
    detail: <p className="text-meta text-muted-foreground">Shared activity only. Scientific state changes through a repository Decision.</p>,
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
    content: <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-title">{state.repositoryName}</h2><Badge variant="outline">exact revision</Badge><Badge variant="secondary">read only</Badge></div><dl className="mt-6 grid gap-4 text-meta sm:grid-cols-2"><div><dt className="text-muted-foreground">Source commit</dt><dd className="mt-1">{state.anchor.sourceCommit ? <RecordId value={state.anchor.sourceCommit} /> : "Unavailable"}</dd></div><div><dt className="text-muted-foreground">Source tree</dt><dd className="mt-1">{state.anchor.sourceTree ? <RecordId value={state.anchor.sourceTree} /> : "Unavailable"}</dd></div><div className="sm:col-span-2"><dt className="text-muted-foreground">Repository root</dt><dd className="mt-1"><RecordId value={state.anchor.repositoryRoot} /></dd></div></dl><div className="mt-6 flex flex-wrap gap-3"><Button nativeButton={false} variant="outline" render={<Link href={`/repositories/${state.repositorySlug}`} />}>Repository details</Button>{state.locator ? <Button nativeButton={false} render={<a href={state.locator} />}>Open source</Button> : null}</div></div>,
    detail: <p className="text-meta text-muted-foreground">Local editing and execution stay in your repository tools.</p>,
  });

  for (const approach of activity.approaches) {
    const id = approach.id;
    const current = isCurrent(approach);
    const version = approach.version;
    const summary = approach.summary || "No summary retained.";
    const bindingDetail = <div className="text-meta text-muted-foreground"><p>Problem-scoped activity direction</p><p className="mt-2">Authority effect: <strong className="font-medium text-foreground">{approach.authorityEffect}</strong>.</p></div>;
    objects.push({ id: `approach:${id}`, recordId: id, parentId: approach.parentApproachId ? `approach:${approach.parentApproachId}` : null, group: "work", kind: "approach", label: approach.title || "Untitled approach", summary, meta: `problem direction · ${approach.state} · ${anchorMeta(approach)}`, version, anchorRoot: approach.anchorRoot, content: <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-title">{approach.title}</h2><Badge>{approach.state}</Badge><Badge variant="outline">Approach</Badge></div><p className="mt-3 max-w-3xl whitespace-pre-wrap text-body text-muted-foreground">{summary}</p>{current ? <div className="mt-7"><WorkAction title="Continue this direction" description="Fork the Approach or start one bounded Attempt."><div className="grid gap-6"><form action={forkApproachAction} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><ScopeFields scope={scope} /><input type="hidden" name="approachId" value={id} /><input type="hidden" name="expectedVersion" value={version} /><FormField label="Fork title" name="title" placeholder="Optional fork title" required={false} /><Button type="submit" size="sm" variant="outline">Fork approach</Button></form><form action={createAttemptAction} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><ScopeFields scope={scope} /><input type="hidden" name="approachId" value={id} /><FormField label="Attempt title" name="title" placeholder="Test the finite case" /><Button className="w-fit" type="submit" size="sm">Start Attempt</Button></form></div></WorkAction><div className="mt-5"><WorkAction title="Discuss approach" description="Add a note to this Approach."><AddNoteForm scope={scope} approachId={id} /></WorkAction></div></div> : <StaleActivityNotice />}</div>, detail: bindingDetail });
  }

  for (const attempt of activity.attempts) {
    const id = attempt.id;
    const current = isCurrent(attempt);
    const version = attempt.version;
    const attemptState = attempt.state;
    objects.push({ id: `attempt:${id}`, recordId: id, parentId: `approach:${attempt.approachId}`, group: "work", kind: "attempt", label: attempt.title || "Untitled Attempt", summary: `Attempt is ${attemptState}.`, meta: `${attemptState} · ${anchorMeta(attempt)}`, version, anchorRoot: attempt.anchorRoot, content: <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-title">{attempt.title}</h2><Badge>{attemptState}</Badge><Badge variant="outline">v{version}</Badge></div>{current ? <>{(ATTEMPT_TRANSITIONS[attemptState] ?? []).length ? <form action={updateAttemptAction} className="mt-6 flex flex-wrap items-end gap-3 rounded-lg bg-[var(--vela-surface-sunken)] p-4"><ScopeFields scope={scope} /><input type="hidden" name="attemptId" value={id} /><input type="hidden" name="expectedVersion" value={version} /><FormSelect label="Move to" name="state" options={ATTEMPT_TRANSITIONS[attemptState]!} /><Button type="submit" size="sm" variant="outline">Update Attempt</Button></form> : <p className="mt-6 text-meta text-muted-foreground">Closed as <span className="font-medium text-foreground">{attemptState}</span>.</p>}<div className="mt-5"><WorkAction title="Discuss attempt" description="Add a note to this Attempt."><AddNoteForm scope={scope} attemptId={id} /></WorkAction></div></> : <StaleActivityNotice />}</div> });
  }

  for (const artifact of activity.artifacts) {
    const id = artifact.id;
    objects.push({ id: `artifact:${id}`, recordId: id, parentId: artifact.attemptId ? `attempt:${artifact.attemptId}` : null, group: "outputs", kind: "research-block", label: artifact.path, summary: `${artifact.kind} retained by exact content root.`, meta: `Problem-scoped · ${anchorMeta(artifact)}`, anchorRoot: artifact.anchorRoot, content: <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-title">{artifact.path}</h2><Badge variant="outline">Research Block</Badge></div><p className="mt-3 max-w-3xl text-meta text-muted-foreground">Exact metadata for externally stored evidence.</p><div className="mt-6"><RootedArtifactFrame artifact={{ kind: artifact.kind, path: artifact.path, contentRoot: artifact.contentRoot, byteSize: artifact.byteSize, mediaType: artifact.mediaType, locator: artifact.locator }} /></div>{isCurrent(artifact) ? null : <StaleActivityNotice />}</div> });
  }

  for (const draft of activity.drafts) {
    const id = draft.id;
    objects.push({ id: `draft:${id}`, recordId: id, parentId: null, group: "outputs", kind: "draft", label: "Unsigned Result draft", summary: "Schema-validated payload bytes ready for a compatible local tool.", meta: `Problem-scoped · ${anchorMeta(draft)}`, version: draft.version, anchorRoot: draft.anchorRoot, content: <div><div className="vela-unsigned-panel p-5"><div className="flex flex-wrap items-center gap-2"><h2 className="text-title">Unsigned Result draft</h2><Badge variant="secondary">unsigned</Badge></div><p className="mt-3 max-w-3xl text-body text-muted-foreground">Download the validated draft, then continue inside the source Repository. Hosted Problems cannot sign or submit it.</p><Button className="mt-5" nativeButton={false} variant="outline" render={<Link href={`/drafts/${id}/export?workspace=${workspace.id}`} />}>Download unsigned draft</Button></div><ol aria-label="Result handoff" className="mt-7 grid gap-0 overflow-hidden rounded-lg border sm:grid-cols-4 sm:divide-x">
      <li className="border-b p-4 sm:border-b-0"><span className="text-micro font-semibold text-primary">1</span><strong className="mt-2 block text-label">Open locally</strong><span className="mt-1 block text-micro text-muted-foreground">Use a compatible local research tool.</span></li>
      <li className="border-b p-4 sm:border-b-0"><span className="text-micro font-semibold text-primary">2</span><strong className="mt-2 block text-label">Submit in the Repository</strong><Link className="mt-1 block text-micro text-primary underline underline-offset-4" href={`/repositories/${state.repositorySlug}/contribute`}>Repository instructions</Link></li>
      <li className="border-b p-4 sm:border-b-0"><span className="text-micro font-semibold text-primary">3</span><strong className="mt-2 block text-label">Authority reviews</strong><span className="mt-1 block text-micro text-muted-foreground">A separate Repository Decision accepts or refuses it.</span></li>
      <li className="p-4"><span className="text-micro font-semibold text-primary">4</span><strong className="mt-2 block text-label">Read public state</strong><span className="mt-1 block text-micro"><Link className="text-primary underline underline-offset-4" href={`${basePath}/results`}>Results</Link><span aria-hidden> · </span><Link className="text-primary underline underline-offset-4" href={`${basePath}/history`}>History</Link></span></li>
    </ol><Disclosure className="mt-5 rounded-lg border px-4 py-3" summaryClassName="text-label font-medium" summary="Technical payload details"><p className="mt-3"><RecordId value={draft.payloadRoot} /></p><p className="mt-2 text-micro text-muted-foreground"><code>vela.submission.v3</code> · canonical JSON · no server-held key</p></Disclosure>{isCurrent(draft) ? null : <StaleActivityNotice />}</div> });
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

export async function ProblemWorkspace({ state, hostedAccount, accountsEnabled = true, selectedWorkspace, selectedObject, selectedInspector, mutationError, mutationDone, basePath }: { state: State; hostedAccount: AccountIdentity | null; accountsEnabled?: boolean; selectedWorkspace?: string; selectedObject?: string; selectedInspector?: string; mutationError?: string; mutationDone?: string; basePath: string }) {
  const workbenchHandoff = problemWorkbenchHandoff({
    basePath,
    repositorySlug: state.repositorySlug,
    sourceRevision: state.source.native_revision,
    sourceLocators: state.source.locators.map(({ url }) => url).filter((url): url is string => Boolean(url)),
  });
  /* Offering sign-in on a deployment that has no identity provider is a dead
     control: `/sign-in` answers 503, and it is the only thing on the surface.
     Say what the deployment does instead. */
  if (!hostedAccount) {
    const sourceTitle = state.source?.title ?? `Problem ${state.problem.problem}`;
    const sourceCount = state.sources?.occurrences?.length ?? 0;
    const openStatements = (state.sources?.occurrences ?? []).filter(
      (occurrence) => occurrence.formal?.category_label?.trim().toLowerCase() === "open",
    );
    const signInHref = `/sign-in?returnTo=${encodeURIComponent(`${basePath}/work`)}`;
    return <section id="add-contribution" aria-labelledby="hosted-workspace-heading" className="mt-6 min-w-0 scroll-mt-16">
      <header className="flex flex-wrap items-center justify-between gap-3"><h2 id="hosted-workspace-heading" className="text-title">Workspace</h2><div className="flex flex-wrap gap-2">{workbenchHandoff ? <Button nativeButton={false} size="sm" variant="outline" render={<a href={workbenchHandoff} />}>Continue locally</Button> : null}{state.locator ? <Button nativeButton={false} size="sm" variant="outline" render={<a href={state.locator} />}>Open source</Button> : null}{accountsEnabled ? <Button nativeButton={false} size="sm" render={<Link href={signInHref} prefetch={false} />}>Sign in to contribute</Button> : <Badge variant="outline">sign-in unavailable</Badge>}</div></header>
      {workbenchHandoff ? <p className="mt-2 text-meta text-muted-foreground">Open this exact Problem, source revision, and authority Repository in Workbench. This handoff does not clone, switch, upload, or execute anything.</p> : null}
      <div className="vela-object-surface mt-5 overflow-hidden lg:grid lg:min-h-[34rem] lg:grid-cols-[15rem_minmax(0,1fr)_16rem]">
        <nav aria-label="Public Problem files" className="border-b bg-[var(--vela-surface-sunken)] p-4 lg:border-b-0 lg:border-r"><p className="text-meta font-semibold">Files</p><Link href={`${basePath}/sources?`} className="vela-object-row mt-3 block rounded-md border bg-background p-3"><span className="block truncate text-label font-medium">{sourceTitle}</span><span className="mt-1 block text-micro text-muted-foreground">{sourceCount} retained source records</span></Link>
          {/* Where the record already stands, read from inside the surface
              where someone is deciding whether to add to it. The rail is
              narrow, so the track draws in its vertical form. */}
          <p className="mt-6 text-meta font-semibold">Reach</p>
          <div className="mt-3"><Reach stops={problemReachStops(state)} endpoint="The question" caption={problemReachCaption(state)} /></div></nav>
        <div className="min-w-0 border-b bg-[var(--vela-surface-sunken)] p-4 lg:border-b-0 lg:p-6">
          {/* The real work, where a preview of an unusable canvas used to sit.
            *
              That cell drew Source → Result → Checks in three tiles under a
              "public preview" badge: a mock of an interactive surface a
              signed-out reader cannot use, restating three facts the Problem
              now states properly twice over — Overview draws the accepted
              scope against the question, and History derives the whole
              transition. The attributed activity underneath it was the only
              thing here a reader could not get elsewhere, and it was below the
              fold. They swap. */}
          <ContributionPath accountsEnabled={accountsEnabled} />
          <div aria-label="Public workspace context" className="mt-8">
            {(state.attributedRecords ?? []).length
              ? <ProblemActivityRecords state={state} />
              : <>
                  <p className="text-meta font-semibold">Reported activity</p>
                  <p className="mt-2 max-w-[62ch] text-compact text-muted-foreground">
                    No source records work against this Problem. Coordination that has not reached a Repository
                    Decision lives here; nothing has yet.
                  </p>
                </>}
          </div>
        </div>
        {/* What is left to prove, rather than three tiles saying "Sign in to
            view". This site's promise is a public, read-only map, and a signed-
            out reader used to learn nothing here about what remains open. The
            statements are already public on Sources and their counts already
            public on Overview, so nothing new is disclosed — it simply stops
            being hidden behind an account. */}
        <aside aria-label="Open work" className="bg-[var(--vela-surface-sunken)] p-4 lg:border-l">
          <p className="text-meta font-semibold">Still open</p>
          {openStatements.length ? <>
            <p className="mt-1 text-micro text-muted-foreground">{openStatements.length} {openStatements.length === 1 ? "statement the source still marks open" : "statements the source still marks open"}</p>
            <ul className="mt-3 divide-y border-y">
              {openStatements.map((occurrence) => <li key={occurrence.occurrence_key} className="py-3">
                <Link href={formalFilePath(occurrence) ? `${basePath}/sources?file=${encodeURIComponent(formalFilePath(occurrence)!)}&symbol=${encodeURIComponent(occurrence.native_id)}` : `${basePath}/sources`} className="block min-h-6 min-w-0 py-0.5 font-mono text-micro break-words hover:underline">
                  {occurrence.native_id.split(".").slice(1).join(".") || occurrence.native_id}
                </Link>
              </li>)}
            </ul>
          </> : <p className="mt-1 text-micro text-muted-foreground">No statement for this Problem is still marked open by its source.</p>}
        </aside>
      </div>
    </section>;
  }
  const loaded = await loadWorkspace(state, hostedAccount, selectedWorkspace);
  if (loaded.status === "error") return <UnavailableHostedWorkspace state={state} code={loaded.code} />;
  if (loaded.status === "empty") return <EmptyHostedWorkspace state={state} accountId={loaded.accountId} workbenchHandoff={workbenchHandoff} />;

  const { workspaces, workspace, scope, currentAnchor, currentAnchorRoot, activity } = loaded;
  const objects = workspaceObjects({
    state,
    activity,
    workspace,
    scope,
    currentAnchorRoot,
    basePath,
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
  /* Surfaced above the instrument rather than inside the object tree. A
     candidate is the one thing in this Workspace that is waiting on a person,
     and the tree is where you go when you already know it is there. */
  const candidate = activity.drafts.find((draft) => draft.anchorRoot === currentAnchorRoot) ?? null;
  /* Read once, here, rather than inside the notice: it is a second exact
     projection read at the followed release root, and a component that performs
     it on render would do so on every branch that never draws the notice. */
  const watch = await problemWatch(state, activity);
  const candidateBanner = candidate ? <CandidateBanner
    draft={{ id: candidate.id, payloadRoot: candidate.payloadRoot, version: candidate.version, updatedAt: candidate.updatedAt }}
    exportHref={`/drafts/${candidate.id}/export?workspace=${workspace.id}`}
    workbenchHandoff={workbenchHandoff}
    target={{ claimId: state.anchor.claimId, standing: state.anchor.claimStanding }}
  /> : null;
  const toolbar = <div><MutationError code={mutationError} /><MutationDone code={mutationDone} />{watch ? <WatchNotice watch={watch} scope={scope} /> : null}{candidateBanner ? <div className="mb-5">{candidateBanner}</div> : null}<div className="flex flex-wrap items-start justify-between gap-4"><div className="flex flex-wrap items-center gap-2"><h2 id="workspace-heading" className="text-title">{workspace.name}</h2><Badge variant="outline">{workspace.role}</Badge>{activity.following ? <Badge variant="secondary">following</Badge> : null}</div><div className="flex flex-wrap items-center justify-end gap-2">{workbenchHandoff ? <Button nativeButton={false} size="sm" variant="outline" render={<a href={workbenchHandoff} />}>Continue locally</Button> : null}{workspaces.map((entry) => <Button key={entry.id} nativeButton={false} size="sm" variant={entry.id === workspace.id ? "default" : "outline"} render={<Link href={`${basePath}/work?workspace=${entry.id}`} />}>{entry.name}</Button>)}<form action={followProblemAction}><ScopeFields scope={scope} /><input type="hidden" name="following" value={activity.following ? "false" : "true"} /><Button type="submit" size="sm" variant="outline">{activity.following ? "Unfollow" : "Follow"}</Button></form></div></div>{workbenchHandoff ? <p className="mt-2 text-meta text-muted-foreground">The handoff carries this exact Problem, source revision, and authority Repository. It does not clone, switch, upload, or execute anything.</p> : null}<div className="mt-5"><Reach stops={problemReachStops(state)} endpoint="The question" caption={problemReachCaption(state)} /></div></div>;
  const canvasNote = <WorkspaceCrdtNote updates={activity.crdtUpdates} scope={scope} action={appendWorkspaceCrdtUpdateAction} />;
  return <WorkspaceShell objects={objects} selectedObject={object} inspectorTab={inspector} anchors={anchors} audit={audit} discussion={discussion} toolbar={toolbar} canvasNote={canvasNote} initialSurface={selectedObject ? "object" : "canvas"} />;
}
