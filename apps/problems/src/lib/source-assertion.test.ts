import { describe, expect, test } from "vitest";
import { parseSourceAssertion } from "./source-assertion";

describe("parseSourceAssertion", () => {
  test("recovers the four fields the Erdős adapter flattens into a sentence", () => {
    const parsed = parseSourceAssertion(
      "declared status 'proved'. Formalized: no. Prize: no. Tags: analysis.",
    );
    expect(parsed.fields).toEqual([
      { label: "status", value: "proved", kind: "status", affirmative: true },
      { label: "formalized", value: "not formalized", kind: "flag", affirmative: false },
      { label: "prize", value: "not prize", kind: "flag", affirmative: false },
      { label: "tag", value: "analysis", kind: "tag", affirmative: true },
    ]);
    expect(parsed.rest).toBe("");
  });

  test("splits a multi-tag list and keeps affirmative flags affirmative", () => {
    const parsed = parseSourceAssertion(
      "declared status 'open'. Formalized: yes. Prize: no. Tags: covering systems, number theory.",
    );
    expect(parsed.fields.filter((field) => field.kind === "tag").map((field) => field.value))
      .toEqual(["covering systems", "number theory"]);
    expect(parsed.fields.find((field) => field.label === "formalized")?.affirmative).toBe(true);
  });

  test("leaves a real mathematical assertion completely alone", () => {
    /* The guard that matters: an assertion carrying mathematics must never be
       shredded into chips, because the prose IS the record. */
    const assertion =
      "The pinned 307-tile chordal certificate family cannot cover Z^2, established by an exact affine-lattice verifier over the retained certificate bytes.";
    const parsed = parseSourceAssertion(assertion);
    expect(parsed.fields).toEqual([]);
    expect(parsed.rest).toBe(assertion);
  });

  test("declines a partial match that still carries prose", () => {
    const assertion =
      "declared status 'proved'. The construction extends to every odd modulus by a CRT witness that the verifier recomputes independently.";
    expect(parseSourceAssertion(assertion).fields).toEqual([]);
  });

  test("returns the input unchanged when nothing matches", () => {
    expect(parseSourceAssertion("")).toEqual({ fields: [], rest: "" });
  });

  test("keepProse recovers the fields and hands back the mathematics", () => {
    /* Erdős #404, the shape the default guard refuses: the flattened metadata
       and the problem statement in one string. Both are wanted on a row. */
    const assertion =
      "declared status 'open'. Formalized: no. Let $h_t(d)$ be minimal such that every graph $G$ with $h_t(d)$ edges and maximal degree $\\leq d$ contains two edges whose shortest path has length $\\geq t$.";
    const parsed = parseSourceAssertion(assertion, { keepProse: true });
    expect(parsed.fields.map((field) => field.value)).toEqual(["open", "not formalized"]);
    expect(parsed.rest).toBe(
      "Let $h_t(d)$ be minimal such that every graph $G$ with $h_t(d)$ edges and maximal degree $\\leq d$ contains two edges whose shortest path has length $\\geq t$.",
    );
    expect(assertion).toContain(parsed.rest);
  });

  test("keepProse leaves a pure-metadata row exactly where the default leaves it", () => {
    const assertion = "declared status 'proved'. Formalized: no. Prize: no. Tags: analysis.";
    expect(parseSourceAssertion(assertion, { keepProse: true }))
      .toEqual(parseSourceAssertion(assertion));
  });

  test("keepProse still declines text that carries none of the fields", () => {
    const assertion = "The pinned 307-tile chordal certificate family cannot cover Z^2.";
    expect(parseSourceAssertion(assertion, { keepProse: true }))
      .toEqual({ fields: [], rest: assertion });
  });
});
