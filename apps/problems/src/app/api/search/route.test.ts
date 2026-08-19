import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ search: vi.fn(), formal: vi.fn(), problems: vi.fn() }));
vi.mock("@vela/projection-data/read-contracts", () => ({ searchRead: mocks.search }));
vi.mock("@vela/projection-data", () => ({
  compositeSearchRoot: () => `sha256:${"c".repeat(64)}`,
  canonicalProblemPath: (_repository: string, problem: string) => `/problems/erdos-problems/${problem}`,
  formalConjecturesCollectionRoot: `sha256:${"f".repeat(64)}`,
  formalConjecturesSearchRecords: mocks.formal,
  problemsForRepository: mocks.problems,
  repositoryForCanonicalProblemNamespace: () => "math",
}));

import { GET } from "./route";

const root = `sha256:${"a".repeat(64)}`;
const searchRoot = `sha256:${"c".repeat(64)}`;
const database = {
  schema: "site.search-index.v1",
  generated_at: "2026-08-18T00:00:00Z",
  bundle_root: root,
  total: 1,
  next_cursor: null,
  records: [{ kind: "claim", repository: "math", id: "vcl_1", assertion: "A reviewed Result", source_title: null, standing: "accepted", href: "/repositories/math/claims/vcl_1" }],
};
const erdos = { problem: "321", label: "Erdős problem 321", statement: "Erdős question", declared_status: "solved", local_standing: null };
const formal = { kind: "problem", repository: "source:formal-conjectures", id: "formal-conjectures:Oppermann.oppermann_conjecture", assertion: "Oppermann's Conjecture", source_title: "Formal Conjectures", standing: "source_open", source_status: "open", result_standing: null, href: "/problems/formal-conjectures/wikipedia-oppermann-conjecture" };

describe("cross-collection search route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.search.mockResolvedValue(database);
    mocks.formal.mockReturnValue([formal]);
    mocks.problems.mockResolvedValue({ items: [erdos], total: 1, facets: { status: [], formalization: [], tag: [], source: [] } });
  });

  test("merges collection-qualified Formal Conjectures occurrences", async () => {
    const response = await GET(new NextRequest(`https://problems.science/api/search?root=${root}&search_root=${searchRoot}&q=oppermann&kind=problem`));
    const body = await response.json();
    expect(body.schema).toBe("site.composite-search-index.v1");
    expect(body.search_root).toBe(searchRoot);
    expect(response.headers.get("X-Vela-Projection-Root")).toBe(root);
    expect(response.headers.get("X-Vela-Collection-Root")).toBe(`sha256:${"f".repeat(64)}`);
    expect(response.headers.get("X-Vela-Search-Root")).toBe(searchRoot);
    expect(body.records.map(({ href }: { href: string }) => href)).toEqual([formal.href, "/problems/erdos-problems/321"]);
    expect(body.total).toBe(2);
    expect(mocks.formal).toHaveBeenCalledWith("oppermann");
  });

  test("filters exactly to either published collection", async () => {
    const formalResponse = await GET(new NextRequest(`https://problems.science/api/search?root=${root}&search_root=${searchRoot}&collection=formal-conjectures&q=oppermann`));
    expect((await formalResponse.json()).records).toEqual([formal]);
    const erdosResponse = await GET(new NextRequest(`https://problems.science/api/search?root=${root}&search_root=${searchRoot}&collection=erdos-problems&q=321`));
    expect((await erdosResponse.json()).records).toEqual([expect.objectContaining({ kind: "problem", id: "erdos-problems:321", source_status: "solved", result_standing: null, href: "/problems/erdos-problems/321" })]);
    expect(mocks.problems).toHaveBeenLastCalledWith("math", expect.objectContaining({ q: "321", includeFacets: false }));
  });

  test("does not relabel Formal Conjectures as a Repository result", async () => {
    const response = await GET(new NextRequest(`https://problems.science/api/search?root=${root}&search_root=${searchRoot}&repository=math&q=oppermann`));
    expect((await response.json()).records).toEqual([expect.objectContaining({ id: "erdos-problems:321" }), ...database.records]);
    expect(mocks.formal).not.toHaveBeenCalled();
  });

  test("refuses a false cross-index cursor when Problems are present", async () => {
    const secondFormal = { ...formal, id: `${formal.id}.part`, href: `${formal.href}-part` };
    mocks.formal.mockReturnValue([formal, secondFormal]);
    mocks.search.mockResolvedValue({ ...database, total: 42, next_cursor: "math:problem:erdos:321" });

    const first = await GET(new NextRequest(`https://problems.science/api/search?root=${root}&search_root=${searchRoot}&limit=1`));
    const firstBody = await first.json();
    expect(firstBody.records).toEqual([formal]);
    expect(firstBody.total).toBe(45);
    expect(firstBody.next_cursor).toBeNull();

    const replay = await GET(new NextRequest(`https://problems.science/api/search?root=${root}&search_root=${searchRoot}&limit=1&cursor=bogus`));
    expect(replay.status).toBe(400);
    expect(await replay.json()).toEqual(expect.objectContaining({ code: "invalid_cursor" }));
  });

  test("does not leak non-Problem records through a collection filter", async () => {
    const response = await GET(new NextRequest(`https://problems.science/api/search?root=${root}&search_root=${searchRoot}&collection=erdos-problems&kind=claim`));
    const body = await response.json();
    expect(body.records).toEqual([]);
    expect(body.total).toBe(0);
  });

  test("refuses a cache identity that omits the supplemental root", async () => {
    const response = await GET(new NextRequest(`https://problems.science/api/search?root=${root}&search_root=${root}&q=oppermann`));
    expect(response.status).toBe(409);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
