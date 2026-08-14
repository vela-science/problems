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
     `reviewer` object, so there is no performer to name. Say that. Two of the
     three erdos-321 records in this shape return fail and inconclusive, so
     substituting a guessed `deterministic_tool` kind would assert a performer
     the record does not have. */
  if (!record.reviewer_kind || !record.reviewer_display_name) {
    return {
      label: "Verification",
      headline: `Verification by ${record.verifier_actor}`,
      detail: record.verifier_profile
        ? `Method ${record.verifier_profile} declares no performer`
        : "This Check's method declares no performer",
      methodRoot: null,
    };
  }
  const identity = [record.reviewer_provider, record.reviewer_identifier, record.reviewer_version]
    .filter(Boolean)
    .join(" · ");
  return {
    label: KIND_LABEL[record.reviewer_kind],
    headline: `Review by ${record.reviewer_display_name}`,
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
  return (
    <div data-reviewer-kind={record.reviewer_kind ?? "legacy"}>
      <p className="text-compact font-medium text-foreground">{text.headline}</p>
      <p className="mt-0.5 font-mono text-micro text-muted-foreground">{text.detail}</p>
      {text.methodRoot ? (
        <p className="mt-0.5 break-all font-mono text-micro text-muted-foreground">
          Method root {text.methodRoot}
        </p>
      ) : null}
    </div>
  );
}
