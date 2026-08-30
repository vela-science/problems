import Link from "next/link";
/* What it takes for a contribution to reach this record, said before the
 * account rather than after it.
 *
 * A signed-out reader saw one control and one sentence naming three record
 * types they could not create. Four of the seven steps have nothing to do with
 * an account, and two of them are steps this site cannot perform at all.
 *
 * The `where` column is the information; the step is a label for it. Writing
 * each step as a sentence explaining itself made a seven-paragraph essay out of
 * a table. */

type Ground = "public" | "account" | "your machine" | "repository";

const steps: Array<{ text: string; where: Ground }> = [
  { text: "Read the sources and their formal declarations.", where: "public" },
  { text: "Work on it, wherever you work.", where: "your machine" },
  { text: "Keep an Approach and its Attempts here.", where: "account" },
  { text: "Attach evidence by its content root.", where: "account" },
  { text: "Prepare an unsigned Submission draft.", where: "account" },
  { text: "Sign it with your own key.", where: "your machine" },
  { text: "The Repository decides.", where: "repository" },
];

const grounds: Record<Ground, string> = {
  public: "Public",
  account: "Needs an account",
  "your machine": "Your machine",
  repository: "The Repository",
};

export function ContributionPath({ accountsEnabled }: { accountsEnabled: boolean }) {
  return <section aria-labelledby="contribution-path-heading" className="min-w-0">
    <h2 id="contribution-path-heading" className="text-title">How a contribution reaches this record</h2>
    <p className="mt-2 text-compact text-muted-foreground">
      {accountsEnabled ? "Seven steps, in four places." : "Seven steps, in four places. Sign-in is unavailable on this deployment."}
    </p>
    <ol className="mt-4 divide-y rounded-lg border">
      {steps.map((step, index) => <li key={step.text} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 px-4 py-3 sm:grid-cols-[1.5rem_minmax(0,1fr)_8.5rem]">
        <span aria-hidden className="font-mono text-micro text-muted-foreground">{index + 1}</span>
        <p className="min-w-0 text-compact">{step.text}</p>
        <span className="col-start-2 text-micro text-muted-foreground sm:col-start-3 sm:text-right">
          {grounds[step.where]}
        </span>
      </li>)}
    </ol>
  </section>;
}

/* The one step this reader is at, for a Problem's Work section.
 *
 * The full table above is one fact about the product, not about this Problem,
 * and it rendered identically on all 1,217 of them — a numbered explanation
 * standing in for the surface it occupies, which is the thing `AGENTS.md`
 * names as a defect. It keeps its home on `/contribute`, where choosing what
 * to work on is the page's whole subject. Here, only the next move. */
export function NextContributionStep({ accountsEnabled }: { accountsEnabled: boolean }) {
  /* Reading the sources is step one and it is what this page is. The move is
     the second: off this site, onto the reader's own machine. Nothing further
     can be named without knowing what they have already done, and guessing
     would put the table back. */
  const step = steps[1]!;
  const gated = steps.filter((entry) => entry.where === "account").length;
  return <section aria-labelledby="next-step-heading" className="min-w-0">
    <h2 id="next-step-heading" className="text-title">Next</h2>
    <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg border px-4 py-3">
      <p className="min-w-0 text-compact">{step.text}</p>
      <span className="text-micro text-muted-foreground">{grounds[step.where]}</span>
    </div>
    {/* What an account is for, still said before the account and without the
        seven-row table. A signed-out reader learning nothing about the gated
        steps was the defect the table was written to fix; repeating the table
        on all 1,217 Problems was the defect it became. */}
    <p className="mt-3 max-w-[62ch] text-compact text-muted-foreground">
      {gated} of the seven steps run here and need an account: keeping an Approach and its Attempts,
      attaching evidence by its content root, and preparing an unsigned Submission draft.
      {accountsEnabled ? " " : " Sign-in is unavailable on this deployment. "}
      <Link href="/contribute" className="font-medium text-foreground underline underline-offset-4">The whole path</Link>
      {" "}covers all seven, in four places.
    </p>
  </section>;
}
