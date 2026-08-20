import type { ReactNode } from "react";
import { cn } from "@vela/ui/lib/utils";
import { toneFills, type StatusTone } from "@vela/ui/vela/status-badge";
import { PageHero } from "@vela/ui/vela/page-shell";

/* The tone vocabulary and its fill are the badge's, imported rather than
   restated: this file and composition-bar.tsx each held a copy, and one of
   them had lost the neutral row. */
export type PageSignal = {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: StatusTone;
};

export function PageIntro({
  title,
  description,
  actions,
  signals = [],
  className,
}: {
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  signals?: PageSignal[];
  className?: string;
}) {
  return (
    <PageHero density="compact" className={cn(className)}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <h1 className="min-w-0 text-display [overflow-wrap:anywhere]">
            {title}
          </h1>
          <p className="mt-2 max-w-[65ch] text-body text-muted-foreground">
            {description}
          </p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div> : null}
      </div>

      {signals.length ? (
        <dl className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {signals.map((signal) => (
            <div
              key={signal.label}
              className="relative min-w-0 rounded-lg bg-background/55 py-3 pl-6 pr-3"
            >
              <span
                aria-hidden
                className={`absolute left-0 top-3.5 size-1.5 rounded-full ${toneFills[signal.tone ?? "neutral"]}`}
              />
              <dt className="text-eyebrow text-muted-foreground">
                {signal.label}
              </dt>
              <dd className="mt-1 min-w-0 break-words text-subtitle">{signal.value}</dd>
              {signal.detail ? <dd className="mt-0.5 min-w-0 break-words text-meta text-muted-foreground">{signal.detail}</dd> : null}
            </div>
          ))}
        </dl>
      ) : null}
    </PageHero>
  );
}
