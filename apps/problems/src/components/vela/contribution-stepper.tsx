import {
  CheckmarkCircle01Icon,
  FileAttachmentIcon,
  PuzzleIcon,
  SentIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

const steps = [
  { title: "Choose a Problem", detail: "Start with the exact scientific question.", icon: PuzzleIcon },
  { title: "Attach work and evidence", detail: "Name the approach, assumptions, artifacts, and outcome.", icon: FileAttachmentIcon },
  { title: "Review scope and checks", detail: "Preview what is claimed, what was checked, and what remains open.", icon: CheckmarkCircle01Icon },
  { title: "Submit the handoff", detail: "Prepare the exact repository-local contribution for review.", icon: SentIcon },
] as const;

export function ContributionStepper({ current = 1, heading = "From question to contribution" }: { current?: 1 | 2 | 3 | 4; heading?: string }) {
  return <section aria-labelledby="contribution-stepper-heading">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-eyebrow uppercase text-muted-foreground">Contribution path</p><h2 id="contribution-stepper-heading" className="mt-1 text-title">{heading}</h2></div>
      <p className="text-meta text-muted-foreground">Step {current} of {steps.length}</p>
    </div>
    <ol className="mt-6 grid gap-0 sm:grid-cols-4">
      {steps.map((step, index) => {
        const number = index + 1;
        const active = number === current;
        const complete = number < current;
        return <li key={step.title} aria-current={active ? "step" : undefined} className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 pb-6 last:pb-0 sm:block sm:pb-0 sm:pr-5 last:sm:pr-0">
          {index < steps.length - 1 ? <span aria-hidden className={`absolute bottom-0 left-[1.1875rem] top-10 w-px sm:left-10 sm:right-0 sm:top-[1.1875rem] sm:h-px sm:w-auto ${complete ? "bg-status-progress" : "bg-border"}`} /> : null}
          <span aria-hidden className={`relative z-10 grid size-10 place-items-center rounded-full border forced-colors:border-2 ${active ? "border-status-evidence bg-status-evidence text-background ring-4 ring-status-evidence/10" : complete ? "border-status-progress bg-status-progress text-background" : "border-border bg-background text-muted-foreground"}`}>
            <HugeiconsIcon icon={step.icon} className="size-4" />
          </span>
          <span className="min-w-0 sm:mt-4 sm:block">
            <span className="block text-label font-medium">{step.title}</span>
            <span className="mt-1 block text-meta text-muted-foreground">{step.detail}</span>
          </span>
        </li>;
      })}
    </ol>
  </section>;
}
