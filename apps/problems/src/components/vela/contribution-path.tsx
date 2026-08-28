/* What it takes for a contribution to reach this record, said before the
 * account rather than after it.
 *
 * A signed-out reader saw one control — Sign in to contribute — and one
 * sentence naming three record types they could not create. Every step of the
 * real path was behind the account, including the four steps the account has
 * nothing to do with. Nothing about the authority boundary requires that: the
 * path is a property of Vela, not a feature of this deployment, and stating it
 * discloses nothing the boundary keeps.
 *
 * The column that carries the meaning is `where`, not the number. This product
 * exists to say that capability is held in four separate places — the public
 * record, a hosted account, a key on your own machine, and a Repository — and
 * a reader who leaves this page knowing only that has the thesis. The numbers
 * are ordinal because the steps genuinely are ordered; step five cannot precede
 * step four.
 *
 * Two steps say what this site cannot do, and they are the two that matter
 * most. Signing uses a key this deployment does not hold, and a Decision is a
 * Repository act. A path that quietly stopped at "prepare a draft" would leave
 * a reader believing the web product finishes the job. */

type Ground = "public" | "account" | "your machine" | "repository";

const steps: Array<{ text: string; where: Ground }> = [
  { text: "Read what the sources retain, and the formal declarations filed against this question.", where: "public" },
  { text: "Work on it wherever you work. The local handoff carries this exact Problem, source revision, and authority Repository.", where: "your machine" },
  { text: "Retain an Approach and its Attempts here, so the reasoning has somewhere to live while it is unfinished.", where: "account" },
  { text: "Attach evidence. This site keeps the root, the byte count and the locator; the bytes stay where you put them.", where: "account" },
  { text: "Prepare a Submission draft. It is unsigned, and it validates against the pinned public schema.", where: "account" },
  { text: "Sign it with your own key. This site holds no signing key and cannot sign for you.", where: "your machine" },
  { text: "The Repository decides. Verification is evidence; acceptance is a separate act with a signature behind it.", where: "repository" },
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
    <p className="mt-2 max-w-[68ch] text-compact text-muted-foreground">
      Seven steps, in four different places. {accountsEnabled
        ? "Three of them need an account here. The other four never touch one."
        : "This deployment has no identity provider, so the three that need an account are unavailable here."}
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
