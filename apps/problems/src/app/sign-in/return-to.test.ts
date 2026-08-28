import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { safeReturnTo } = await import("./route");

/* The widened returnTo is parse-and-rebuild, never an echo. Every rejected
 * shape collapses to /account — the same fail-closed destination the original
 * allowlist used — so a crafted link can change where a reader lands only
 * within the routes this product itself serves. */
describe("safeReturnTo", () => {
  it("keeps the original allowlist", () => {
    for (const path of ["/account", "/account/connections", "/account/profile", "/import", "/my-work", "/workspaces"]) {
      expect(safeReturnTo(path)).toBe(path);
    }
  });

  it("round-trips a Problem Workspace address", () => {
    expect(safeReturnTo("/problems/erdos-problems/94/work")).toBe("/problems/erdos-problems/94/work");
    expect(safeReturnTo("/problems/erdos-problems/94/work?workspace=ws_1")).toBe("/problems/erdos-problems/94/work?workspace=ws_1");
    expect(safeReturnTo("/problems/erdos-problems/94")).toBe("/problems/erdos-problems/94");
    expect(safeReturnTo("/problems/erdos-problems")).toBe("/problems/erdos-problems");
    expect(safeReturnTo("/problems/formal-conjectures/wikipedia-oppermann-conjecture/sources"))
      .toBe("/problems/formal-conjectures/wikipedia-oppermann-conjecture/sources");
    expect(safeReturnTo("/repositories/math/problems/321")).toBe("/repositories/math/problems/321");
    expect(safeReturnTo("/repositories/math")).toBe("/repositories/math");
  });

  it("rebuilds the query rather than echoing it", () => {
    expect(safeReturnTo("/problems/erdos-problems/94/work?evil=1&redirect=https://evil.test")).toBe("/problems/erdos-problems/94/work");
    expect(safeReturnTo("/problems/erdos-problems/94?view=poem")).toBe("/problems/erdos-problems/94");
    expect(safeReturnTo("/problems/erdos-problems/94?workspace=<script>")).toBe("/problems/erdos-problems/94");
  });

  it("refuses every open-redirect shape", () => {
    for (const hostile of [
      "https://evil.test/problems/erdos-problems/94",
      "//evil.test/problems/erdos-problems/94",
      "/\\evil.test",
      "\\/evil.test",
      "javascript:alert(1)",
      "/problems/../account/../../evil",
      "/problems/erdos-problems/94/../../../account",
      "/PROBLEMS/erdos-problems/94",
      "/problems/erdos-problems/0",
      "/problems/erdos problems/94",
      "",
      null,
    ]) {
      expect(safeReturnTo(hostile)).toBe("/account");
    }
  });
});

/* The section became a path segment, and the guard's grammar had to follow.
   These pin both halves: a real section round-trips, an invented one does not. */
describe("safeReturnTo section segments", () => {
  it("round-trips every current Problem section", () => {
    for (const section of ["overview", "work", "results", "sources", "history"]) {
      expect(safeReturnTo(`/problems/erdos-problems/94/${section}`)).toBe(`/problems/erdos-problems/94/${section}`);
    }
  });

  it("refuses a segment that is not a section", () => {
    expect(safeReturnTo("/problems/erdos-problems/94/settings")).toBe("/account");
    expect(safeReturnTo("/problems/erdos-problems/94/work/extra")).toBe("/account");
    /* Traversal that normalizes back inside the grammar is not an escape — it
       lands on a same-origin path that simply does not exist. What must never
       happen is leaving the origin, so that is what is asserted. */
    for (const hostile of [
      "/problems/erdos-problems/94/../../etc",
      "//evil.example/problems/erdos-problems/94/work",
      "https://evil.example/problems/erdos-problems/94/work",
      "/problems/erdos-problems/94/work\\@evil.example",
    ]) {
      const result = safeReturnTo(hostile);
      expect(result.startsWith("/")).toBe(true);
      expect(result.startsWith("//")).toBe(false);
      expect(new URL(result, "https://problems.science").origin).toBe("https://problems.science");
    }
  });

  it("keeps the workspace parameter across a section path", () => {
    expect(safeReturnTo("/problems/erdos-problems/94/work?workspace=w-1")).toBe("/problems/erdos-problems/94/work?workspace=w-1");
  });
});
