import { describe, expect, it } from "vitest";
import { collectionCoverage } from "./collection-coverage-bar";

describe("collectionCoverage", () => {
  it("partitions the catalogue exactly, so the bar cannot overstate coverage", () => {
    const coverage = collectionCoverage([
      { record: { formalized: true, local_standing: "accepted" } },
      { record: { formalized: true, local_standing: null } },
      { record: { formalized: true, local_standing: null } },
      { record: { formalized: false, local_standing: null } },
      { record: {} },
    ]);
    expect(coverage).toEqual({ total: 5, decided: 1, formalOnly: 2, identityOnly: 2 });
    expect(coverage.decided + coverage.formalOnly + coverage.identityOnly).toBe(coverage.total);
  });

  /* A Decision is the stronger fact, so a Problem that has one is counted
     there and not also among the formal statements. */
  it("counts a decided Problem once", () => {
    const coverage = collectionCoverage([{ record: { formalized: true, local_standing: "accepted" } }]);
    expect(coverage).toEqual({ total: 1, decided: 1, formalOnly: 0, identityOnly: 0 });
  });
});
