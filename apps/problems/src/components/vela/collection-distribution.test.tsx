import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CollectionDistribution, collectionDistribution } from "./collection-distribution";

const problem = (declaredStatus: string, formalized = false, localStanding: string | null = null) => ({
  problem: declaredStatus,
  repository: "math",
  record: { declared_status: declaredStatus, formalized, local_standing: localStanding },
}) as never;

describe("CollectionDistribution", () => {
  it("keeps source status, formalization, and reviewed evidence as distinct axes", () => {
    const distribution = collectionDistribution([
      problem("open", true, "accepted"),
      problem("solved"),
      problem("source-specific"),
      problem("unknown"),
    ]);
    expect(distribution.segments.map(({ label, count }) => [label, count])).toEqual([
      ["Open per source", 1],
      ["Resolved per source", 1],
      ["Other source status", 1],
      ["Not stated by source", 1],
    ]);
    expect(distribution.formalized).toBe(1);
    expect(distribution.reviewed).toBe(1);
  });

  it("explains the corpus without presenting overlapping coverage as a single status", () => {
    render(<CollectionDistribution problems={[problem("open", true, "accepted"), problem("solved")]} />);
    expect(screen.getByText("Source status reports what the collection declares. Formalization and reviewed evidence are separate, overlapping signals.")).toBeInTheDocument();
    expect(screen.getByText("Exact formal statement available")).toBeInTheDocument();
    expect(screen.getByText("With Repository-reviewed evidence")).toBeInTheDocument();
    expect(screen.queryByText(/locally assessed/i)).not.toBeInTheDocument();
  });
});
