import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { problemCollectionForPath } from "./problem-collections";
import { publishedProblemCollections } from "./published-problem-collections";

describe("published Problem collections", () => {
  it("publishes only an explicit profile with a canonical namespace", () => {
    expect(publishedProblemCollections.map(({ namespace, name, identifierKind }) => ({ namespace, name, identifierKind }))).toEqual([
      { namespace: "erdos-problems", name: "Erdős Problems", identifierKind: "number" },
      { namespace: "formal-conjectures", name: "Formal Conjectures", identifierKind: "slug" },
    ]);
  });

  it("recovers collection identity from canonical result routes", () => {
    expect(problemCollectionForPath("/problems/erdos-problems/321", publishedProblemCollections))
      .toMatchObject({ namespace: "erdos-problems", name: "Erdős Problems", problem: "321" });
    expect(problemCollectionForPath("/problems/formal-conjectures/wikipedia-oppermann-conjecture", publishedProblemCollections))
      .toMatchObject({ namespace: "formal-conjectures", name: "Formal Conjectures", problem: "wikipedia-oppermann-conjecture" });
    expect(problemCollectionForPath("/problems/erdos-problems/not-a-number", publishedProblemCollections)).toBeNull();
    expect(problemCollectionForPath("/repositories/math/problems/321", publishedProblemCollections)).toBeNull();
  });
});
