import type { ReactNode } from "react";
import { Badge } from "@vela/ui/components/badge";
import { CopyButton } from "@vela/ui/vela/copy-button";

/* A retained Lean statement as a file panel rather than a bare string: path,
 * declaration, line-numbered notation, and the proof facts the library
 * publishes about itself. The anatomy is a code host's because that is where
 * these readers live all day; the bytes are the retained ones and nothing is
 * fetched at render time.
 *
 * The highlighter is deliberately a small tokenizer, not a grammar: comments,
 * strings, keywords, `sorry`. Anything it does not recognise renders verbatim
 * in the base ink, which is the honest outcome for notation nobody here
 * authored. A wrong color from a real grammar's edge case would be a claim
 * about the source; plain text is not. */
const KEYWORDS = new Set([
  "theorem", "lemma", "def", "example", "instance", "axiom", "abbrev",
  "structure", "class", "inductive", "where", "fun", "let", "in", "do", "by",
  "import", "open", "namespace", "end", "variable", "universe", "noncomputable",
  "match", "with", "if", "then", "else", "extends", "deriving", "mutual",
]);

const TOKEN = /(\/-[\s\S]*?-\/|--[^\n]*|"(?:[^"\\]|\\.)*"|[A-Za-z_][A-Za-z0-9_!?']*)/gu;

function highlightLine(line: string, lineKey: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of line.matchAll(TOKEN)) {
    const token = match[0];
    const start = match.index;
    if (start > last) parts.push(line.slice(last, start));
    if (token.startsWith("/-") || token.startsWith("--")) {
      parts.push(<span key={`${lineKey}:${start}`} className="text-muted-foreground/80 italic">{token}</span>);
    } else if (token.startsWith("\"")) {
      parts.push(<span key={`${lineKey}:${start}`} className="text-status-evidence">{token}</span>);
    } else if (token === "sorry") {
      parts.push(<span key={`${lineKey}:${start}`} className="font-semibold text-status-conflict">{token}</span>);
    } else if (KEYWORDS.has(token)) {
      parts.push(<span key={`${lineKey}:${start}`} className="font-medium text-foreground/90">{token}</span>);
    } else {
      parts.push(token);
    }
    last = start + token.length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return parts;
}

export function LeanBlock({ code, path, declaration, chips, actions }: {
  code: string;
  /** Repository-relative file path, e.g. FormalConjectures/ErdosProblems/94.lean */
  path?: string | null;
  declaration?: string | null;
  chips?: ReactNode;
  actions?: ReactNode;
}) {
  const lines = code.replace(/\n$/u, "").split("\n");
  const gutter = String(lines.length).length;
  return <figure className="min-w-0 overflow-hidden rounded-lg border bg-background">
    <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-muted/30 px-3 py-2">
      <span className="min-w-0 flex-1 truncate font-mono text-micro text-muted-foreground">
        {path ? <span className="text-foreground/85">{path}</span> : null}
        {path && declaration ? <span aria-hidden> · </span> : null}
        {declaration ? <span>{declaration}</span> : null}
      </span>
      <span className="font-mono text-micro tabular-nums text-muted-foreground">{lines.length} {lines.length === 1 ? "line" : "lines"}</span>
      {actions}
      <CopyButton value={code} label="Copy statement" compact />
    </figcaption>
    <pre className="overflow-x-auto px-0 py-3 text-compact leading-6" tabIndex={0}>
      <code className="grid font-mono">
        {lines.map((line, index) => <span key={index} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 px-3 hover:bg-muted/25">
          <span aria-hidden className="select-none text-right tabular-nums text-muted-foreground/60" style={{ minWidth: `${gutter}ch` }}>{index + 1}</span>
          <span className="whitespace-pre">{highlightLine(line, String(index))}</span>
        </span>)}
      </code>
    </pre>
    {chips ? <div className="flex flex-wrap items-center gap-2 border-t bg-muted/20 px-3 py-2">{chips}</div> : null}
  </figure>;
}

/* The proof facts a formal library declares about one statement, as chips in
 * the file panel's footer. These are the library's own labels; none is a Vela
 * Verification, which is why they render as source facts and never on the
 * Standing axis. */
export function ProofChips({ proofPresent, proofKind, sorryFree, categoryLabel }: {
  proofPresent: boolean | null;
  proofKind: string | null;
  sorryFree: boolean | null;
  categoryLabel: string | null;
}) {
  return <>
    {categoryLabel ? <Badge variant="secondary">{categoryLabel}</Badge> : null}
    {proofPresent === true ? <Badge variant="outline">proof {proofKind ? proofKind.replaceAll("_", " ") : "present"}</Badge> : null}
    {proofPresent === false ? <Badge variant="outline">statement only</Badge> : null}
    {sorryFree === true ? <Badge variant="outline">sorry-free</Badge> : null}
    {sorryFree === false ? <Badge variant="outline" className="text-status-conflict">contains sorry</Badge> : null}
  </>;
}
