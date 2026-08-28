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
