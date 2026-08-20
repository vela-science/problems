import Link from "next/link";
import { ArrowRight01Icon, GitForkIcon, SourceCodeIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription, AlertTitle } from "@vela/ui/components/alert";
import { Button } from "@vela/ui/components/button";
import { FormalStatementCard } from "@/components/vela/formal-statement-card";
import type { ScientificProblemState } from "@/lib/scientific-state";

type State = NonNullable<ScientificProblemState>;
type Occurrence = State["sources"]["occurrences"][number];
type Statement = State["sources"]["statements"][number];

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
            href={`${basePath}?view=sources&file=${encodeURIComponent(node.entry.path)}`}
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
                href={`${basePath}?view=sources&file=${encodeURIComponent(node.entry!.path)}&symbol=${encodeURIComponent(key)}`}
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
  const sources = [...state.sources.occurrences.reduce((groups, occurrence) => {
    const current = groups.get(occurrence.source_id);
    groups.set(occurrence.source_id, { label: occurrence.source_label, count: (current?.count ?? 0) + 1 });
    return groups;
  }, new Map<string, { label: string; count: number }>()).entries()];
  const tree = buildTree(entries);
  const path = selected?.path ?? null;
  const directory = path?.includes("/") ? path.slice(0, path.lastIndexOf("/")) : null;
  const filename = path?.includes("/") ? path.slice(path.lastIndexOf("/") + 1) : path;

  return <section aria-labelledby="research-files-heading" className="min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 id="research-files-heading" className="text-title">Sources</h2><p className="mt-1 text-meta text-muted-foreground">Browse retained paths and inspect the exact material available for this Problem.</p></div>
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
        declaration, not for a list of the paths it might be under. */}
    <div className="vela-object-surface mt-4 min-w-0 overflow-hidden lg:grid lg:min-h-[34rem] lg:grid-cols-[19rem_minmax(0,1fr)]">
      <div className="order-2 min-w-0 lg:order-none lg:col-start-2 lg:row-start-1">
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
        <h3 className="flex items-center gap-2 px-2 pb-1 text-meta font-semibold"><HugeiconsIcon icon={GitForkIcon} aria-hidden className="size-3.5 text-primary" />Source providers</h3>
        <ul className="px-2">
          {sources.map(([id, source]) => <li key={id} className="flex items-center justify-between gap-2 py-1 text-meta">
            <span className="min-w-0 truncate">{source.label}</span>
            <span className="shrink-0 font-mono text-micro text-muted-foreground">{source.count}</span>
          </li>)}
        </ul>
        <h3 className="mt-4 px-2 pb-1 text-meta font-semibold">Referenced paths</h3>
        {entries.length
          ? <TreeBranch nodes={tree} depth={0} basePath={basePath} selectedPath={path} activeKey={activeKey} />
          : <p className="px-2 py-3 text-compact text-muted-foreground">No retained file path.</p>}
      </nav>
    </div>
  </section>;
}
