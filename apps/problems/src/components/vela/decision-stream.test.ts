import { describe, expect, it } from "vitest";
import { decidedAssertionLead } from "./decision-stream";

/* The "Decided on" line truncates to one row. At the 232px it gets in the
   Decisions column that is 38 characters, and on every Erdős 94 Decision those
   38 characters were a repository name and a clipped commit hash. */
describe("decidedAssertionLead", () => {
  it("drops the exact-locator preamble so the visible clause carries meaning", () => {
    const assertion = "At lean-proofs commit 423344341fbfdf4f8f684a302c5d05379125e7dc, Erdos94.variants.sum_multiplicity proves that for every finite planar point set P, the sum over its distinct determined distances equals P.card.choose 2.";
    expect(decidedAssertionLead(assertion)).toBe(
      "Erdos94.variants.sum_multiplicity proves that for every finite planar point set P, the sum over its distinct determined distances equals P.card.choose 2.",
    );
    expect(decidedAssertionLead(assertion).slice(0, 38)).toBe("Erdos94.variants.sum_multiplicity prov");
  });

  it("reads the other preamble the projection writes", () => {
    expect(decidedAssertionLead("Under the retained replay at commit 423344341fbfdf4f, Lean 4.22.0 elaborates the scoped declaration."))
      .toBe("Lean 4.22.0 elaborates the scoped declaration.");
  });

  /* A greedy rule would eat the first clause of an assertion that merely
     mentions a commit, which is worse than the preamble it removes. */
  it("leaves an assertion that is not a locator preamble exactly as written", () => {
    const plain = "A two-sided asymptotic bound on extremalSize, established without reference to any commit.";
    expect(decidedAssertionLead(plain)).toBe(plain);
  });

  it("keeps the locator when it is the whole assertion", () => {
    const bare = "At lean-proofs commit 423344341fbfdf4f8f684a302c5d05379125e7dc, proved.";
    expect(decidedAssertionLead(bare)).toBe(bare);
  });
});
