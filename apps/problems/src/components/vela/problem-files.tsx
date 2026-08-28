import Link from "next/link";
import { ArrowRight01Icon, SourceCodeIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription, AlertTitle } from "@vela/ui/components/alert";
import { Button } from "@vela/ui/components/button";
import { RecordId } from "@/components/vela/record-id";
import { FormalStatementCard } from "@/components/vela/formal-statement-card";
import type { ScientificProblemState } from "@/lib/scientific-state";

type State = NonNullable<ScientificProblemState>;
type Occurrence = State["sources"]["occurrences"][number];
type Statement = State["sources"]["statements"][number];
type Coverage = State["sources"]["coverage"][number];

/* What a Source may retain, in the reader's words.
 *
 * Read from the Source's own registry entry rather than counted off this
 * Problem's rows. A `summary` Source that retained nothing here has retained
 * nothing *here*; a `locator_only` Source will never retain a statement for
 * anything. A count cannot tell those apart, and the column that only counted
 * said "locator only" for both. */
const RETENTION: Record<Coverage["statement_retention"], string> = {
  summary: "statement retained",
  locator_only: "locator only",
  none: "no statement retained",
};

/* Where an occurrence stands in this Problem's resolution. This is the axis
   that keeps the plane honest — a number match is not a reviewed reference,
   and neither is the anchor — so the inspector names it in full rather than
   letting the reader infer it from which pane the record appeared in. */
const OCCURRENCE_STANDING: Record<string, { label: string; note: string }> = {
  canonical_anchor: { label: "Canonical anchor", note: "This Problem is held by this occurrence." },
  reviewed_reference: { label: "Reviewed reference", note: "A reviewer bound this occurrence to the Problem." },
  candidate_number_link: { label: "Candidate number link", note: "Matched on problem number alone. Navigation only." },
};

export type FileEntry =
  | { kind: "formal"; path: string; records: Occurrence[] }
  | { kind: "statements"; path: string; records: Statement[] };

/* What the library declares about a declaration's proof, as one mark.
 *
 * A file tree that only lists names makes a reader open every entry to learn
 * which ones carry a proof. Three states are all the library actually
 * distinguishes, and each keeps a shape as well as a tone so the tree survives
 * forced colours and greyscale. */
function proofMark(occurrence: Occurrence) {
  const formal = occurrence.formal;
  if (formal?.proof_present && formal.proof_sorry_free) {
    return { className: "bg-status-progress", label: "Proved, no gaps" };
  }
  if (formal?.proof_present && formal.proof_sorry_free === false) {
    return { className: "bg-status-caution", label: "Proof has a hole" };
  }
  /* A proof is attached and the library recorded nothing about completeness.
     This used to fall through to "contains sorry", which asserts a hole the
     source never reported — an unrecorded fact rendered as a defect. */
  if (formal?.proof_present) {
    return { className: "bg-muted-foreground/60", label: "Proof attached, completeness not recorded" };
  }
  return { className: "border border-muted-foreground/60", label: "Statement only, no proof" };
}

/* Directory structure, recovered from the module paths the library files its
 * declarations under. The projection retains no directory listing — these are
 * the paths inside the declarations themselves, so the tree shows exactly the
 * files that say something about this Problem and nothing else. */
type TreeNode = { name: string; path: string; children: TreeNode[]; entry: FileEntry | null };

function buildTree(entries: FileEntry[]): TreeNode[] {
  const roots: TreeNode[] = [];
  for (const entry of entries) {
    const segments = entry.path.split("/");
    let level = roots;
    let walked = "";
    segments.forEach((segment, index) => {
      walked = walked ? `${walked}/${segment}` : segment;
      const leaf = index === segments.length - 1;
      let node = level.find((candidate) => candidate.name === segment);
      if (!node) {
        node = { name: segment, path: walked, children: [], entry: null };
        level.push(node);
      }
      if (leaf) node.entry = entry;
      level = node.children;
    });
  }
  return roots;
}

function recordKey(entry: FileEntry, record: Occurrence | Statement) {
  return entry.kind === "formal" ? (record as Occurrence).native_id : (record as Statement).statement_id;
}

