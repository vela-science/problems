import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import { ProposalObjectChain } from "./proposal-object-chain";

afterEach(cleanup);

describe("ProposalObjectChain", () => {
  test("renders lifecycle anchors without duplicating the Evidence section's Checks", () => {
    const { container } = render(
      <ProposalObjectChain
        proposalRoot={`sha256:${"3".repeat(64)}`}
        review={{
          proposal_id: "vpr_test",
          status: "pending_review",
          content_root: `sha256:${"1".repeat(64)}`,
          receipt_root: null,
          decision_event_id: null,
          decision_plan_root: null,
          decision_provenance: "pending",
          producer_package_kind: "submission_v1",
          producer_package_id: "vsb_test",
          producer_package_root: `sha256:${"2".repeat(64)}`,
        }}
      />,
    );

    const text = container.textContent ?? "";
    expect(text.indexOf("Published contribution")).toBeLessThan(text.indexOf("Proposed change"));
    expect(text.indexOf("Proposed change")).toBeLessThan(text.indexOf("Decision"));
    expect(container.querySelector('[aria-label="Copy Exact Submission ID"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Copy Exact Proposal ID"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Copy Exact Proposal root"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Copy Claim root bound by Proposal"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Copy Exact Proposal root"]')?.parentElement?.textContent)
      .toBe(`sha256:${"3".repeat(64)}`);
    expect(container.querySelector('[aria-label="Copy Claim root bound by Proposal"]')?.parentElement?.textContent)
      .toBe(`sha256:${"1".repeat(64)}`);
    expect(container.querySelector('[aria-label="Copy Exact Verification Record ID"]')).toBeNull();
    expect(text).not.toContain("Check");
    expect(text).not.toContain("Registration Record");
  });
});
