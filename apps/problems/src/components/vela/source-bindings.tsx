import Link from "next/link";
import { Item, ItemContent, ItemDescription, ItemTitle, ItemGroup } from "@vela/ui/components/item";
import { StatusBadge } from "@vela/ui/vela/status-badge";
import { cn } from "@vela/ui/lib/utils";

/* What this Repository's accepted Standing was read out of.
 *
 * The composition bar above says 2,674 of erdős's accepted Claims carry the
 * retained `source_type` `database_record`. This says which corpora those are,
 * with the exact binding count the registry retains, so the share and its
 * origin can be checked against each other on one screen.
 *
 * `mathSourceRegistryRead` already scopes its result to the Repository — it drops
 * any declaration whose `coverage.repository_slugs` does not name the slug — so
 * every source arriving here is declared for this Repository. A declared source
 * with no retained binding is still a fact about the release, so it is named in
 * a sentence rather than dropped: the registry's one unobserved source binds
 * nothing, and a reader who cannot see it would think it does not exist.
 *
 * Row shape adapted from Tailwind Plus Application UI v4
 * `lists/stacked-lists/08-two-columns-with-links`: the row-wide link and the
 * right-justified secondary column that collapses under the primary at narrow
 * widths. Its Heroicon chevron is dropped, its palette ramps are the shared
 * tokens, its anchors are `next/link`, and its rows are the shared `Item`.
 * Recorded in docs/editorial-references.md. */

export type SourceBindingRow = {
  sourceId: string;
  publisher: string;
  /** `repository_binding_count`, scoped to this Repository by the registry read. */
  bindings: number;
  /** `observation.coverage.status`, or null where no observation is retained. */
  coverage: string | null;
};

const number = new Intl.NumberFormat("en-US");

export function SourceBindings({
  sources,
  slug,
  className,
}: {
  sources: SourceBindingRow[];
  slug: string;
  className?: string;
}) {
  const bound = sources.filter((source) => source.bindings > 0);
  const unbound = sources.filter((source) => source.bindings === 0);
  if (!sources.length) return null;

  return (
    <div className={cn("min-w-0", className)}>
      {bound.length ? (
        <ItemGroup className="divide-y">
          {bound.map((source) => (
            <Item
              key={source.sourceId}
              size="sm"
              className="rounded-none px-0 py-3"
              render={<Link href={`/sources?repository=${slug}&source=${encodeURIComponent(source.sourceId)}`} />}
            >
              <ItemContent>
                <ItemTitle className="font-mono text-micro [overflow-wrap:anywhere]">{source.sourceId}</ItemTitle>
                <ItemDescription>{source.publisher}</ItemDescription>
              </ItemContent>
              <div className="flex shrink-0 items-center gap-3">
                {source.coverage && source.coverage !== "complete"
                  ? <StatusBadge tone="caution">{source.coverage}</StatusBadge>
                  : null}
                <span className="text-right">
                  <span className="block font-mono text-micro tabular-nums">{number.format(source.bindings)}</span>
                  <span className="block text-micro text-muted-foreground">bindings</span>
                </span>
              </div>
            </Item>
          ))}
        </ItemGroup>
      ) : null}

      {unbound.length ? (
        <div className={cn("min-w-0 text-meta text-muted-foreground", bound.length && "mt-3")}>
          <p>Declared for this Repository with no retained binding:</p>
          <div className="mt-1 flex min-w-0 flex-wrap gap-x-2 gap-y-1">
            {unbound.map((source) => (
            <span key={source.sourceId} className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-1">
              <Link className="font-mono underline-offset-2 hover:underline" href={`/sources?repository=${slug}&source=${encodeURIComponent(source.sourceId)}`}>
                {source.sourceId}
              </Link>
              {source.coverage && source.coverage !== "complete"
                ? <> <StatusBadge tone="caution">{source.coverage}</StatusBadge></>
                : null}
            </span>
          ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
