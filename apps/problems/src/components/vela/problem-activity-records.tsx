import { AiBrain01Icon, UserMultiple02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ScientificProblemState } from "@/lib/scientific-state";

type State = NonNullable<ScientificProblemState>;

function strings(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
  return typeof value === "string" && value.trim() ? [value.trim()] : [];
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/* Human and machine performers, side by side and weighted the same.
 *
 * These rows are source-reported attribution: the Erdős AI contributions wiki
 * and VibeMathed each say who worked on a Problem. Vela has not reviewed the
 * claim, so nothing here carries Standing, a Decision, or a Check — the
 * heading and the note say so once, and then the names are simply shown. */
export function ProblemActivityRecords({ state }: { state: State }) {
  const entries = state.attributedRecords ?? [];
  if (!entries.length) return null;

  return <section aria-labelledby="reported-activity-heading" className="min-w-0">
    <h2 id="reported-activity-heading" className="text-title">Reported activity</h2>
    <p className="mt-2 max-w-[68ch] text-compact text-muted-foreground">
      Work these sources record against this Problem. Source-reported attribution, not reviewed here.
    </p>
    <ul className="mt-4 divide-y rounded-lg border">
      {entries.map(({ occurrence, record }) => {
        const metadata = record.metadata as Record<string, unknown>;
        const systems = strings(metadata.ai_systems).concat(strings(metadata.model));
        const humans = strings(metadata.humans).concat(strings(metadata.human_collaborators));
        const section = text(metadata.section_name) ?? text(metadata.resolution_method) ?? text(metadata.category_label);
        const when = text(metadata.date) ?? text(metadata.year_posed);
        const outcome = text(metadata.outcome_label) ?? text(metadata.resolution) ?? text(metadata.solve_type);
        const locator = occurrence.locators.find(({ url }) => url)?.url ?? null;
        return <li key={occurrence.occurrence_key} className="px-4 py-3.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="min-w-0 text-compact font-medium">{section ?? occurrence.source_label}</p>
            <p className="text-meta text-muted-foreground">{occurrence.source_label}{when ? ` · ${when}` : ""}</p>
          </div>
          <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1.5">
            {systems.length ? <div className="flex min-w-0 items-center gap-2">
              <dt className="flex items-center gap-1.5 text-micro uppercase tracking-wide text-muted-foreground">
                <HugeiconsIcon icon={AiBrain01Icon} strokeWidth={1.8} aria-hidden className="size-3.5" />Machine
              </dt>
              <dd className="min-w-0 text-meta">{systems.join(", ")}</dd>
            </div> : null}
            {humans.length ? <div className="flex min-w-0 items-center gap-2">
              <dt className="flex items-center gap-1.5 text-micro uppercase tracking-wide text-muted-foreground">
                <HugeiconsIcon icon={UserMultiple02Icon} strokeWidth={1.8} aria-hidden className="size-3.5" />People
              </dt>
              <dd className="min-w-0 text-meta">{humans.join(", ")}</dd>
            </div> : null}
            {outcome ? <div className="flex min-w-0 items-center gap-2">
              <dt className="text-micro uppercase tracking-wide text-muted-foreground">Reported outcome</dt>
              <dd className="min-w-0 text-meta">{outcome}</dd>
            </div> : null}
          </dl>
          {locator ? <a href={locator} className="mt-2 inline-block text-meta text-muted-foreground underline underline-offset-4 hover:text-foreground">Open the source record</a> : null}
        </li>;
      })}
    </ul>
  </section>;
}