function TreeBranch({ nodes, depth, basePath, selectedPath, activeKey }: {
  nodes: TreeNode[];
  depth: number;
  basePath: string;
  selectedPath: string | null;
  activeKey: string | null;
}) {
  return <ul className={depth === 0 ? "" : "border-l border-border/70"} role={depth === 0 ? "tree" : "group"}>
    {nodes.map((node) => {
      const open = node.entry !== null && node.entry.path === selectedPath;
      return <li key={node.path} role="treeitem" aria-expanded={node.children.length ? true : undefined} aria-selected={open || undefined}>
        {node.entry
          ? <Link
            href={`${basePath}/sources?file=${encodeURIComponent(node.entry.path)}`}
            aria-current={open ? "page" : undefined}
            style={{ paddingInlineStart: `${0.5 + depth * 0.75}rem` }}
            className={`vela-object-row flex min-h-9 items-center gap-2 rounded-md py-1.5 pe-2 text-compact focus-visible:outline-2 focus-visible:outline-offset-2 ${open ? "bg-accent font-medium text-accent-foreground shadow-sm" : "hover:bg-muted"}`}
          >
            <HugeiconsIcon icon={SourceCodeIcon} aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate font-mono text-meta">{node.name}</span>
            <span className="shrink-0 font-mono text-micro text-muted-foreground">{node.entry.records.length}</span>
          </Link>
          : <p
            style={{ paddingInlineStart: `${0.5 + depth * 0.75}rem` }}
            className="flex min-h-8 items-center py-1 pe-2 font-mono text-micro text-muted-foreground"
          >{`${node.name}/`}</p>}

        {open && node.entry ? <ul className="border-l border-border/70" role="group">
          {node.entry.records.map((record, index) => {
            const key = recordKey(node.entry as FileEntry, record);
            const active = key === activeKey;
            const label = node.entry?.kind === "formal"
              ? (record as Occurrence).native_id.split(".").slice(1).join(".") || (record as Occurrence).native_id
              : `Excerpt ${index + 1}`;
            const mark = node.entry?.kind === "formal" ? proofMark(record as Occurrence) : null;
            return <li key={key} role="treeitem" aria-selected={active || undefined}>
              <Link
                href={`${basePath}/sources?file=${encodeURIComponent(node.entry!.path)}&symbol=${encodeURIComponent(key)}`}
                aria-current={active ? "location" : undefined}
                style={{ paddingInlineStart: `${0.75 + (depth + 1) * 0.75}rem` }}
                className={`vela-object-row flex min-h-8 items-center gap-2 rounded-md py-1 pe-2 focus-visible:outline-2 focus-visible:outline-offset-2 ${active ? "bg-[var(--vela-surface-selected)] font-medium text-foreground shadow-[inset_3px_0_0_var(--primary)]" : "text-muted-foreground hover:bg-muted"}`}
              >
                {mark ? <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${mark.className}`} /> : null}
                <span className="min-w-0 flex-1 truncate font-mono text-micro">{label}</span>
                {mark ? <span className="sr-only">{mark.label}</span> : null}
              </Link>
            </li>;
          })}
        </ul> : null}

        {node.children.length
          ? <TreeBranch nodes={node.children} depth={depth + 1} basePath={basePath} selectedPath={selectedPath} activeKey={activeKey} />
          : null}
      </li>;
    })}
  </ul>;
}

export function ProblemFiles({ state, basePath, entries, selected, activeRecord, activeKey }: {
  state: State;
  basePath: string;
  entries: FileEntry[];
  selected: FileEntry | null;
  activeRecord: Occurrence | Statement | null;
  activeKey: string | null;
}) {
  const declaration = selected?.kind === "formal" ? activeRecord as Occurrence | null : null;
  const excerpt = selected?.kind === "statements" ? activeRecord as Statement | null : null;
  const retained = declaration
    ? state.sources.statements.find((statement) => statement.occurrence_key === declaration.occurrence_key && statement.statement_form === "formal")
    : null;
  const selectedSource = declaration?.locators.find(({ url }) => Boolean(url))?.url ?? excerpt?.locator_url ?? null;
  const openSource = selected ? selectedSource : state.locator;
  const index = selected && activeRecord ? (selected.records as (Occurrence | Statement)[]).indexOf(activeRecord) : -1;
  /* The resolver's own coverage rows, which include a Source that observed
     nothing here. Regrouping the occurrences could only ever list the Sources
     that did observe something, so a reader had no way to see that a Source
     was consulted and came back empty. */
  const sources = state.sources.coverage;
  const retainedBySource = activeRecord
    ? sources.find((source) => source.source_id === activeRecord.source_id) ?? null
    : null;
  const standing = OCCURRENCE_STANDING[declaration?.occurrence_status ?? ""]
    ?? { label: "Retained excerpt", note: "Quoted source text held against this Problem's identity." };
  const tree = buildTree(entries);
  const path = selected?.path ?? null;
  const directory = path?.includes("/") ? path.slice(0, path.lastIndexOf("/")) : null;
  const filename = path?.includes("/") ? path.slice(path.lastIndexOf("/") + 1) : path;

  return <section aria-labelledby="research-files-heading" className="min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 id="research-files-heading" className="text-title">Sources</h2><p className="mt-1 text-meta text-muted-foreground">Everything below is the source&apos;s own material, retained exactly. None of it is this Problem&apos;s state here.</p></div>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-meta text-muted-foreground">
          {state.sources.statements.length} retained {state.sources.statements.length === 1 ? "statement" : "statements"}
          <span aria-hidden> · </span>
          <span className="font-mono">{state.anchor.sourceCommit.slice(0, 12)}</span>
        </p>
        {openSource ? <Button nativeButton={false} size="sm" variant="outline" render={<a href={openSource} />}>{selected ? "Open selected source" : "Open source"}<HugeiconsIcon icon={ArrowRight01Icon} aria-hidden className="size-3.5" /></Button> : null}
      </div>
    </div>

    {/* Preview first on narrow screens: a reader on a phone came for the
        declaration, not for a list of the paths it might be under.

        Three panes, not two. The middle pane shows someone else's file and the
        right pane says whose it is, on what terms, and what this site does and
        does not conclude from it. Those facts used to be absent here: a reader
        could read a Lean declaration with a proof in it and have nothing on
        screen telling them the record itself asserts no statement identity and
        carries no authority. */}
    <div className="vela-object-surface mt-4 min-w-0 overflow-hidden lg:grid lg:min-h-[34rem] lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_17rem]">
      {/* Three panes are an `xl` composition, not an `lg` one. At 1024 the
          third column left the preview about 270px, which is narrower than a
          line of Lean — so between lg and xl the record pane sits under the
          source list and the file keeps the width it needs. */}
      <div className="order-2 min-w-0 lg:order-none lg:col-start-2 lg:row-start-1 lg:row-span-2 xl:row-span-1">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b bg-muted/20 px-4 py-2.5">
          <div className="min-w-0">
            {directory ? <p className="truncate font-mono text-micro text-muted-foreground">{`${directory}/`}</p> : null}
            <p className="truncate font-mono text-compact text-foreground">{filename ?? state.source.title}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {/* What kind of thing the panel is showing. Retained source is
                quoted material, and saying so on the panel keeps it from
                reading as something this Repository asserts. */}
            {declaration ? <span className="text-micro font-medium text-muted-foreground">{retained ? "Retained formal statement" : "Formal occurrence"}</span>
              : excerpt ? <span className="text-micro font-medium text-muted-foreground">Retained source excerpt</span>
                : null}
            {index >= 0 && selected ? <span className="text-meta text-muted-foreground">{index + 1} of {selected.records.length}</span> : null}
          </div>
        </header>
        <div className="min-w-0 px-4 py-5 sm:px-5">
          {declaration && retained ? <FormalStatementCard occurrence={declaration} />
            : declaration ? <Alert className="bg-muted/25">
              <AlertTitle>Preview unavailable</AlertTitle>
              <AlertDescription>The exact declaration is discoverable, but its text is not retained for display. Open the source to inspect it under the provider&apos;s terms.</AlertDescription>
            </Alert>
              : excerpt ? <>
                <p className="max-w-[72ch] text-body leading-7">{excerpt.text}</p>
                {excerpt.locator_url ? <a className="mt-4 inline-block text-meta font-medium underline underline-offset-4" href={excerpt.locator_url}>Open exact source location</a> : null}
              </>
                : <div className="grid min-h-64 place-items-center text-center">
                  <div>
                    <h3 className="text-subtitle">No previewable source material</h3>
                    {state.locator ? <Button className="mt-4" nativeButton={false} variant="outline" render={<a href={state.locator} />}>Open exact source</Button> : null}
                  </div>
                </div>}
        </div>
      </div>

      <nav aria-label="Problem source paths" className="order-1 border-b bg-[var(--vela-surface-sunken)] p-3 lg:order-none lg:col-start-1 lg:row-start-1 lg:border-b-0 lg:border-e">
        <h3 className="px-2 pb-1 text-meta font-semibold">Source providers</h3>
        <ul className="px-2">
          {sources.map((source) => <li key={source.source_id} className="py-1.5">
            <div className="flex items-center gap-2">
              {/* Observed or not, as a shape as well as a tone: a Source this
                  release never fetched for this Problem is a hollow ring, not
                  a dimmer dot. */}
              <span
                aria-hidden
                className={`size-1.5 shrink-0 rounded-full ${source.source_occurrences ? "bg-status-evidence" : "border border-muted-foreground"}`}
              />
              <span className="min-w-0 flex-1 truncate text-meta">{source.label}</span>
              <span className="shrink-0 font-mono text-micro text-muted-foreground">{source.source_occurrences}</span>
            </div>
            <p className="ps-3.5 text-micro text-muted-foreground">
              {source.source_occurrences ? RETENTION[source.statement_retention] : "not observed here"}
            </p>
          </li>)}
        </ul>
        <h3 className="mt-4 px-2 pb-1 text-meta font-semibold">Referenced paths</h3>
        {entries.length
          ? <TreeBranch nodes={tree} depth={0} basePath={basePath} selectedPath={path} activeKey={activeKey} />
          : <p className="px-2 py-3 text-compact text-muted-foreground">No retained file path.</p>}
      </nav>

      <aside
        aria-label="Selected source record"
        className="order-3 min-w-0 border-t bg-[var(--vela-surface-sunken)] p-4 lg:order-none lg:col-start-1 lg:row-start-2 lg:border-e xl:col-start-3 xl:row-start-1 xl:border-t-0 xl:border-e-0 xl:border-s"
      >
        {activeRecord ? <>
          <h3 className="text-meta font-semibold">What the source says</h3>
          <dl className="mt-2.5 grid gap-2">
            {declaration?.formal?.category_label
              ? <Fact term="Reports" detail={declaration.formal.category_label} />
              : null}
            {declaration?.formal
              ? <Fact
                term="Proof"
                detail={declaration.formal.proof_present === false ? "None attached"
                  : declaration.formal.proof_sorry_free === true ? "Attached, no gaps"
                    : declaration.formal.proof_sorry_free === false ? "Attached, has a hole"
                      : "Attached, completeness not recorded"}
              />
              : null}
            <Fact term="Retains" detail={retainedBySource ? RETENTION[retainedBySource.statement_retention] : "not declared"} />
          </dl>

          <h3 className="mt-5 text-meta font-semibold">How it is bound</h3>
          <p className="mt-2 text-compact">{standing.label}</p>
          <p className="mt-1 text-micro text-muted-foreground">{standing.note}</p>

          {/* The record's own fields, not this page's summary of them. A Lean
              file with a complete proof in it still carries these two values,
              and printing them where the proof is being read is the only place
              the distinction lands. */}
          <dl className="mt-4 grid gap-2 border-t pt-4">
            <Fact term="Statement identity" detail="Not established" />
            <Fact term="Authority effect" detail="None" />
          </dl>

          <h3 className="mt-5 text-meta font-semibold">Exact identity</h3>
          <dl className="mt-2.5 grid gap-3">
            <div>
              <dt className="text-micro text-muted-foreground">Source</dt>
              <dd className="mt-0.5 font-mono text-micro vela-exact-text">{sourceIdOf(activeRecord)}</dd>
            </div>
            {declaration ? <div>
              <dt className="text-micro text-muted-foreground">Declaration</dt>
              <dd className="mt-0.5 font-mono text-micro vela-exact-text">{declaration.native_id}</dd>
            </div> : null}
            <div>
              <dt className="text-micro text-muted-foreground">Record root</dt>
              <dd className="mt-0.5"><RecordId value={activeRecord.row_root} /></dd>
            </div>
          </dl>
        </> : <p className="text-compact text-muted-foreground">
          Select a retained path to inspect the record behind it — what its source reports, how it is bound to this Problem, and its exact roots.
        </p>}
      </aside>
    </div>
  </section>;
}

function Fact({ term, detail }: { term: string; detail: string }) {
  return <div className="flex items-baseline justify-between gap-3">
    <dt className="shrink-0 text-micro text-muted-foreground">{term}</dt>
    <dd className="min-w-0 text-end text-compact">{detail}</dd>
  </div>;
}

function sourceIdOf(record: Occurrence | Statement) {
  return record.source_id.replace(/^source:/u, "");
}
