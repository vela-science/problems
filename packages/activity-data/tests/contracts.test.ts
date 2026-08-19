import { describe, expect, test } from "bun:test";
import {
  assessAnchorFreshness,
  commandRequestRoot,
  followsCurrentAnchor,
  normalizePublicProfileHandle,
  normalizePublicProfileInput,
  scientificAnchorRoot,
  type ScientificAnchor,
} from "../src/contracts";

const root = (hex: string) => `sha256:${hex.repeat(64).slice(0, 64)}` as const;

const anchor: ScientificAnchor = {
  projectionReleaseRoot: root("1"),
  repositoryId: "erdos-problems",
  repositoryRoot: root("2"),
  sourceCommit: "3".repeat(40),
  sourceTree: "4".repeat(40),
  problemId: "erdos-264",
  problemRecordRoot: root("5"),
  sourceObservationRoot: root("6"),
  claimId: `vcl_${"7".repeat(64)}`,
  claimRoot: root("8"),
  claimStanding: "verified",
};

describe("scientific activity anchors", () => {
  test("root every exact projection and repository field", () => {
    expect(scientificAnchorRoot(anchor)).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(scientificAnchorRoot({ ...anchor, sourceTree: "9".repeat(40) }))
      .not.toBe(scientificAnchorRoot(anchor));
  });

  test("derives following only from the exact current anchor", () => {
    const historical = root("a");
    const current = root("b");
    expect(followsCurrentAnchor([historical], current)).toBe(false);
    expect(followsCurrentAnchor([historical, current], current)).toBe(true);
  });

  test("classify canonical advances without rewriting the stored anchor", () => {
    expect(assessAnchorFreshness(anchor, anchor)).toEqual({ state: "current" });
    expect(assessAnchorFreshness(anchor, { ...anchor, repositoryRoot: root("a") }))
      .toEqual({ state: "repository_advanced", fields: ["repositoryRoot"] });
    expect(assessAnchorFreshness(anchor, { ...anchor, problemRecordRoot: root("b") }))
      .toEqual({ state: "problem_changed", fields: ["problemRecordRoot"] });
    expect(assessAnchorFreshness(anchor, { ...anchor, claimStanding: "accepted" }))
      .toEqual({ state: "claim_changed", fields: ["claimStanding"] });
    expect(assessAnchorFreshness(anchor, null)).toEqual({
      state: "unavailable",
      fields: ["current_anchor"],
    });
  });
});

describe("public profile input", () => {
  test("normalizes a safe private-by-choice profile and declared links", () => {
    expect(normalizePublicProfileInput({
      handle: "  Ada-Lovelace  ",
      displayName: " Ada Lovelace ",
      bio: " Works on exact scientific computation. ",
      affiliation: " Analytical Engine Institute ",
      visibility: "unlisted",
      links: {
        github: "https://github.com/ada-lovelace",
        orcid: "https://orcid.org/0000-0002-1825-0097",
      },
    })).toEqual({
      handle: "ada-lovelace",
      displayName: "Ada Lovelace",
      bio: "Works on exact scientific computation.",
      affiliation: "Analytical Engine Institute",
      visibility: "unlisted",
      links: {
        github: "https://github.com/ada-lovelace",
        orcid: "https://orcid.org/0000-0002-1825-0097",
      },
    });
  });

  test("refuses reserved, ambiguous, and unsafe identity presentation", () => {
    for (const handle of ["admin", "vela", "a", "-person", "person--", "p-retained-performer"]) {
      expect(() => normalizePublicProfileHandle(handle)).toThrow();
    }
    expect(() => normalizePublicProfileInput({
      handle: "safe-person",
      displayName: "Safe Person",
      bio: "",
      affiliation: "",
      visibility: "public",
      links: { website: "javascript:alert(1)" },
    })).toThrow(/HTTPS/u);
    expect(() => normalizePublicProfileInput({
      handle: "safe-person",
      displayName: "Safe Person",
      bio: "",
      affiliation: "",
      visibility: "public",
      links: { github: "https://github.com/org/repository" },
    })).toThrow(/one github.com account/u);
  });
});

describe("Problem-scoped Approach command identity", () => {
  test("roots the exact Problem anchor and contribution fields", () => {
    const input = {
      anchor: { root: root("a") },
      title: "Finite reduction",
      summary: "Test a bounded obstruction.",
    };
    const inputRoot = commandRequestRoot("approach.create", input);
    expect(commandRequestRoot("approach.create", { ...input, anchor: { root: root("b") } }))
      .not.toBe(inputRoot);
    expect(commandRequestRoot("approach.create", { ...input, title: "Different reduction" }))
      .not.toBe(inputRoot);
    expect(commandRequestRoot("approach.create", { ...input, summary: "Different scope." }))
      .not.toBe(inputRoot);
  });
});
