import { describe, expect, test } from "vitest";
import { claimImpactSummary, relationshipHeading } from "./page";

describe("Claim relationship headings", () => {
  test("uses a grammatical inverse for synthesized_from", () => {
    expect(relationshipHeading({
      relation: "synthesized_from",
      direction: "outgoing",
    } as never)).toBe("Synthesized from");

    expect(relationshipHeading({
      relation: "synthesized_from",
      direction: "incoming",
    } as never)).toBe("Source for");

    expect(relationshipHeading({
      relation: "supersedes",
      direction: "incoming",
    } as never)).toBe("Superseded by");
  });

  test("summarizes only explicit correction and dependent edges", () => {
    expect(claimImpactSummary({
      groups: [
        { direction: "outgoing", relation: "supersedes", count: 1 },
        { direction: "incoming", relation: "supersedes", count: 2 },
        { direction: "incoming", relation: "depends", count: 3 },
        { direction: "outgoing", relation: "supports", count: 8 },
      ],
    } as never)).toEqual({
      supersedes: 1,
      superseded_by: 2,
      direct_dependents: 3,
    });

    expect(claimImpactSummary(undefined)).toEqual({
      supersedes: 0,
      superseded_by: 0,
      direct_dependents: 0,
    });
  });
});
