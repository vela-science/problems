import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { problemCollectionForPath } from "./problem-collections";
import { publishedProblemCollections } from "./published-problem-collections";

describe("published Problem collections", () => {
  it("publishes only an explicit profile with a canonical namespace", () => {
    expect(publishedProblemCollections).toEqual([
      { namespace: "erdos-problems", name: "Erdős Problems" },
    ]);
  });

  it("recovers collection identity from canonical result routes", () => {
    expect(problemCollectionForPath("/problems/erdos-problems/321", publishedProblemCollections))
      .toEqual({ namespace: "erdos-problems", name: "Erdős Problems", problem: "321" });
    expect(problemCollectionForPath("/repositories/math/problems/321", publishedProblemCollections)).toBeNull();
  });
});
