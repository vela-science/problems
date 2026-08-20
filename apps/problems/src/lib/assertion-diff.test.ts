import { describe, expect, it } from "vitest";
import { assertionDiff, elideUnchanged, normalize } from "./assertion-diff";

const text = (spans: Array<{ text?: string } | { kind: "elided" }>) => spans.map((span) => ("text" in span ? span.text ?? "" : "")).join(" ").trim();

describe("assertionDiff", () => {
  /* The live Erdős 94 chain carries a `corrects` relation between two Claims
     whose assertions are byte-identical: the correction revised the record's
     relations, not its text. An empty diff is how the surface knows to say
     that instead of drawing a comparison of nothing. */
  it("reports no change when the assertions are identical", () => {
    expect(assertionDiff("same words here", "same words here")).toEqual([]);
  });

  it("finds an appended clause and leaves the rest alone", () => {
    const before = "Erdos94 proves the identity.";
    const after = "Erdos94 proves the identity. This does not establish the conjecture.";
    const spans = assertionDiff(before, after);
    expect(spans.filter((span) => span.kind === "removed")).toHaveLength(0);
    expect(text(spans.filter((span) => span.kind === "added")).trim())
      .toBe("This does not establish the conjecture.");
  });

  /* Reconstruction is the correctness property: dropping the removals must
     give the new text, and dropping the additions must give the old one. A
     diff that renders plausibly but does not reconstruct is a diff that
     invented an edit. */
  it("reconstructs both sides exactly", () => {
    const before = "At commit aaa, X proves P, matching commit bbb.";
    const after = "At commit ccc, X proves Q, matching commit bbb, and nothing more.";
    const spans = assertionDiff(before, after);
    expect(text(spans.filter((span) => span.kind !== "added"))).toBe(normalize(before));
    expect(text(spans.filter((span) => span.kind !== "removed"))).toBe(normalize(after));
  });

  it("diffs whole words rather than fragments inside them", () => {
    const spans = assertionDiff("the multiplicity", "the multiplicities");
    /* Not "multiplicit" + "ies": a character diff of prose reads as corruption. */
    expect(text(spans.filter((span) => span.kind === "removed")).trim()).toBe("multiplicity");
    expect(text(spans.filter((span) => span.kind === "added")).trim()).toBe("multiplicities");
  });

  it("handles a removal with no replacement", () => {
    const spans = assertionDiff("keep this drop that", "keep this that");
    expect(text(spans.filter((span) => span.kind === "removed")).trim()).toBe("drop");
  });
});

describe("elideUnchanged", () => {
  it("keeps a short unchanged run whole rather than eliding it", () => {
    const spans = assertionDiff("one two three four added", "one two three four");
    const elided = elideUnchanged(spans);
    expect(elided.some((span) => span.kind === "elided")).toBe(false);
  });

  it("elides a long unchanged run down to its edges", () => {
    const filler = Array.from({ length: 60 }, (_, index) => `w${index}`).join(" ");
    const spans = assertionDiff(`start ${filler} end`, `start ${filler} finish`);
    const elided = elideUnchanged(spans);
    const gap = elided.find((span) => span.kind === "elided");
    expect(gap).toBeDefined();
    expect((gap as { words: number }).words).toBeGreaterThan(0);
  });

  it("never elides a changed span", () => {
    const filler = Array.from({ length: 60 }, (_, index) => `w${index}`).join(" ");
    const spans = assertionDiff(`${filler} old`, `${filler} new`);
    const elided = elideUnchanged(spans);
    expect(text(elided.filter((span) => span.kind === "added")).trim()).toBe("new");
    expect(text(elided.filter((span) => span.kind === "removed")).trim()).toBe("old");
  });
});
