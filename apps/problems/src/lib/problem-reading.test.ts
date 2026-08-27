import { describe, expect, it } from "vitest";
import { problemReading, readingBadge } from "./problem-reading";

describe("problemReading", () => {
  it("reads a Problem with no accepted Claim as no record, not as open", () => {
    const reading = problemReading({ currentAssertion: null, repositoryName: "Vela Mathematics Program" });
    expect(reading.kind).toBe("no-record");
    expect(readingBadge(reading)).toBe("No record");
  });

  it("reads an accepted Claim that declares its limit as leaving the Problem open", () => {
    const reading = problemReading({
      currentAssertion: "At lean-proofs commit 4233443, Erdos94.variants.sum_multiplicity proves that the sum over distinct determined distances of the unordered-pair distance multiplicities equals P.card.choose 2. This identity does not establish the cubic distance-multiplicity conjecture.",
      repositoryName: "Vela Mathematics Program",
    });
    expect(reading.kind).toBe("open");
    expect(reading.headline).toBe("Open in the state represented here.");
    expect(reading.limitation).toMatch(/does not establish the cubic distance-multiplicity conjecture/u);
  });

  it("reads a candidate answer as open rather than as a proof", () => {
    const reading = problemReading({
      currentAssertion: "A two-sided asymptotic bound on extremalSize. This supplies a candidate answer, not a proof of it.",
      repositoryName: "Vela Mathematics Program",
    });
    expect(reading.kind).toBe("open");
  });

  /* The zero-tolerance gate: an accepted Claim must never read as a resolved
     Problem, whatever else the derivation does. */
  it("never reports a Problem as solved", () => {
    for (const assertion of [
      null,
      "An accepted result with no scope sentence at all.",
      "Proves the identity. This result does not establish the headline conjecture.",
    ]) {
      const reading = problemReading({ currentAssertion: assertion, repositoryName: "Vela Mathematics Program" });
      expect(readingBadge(reading).toLowerCase()).not.toContain("solved");
      expect(reading.headline.toLowerCase()).not.toContain("solved");
      expect(reading.headline.toLowerCase()).not.toContain("resolved");
    }
  });

  it("does not claim a limitation the Claim never declared", () => {
    const reading = problemReading({
      currentAssertion: "An accepted result with no scope sentence at all.",
      repositoryName: "Vela Mathematics Program",
    });
    expect(reading.kind).toBe("accepted");
    expect(reading.limitation).toBeNull();
    expect(reading.headline).toBe("A Result is accepted in Vela Mathematics Program.");
  });
});
