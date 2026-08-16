export type ReviewerKind = "human" | "ai_model" | "organization" | "deterministic_tool";

export interface ReviewProvenanceRecord {
  verifier_actor: string;
  verifier_profile?: string | null;
  reviewer_kind?: ReviewerKind | null;
  reviewer_display_name?: string | null;
  reviewer_identifier?: string | null;
  reviewer_provider?: string | null;
  reviewer_version?: string | null;
  review_method_root?: string | null;
}

const KIND_LABEL: Record<ReviewerKind, string> = {
  human: "Human",
  ai_model: "AI model",
  organization: "Organization",
  deterministic_tool: "Deterministic tool",
};

export function reviewProvenanceText(record: ReviewProvenanceRecord) {
  /* "Legacy method provenance" graded the record instead of describing it, and
     the grade was not the product's to give: these Checks are complete records
     whose method file is `vela.verification-method.v1`, which carries no
     `reviewer` object, so there is no performer to name. Say that.
     Substituting a guessed `deterministic_tool` kind would assert a performer
     the record does not have. Four retained Checks are in this shape — both
     Erdős 321 records, 887's replay, and 94's double-counting — and all of
     them pass; the shape is about what the method declares, not about what
     the Check found. */
  if (!record.reviewer_kind || !record.reviewer_display_name) {
    return {
      label: "Verification",
      headline: `Verification by ${record.verifier_actor}`,
      detail: record.verifier_profile
        ? `Method ${record.verifier_profile} declares no performer`
        : "This Check's method declares no performer",
      model: null,
      methodRoot: null,
    };
  }
  const identity = [record.reviewer_provider, record.reviewer_identifier, record.reviewer_version]
    .filter(Boolean)
    .join(" · ");
  /* The model reads at the same weight as the name that was declared for it.
   *
   * `display_name` is whatever the method manifest chose, and the two Checks
   * over Erdős 94 chose differently: one says "Claude Opus 5" and the other
   * "Correction scope reviewer". Both are `ai_model`, so one headline named a
   * model and the other named a job, and the model behind the job sat a type
   * size down among five other facts. Naming the model beside the declared
   * name makes the two read as the same kind of thing without the product
   * inventing an identity the record does not carry — where provider and
   * version are absent, nothing is added. */
  const model = record.reviewer_kind === "ai_model"
    ? [record.reviewer_provider, record.reviewer_version].filter(Boolean).join(" ") || null
    : null;
  return {
    label: KIND_LABEL[record.reviewer_kind],
    headline: `Review by ${record.reviewer_display_name}`,
    model,
    detail: [
      KIND_LABEL[record.reviewer_kind],
      identity,
      record.verifier_profile ? `method ${record.verifier_profile}` : null,
      `recorded by ${record.verifier_actor}`,
    ].filter(Boolean).join(" · "),
    methodRoot: record.review_method_root ?? null,
  };
}

export function ReviewProvenance({ record }: { record: ReviewProvenanceRecord }) {
  const text = reviewProvenanceText(record);
  /* Omitted, not renamed. A null `reviewer_kind` is the current correct
     state, not an old shape: a `vela.verification-method.v1` method carries no
     `reviewer` object, so there is no performer to name, and the text below
     already says exactly that. Only this attribute called it "legacy", and
     nothing reads the value. */
  return (
    <div data-reviewer-kind={record.reviewer_kind ?? undefined}>
      <p className="text-compact font-medium text-foreground">
        {text.headline}
        {text.model ? <span className="ml-2 font-mono font-normal text-muted-foreground">{text.model}</span> : null}
      </p>
      <p className="mt-0.5 font-mono text-micro text-muted-foreground">{text.detail}</p>
      {text.methodRoot ? (
        <p className="mt-0.5 break-all font-mono text-micro text-muted-foreground">
          Method root {text.methodRoot}
        </p>
      ) : null}
    </div>
  );
}
