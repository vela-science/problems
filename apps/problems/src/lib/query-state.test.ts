import { describe, expect, test } from "vitest";
import { pageFromSearchParams, queryChoice, queryHref, queryPage, updateQuery } from "./query-state";

describe("shareable workflow query state", () => {
  test("accepts only closed filter values", () => {
    expect(queryChoice(new URLSearchParams("standing=pending_review"), "standing", ["all", "pending_review"] as const, "all")).toBe("pending_review");
    expect(queryChoice(new URLSearchParams("standing=unknown"), "standing", ["all", "pending_review"] as const, "all")).toBe("all");
  });

  test("normalizes page numbers", () => {
    expect(queryPage(new URLSearchParams("page=3"))).toBe(3);
    expect(queryPage(new URLSearchParams("page=0"))).toBe(1);
    expect(queryPage(new URLSearchParams("page=wat"))).toBe(1);
  });

  test("reads the same page number out of a server component's plain record", () => {
    for (const raw of ["3", "1", "0", "-3", "wat", "", "9007199254740993"]) {
      expect(pageFromSearchParams({ page: raw })).toBe(queryPage(new URLSearchParams({ page: raw })));
    }
    expect(pageFromSearchParams({})).toBe(1);
    /* Next hands a repeated key back as an array; there is no one page to read. */
    expect(pageFromSearchParams({ page: ["2", "5"] })).toBe(1);
  });

  test("preserves unrelated state while removing defaults", () => {
    const params = new URLSearchParams("repository=erdos&standing=pending_review&page=2");
    expect(updateQuery(params, { standing: null, page: 1, proposal: "vpr_exact" })).toBe("repository=erdos&page=1&proposal=vpr_exact");
    expect(queryHref("/proposals", params, { page: null })).toBe("/proposals?repository=erdos&standing=pending_review");
  });
});
