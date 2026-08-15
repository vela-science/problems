import { canonicalJson } from "@vela/projection-data/canonical";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@vela/ui/components/collapsible";
import { CopyButton } from "@vela/ui/vela/copy-button";
import { RecordId } from "@/components/vela/record-id";

/* The bytes the root is the digest of.
 *
 * Every record page printed a content address and none printed the content. A
 * reader could see `sha256:c5b067c3…` and had no way to check it short of
 * cloning the Repository — which makes the product's central claim something you
 * take on faith on the one surface built to expose it.
 *
 * The projection retains the record as jsonb, and canonicalising it back
 * reproduces the file exactly: over all 2,886 retained records, sha256 of these
 * bytes equals the record's own `*_root` column, equals the filename under
 * `records/`, and equals the bytes GitHub serves raw. So this is not a rendering
 * of the record — it is the record.
 *
 * Canonicalisation is `canonicalJson` from `@vela/projection-data/canonical`,
 * not a local one. That module is a conforming implementation of the protocol's
 * own Rust canonicalizer, pinned to its test vectors at
 * `config/canonical-hashing.v2.json`, and it refuses the four inputs
 * `JSON.stringify` silently rewrites — NaN, an unsafe integer, an undefined
 * property, an undefined array element — each of which would mint a root over
 * bytes nobody wrote. A second implementation here would be a second definition
 * of what a Vela root is. */

export function CanonicalBytes({
  record,
  root,
  className,
}: {
  record: unknown;
  /** The record's own root. Shown beside the bytes so the two can be compared. */
  root: string | null | undefined;
  className?: string;
}) {
  if (!record || typeof record !== "object") return null;
  const bytes = canonicalJson(record);
  const encoded = new TextEncoder().encode(bytes).length;

  return (
    <Collapsible className={className}>
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-compact font-medium">
        Canonical bytes
        <span className="font-mono text-micro font-normal text-muted-foreground tabular-nums">
          {encoded.toLocaleString()} bytes
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t p-3">
        <p className="max-w-[85ch] text-micro text-muted-foreground">
          These are the exact bytes the Repository retains. Their SHA-256 is the
          root below, so a reader can check the address against the content
          without cloning.
        </p>
        {root ? (
          <p className="mt-2 flex flex-wrap items-center gap-1.5">
            <RecordId value={root} />
            <CopyButton compact value={root} label={`Copy ${root}`} />
          </p>
        ) : null}
        <pre className="mt-2 max-h-72 overflow-auto rounded-md bg-muted p-3 font-mono text-micro leading-relaxed">
          <code className="break-all whitespace-pre-wrap">{bytes}</code>
        </pre>
        <div className="mt-2">
          <CopyButton compact value={bytes} label="Copy canonical bytes" />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
