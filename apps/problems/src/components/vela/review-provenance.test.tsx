import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { ReviewProvenance, reviewProvenanceText } from "./review-provenance";

describe("review provenance", () => {
  test("names an AI model, provider, identifier, and separate attesting actor", () => {
    const html = renderToStaticMarkup(<ReviewProvenance record={{
      verifier_actor: "agent:codex-review",
      reviewer_kind: "ai_model",
      reviewer_display_name: "GPT-5.6 Sol",
      reviewer_identifier: "gpt-5.6-sol",
      reviewer_provider: "OpenAI",
      reviewer_version: null,
      verifier_profile: "statement-fidelity-v1",
      review_method_root: `sha256:${"1".repeat(64)}`,
    }} />);
    expect(html).toContain("Review by GPT-5.6 Sol");
    expect(html).toContain("AI model · OpenAI · gpt-5.6-sol · method statement-fidelity-v1 · recorded by agent:codex-review");
    expect(html).toContain(`Method root sha256:${"1".repeat(64)}`);
    expect(html).toContain('data-reviewer-kind="ai_model"');
    expect(html).not.toMatch(/accepted|approved|Standing changed/u);
  });

  test("names a human without inventing a provider", () => {
    expect(reviewProvenanceText({
      verifier_actor: "human:william-blair",
      reviewer_kind: "human",
      reviewer_display_name: "William Blair",
      reviewer_identifier: "human:william-blair",
    })).toMatchObject({
      headline: "Review by William Blair",
      detail: "Human · human:william-blair · recorded by human:william-blair",
    });
  });

  /* Names the record rather than grading it. These Checks are complete; their
     method schema simply carries no `reviewer` object, so there is no performer
     to report — which is a fact about the method, not a defect in the Check. */
  test("names the missing performer instead of guessing a reviewer kind", () => {
    expect(reviewProvenanceText({
      verifier_actor: "verifier:replay",
      verifier_profile: "lean-kernel-replay-v1",
    })).toEqual({
      label: "Verification",
      headline: "Verification by verifier:replay",
      detail: "Method lean-kernel-replay-v1 declares no performer",
      model: null,
      methodRoot: null,
    });

    expect(reviewProvenanceText({ verifier_actor: "verifier:replay" }).detail)
      .toBe("This Check's method declares no performer");
  });

  test("uses one peer review grammar across reviewer kinds", () => {
    const human = reviewProvenanceText({
      verifier_actor: "human:reviewer",
      reviewer_kind: "human",
      reviewer_display_name: "A. Reviewer",
      reviewer_identifier: "human:reviewer",
    });
    const ai = reviewProvenanceText({
      verifier_actor: "agent:reviewer",
      reviewer_kind: "ai_model",
      reviewer_display_name: "Model X",
      reviewer_identifier: "model-x",
      reviewer_provider: "Provider",
    });
    expect(human.headline).toBe("Review by A. Reviewer");
    expect(ai.headline).toBe("Review by Model X");
    expect(human.label).toBe("Human");
    expect(ai.label).toBe("AI model");
  });

  /* A Check whose method declares no performer is a complete record, not an
     old one. It must not be labelled, and it must say why in words. */
  test("names no performer, and no kind, when the method declares none", () => {
    const html = renderToStaticMarkup(<ReviewProvenance record={{
      verifier_actor: "verifier:tool",
      verifier_profile: "replay-v1",
    }} />);
    expect(html).not.toContain("data-reviewer-kind");
    expect(html).not.toContain("legacy");
    expect(html).toContain("Method replay-v1 declares no performer");
  });
});
