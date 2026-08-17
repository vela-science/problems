import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { safeReturnTo } = await import("./route");

/* The widened returnTo is parse-and-rebuild, never an echo. Every rejected
 * shape collapses to /account — the same fail-closed destination the original
 * allowlist used — so a crafted link can change where a reader lands only
 * within the routes this product itself serves. */
describe("safeReturnTo", () => {
  it("keeps the original allowlist", () => {
    for (const path of ["/account", "/account/connections", "/import", "/my-work"]) {
      expect(safeReturnTo(path)).toBe(path);
    }
  });

  it("round-trips a Problem Workspace address", () => {
    expect(safeReturnTo("/problems/erdos-problems/94?view=work")).toBe("/problems/erdos-problems/94?view=work");
    expect(safeReturnTo("/problems/erdos-problems/94?view=work&workspace=ws_1")).toBe("/problems/erdos-problems/94?view=work&workspace=ws_1");
    expect(safeReturnTo("/problems/erdos-problems/94")).toBe("/problems/erdos-problems/94");
    expect(safeReturnTo("/repositories/math/problems/321")).toBe("/repositories/math/problems/321");
    expect(safeReturnTo("/repositories/math")).toBe("/repositories/math");
  });

  it("rebuilds the query rather than echoing it", () => {
    expect(safeReturnTo("/problems/erdos-problems/94?view=work&evil=1&redirect=https://evil.test")).toBe("/problems/erdos-problems/94?view=work");
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
