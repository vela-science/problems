import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { normalizeRequestedCommit } from "./codebase-inspection";

const sha = "9e1f0c2b7d4a63581fbe2cd07a9145836be0d2f1";

/* Every one of these used to end in `error=unavailable` — "The pinned revision
   could not be inspected" — which is also what a deleted repository and an
   unreachable GitHub produce. The only cause the reader could act on was the
   one they could not tell apart. */
describe("normalizeRequestedCommit", () => {
  it("treats an absent commit as the default branch head, not as an error", () => {
    for (const value of [undefined, null, "", "   "]) {
      expect(normalizeRequestedCommit(value)).toEqual({});
    }
  });

  it("accepts the canonical spelling unchanged", () => {
    expect(normalizeRequestedCommit(sha)).toEqual({ commit: sha });
    expect(normalizeRequestedCommit(`  ${sha}  `)).toEqual({ commit: sha });
  });

  /* A Git object name is case-insensitive hex; lowercase is only its canonical
     spelling. An uppercase digest named the same revision and was turned away. */
  it("folds an uppercase digest down rather than refusing the revision it names", () => {
    expect(normalizeRequestedCommit(sha.toUpperCase())).toEqual({ commit: sha });
    expect(normalizeRequestedCommit("9E1F0c2B7d4A63581fbe2cd07a9145836be0d2f1")).toEqual({ commit: sha });
  });

  it("rejects anything that is not a full 40-character SHA", () => {
    for (const value of [
      sha.slice(0, 7),                       // the abbreviation people paste
      sha.slice(0, 39),
      `${sha}a`,
      sha.replace("9", "g"),                 // not hex
      "HEAD",
      "refs/heads/main",
      `${sha} ${sha}`,
    ]) {
      expect(normalizeRequestedCommit(value)).toBeNull();
    }
  });

  /* A repeated `?commit=` arrives as an array. Pinning the default branch head
     for it would answer a question the caller did not ask. */
  it("rejects a shape that names no revision instead of quietly defaulting", () => {
    expect(normalizeRequestedCommit([sha, sha])).toBeNull();
    expect(normalizeRequestedCommit(new File([], "commit"))).toBeNull();
    expect(normalizeRequestedCommit({ toString: () => sha })).toBeNull();
  });
});
