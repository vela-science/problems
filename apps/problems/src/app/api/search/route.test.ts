import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ search: vi.fn(), formal: vi.fn() }));
vi.mock("@vela/projection-data/read-contracts", () => ({ searchRead: mocks.search }));
vi.mock("@vela/projection-data", () => ({
  compositeSearchRoot: () => `sha256:${"c".repeat(64)}`,
  formalConjecturesCollectionRoot: `sha256:${"f".repeat(64)}`,
  formalConjecturesSearchRecords: mocks.formal,
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
  records: [{ kind: "problem", repository: "math", id: "erdos:321", assertion: "Erdős question", source_title: "Erdős Problems", standing: "open", href: "/problems/erdos-problems/321" }],
};
const formal = { kind: "problem", repository: "source:formal-conjectures", id: "formal-conjectures:Oppermann.oppermann_conjecture", assertion: "Oppermann's Conjecture", source_title: "Formal Conjectures", standing: "source_open", href: "/problems/formal-conjectures/wikipedia-oppermann-conjecture" };

describe("cross-collection search route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.search.mockResolvedValue(database);
    mocks.formal.mockReturnValue([formal]);
  });

  test("merges collection-qualified Formal Conjectures occurrences", async () => {
    const response = await GET(new NextRequest(`https://problems.science/api/search?root=${root}&search_root=${searchRoot}&q=oppermann&kind=problem`));
    const body = await response.json();
    expect(body.schema).toBe("site.composite-search-index.v1");
    expect(body.search_root).toBe(searchRoot);
    expect(response.headers.get("X-Vela-Projection-Root")).toBe(root);
    expect(response.headers.get("X-Vela-Collection-Root")).toBe(`sha256:${"f".repeat(64)}`);
    expect(response.headers.get("X-Vela-Search-Root")).toBe(searchRoot);
    expect(body.records.map(({ href }: { href: string }) => href)).toEqual([formal.href, database.records[0]!.href]);
    expect(body.total).toBe(2);
    expect(mocks.formal).toHaveBeenCalledWith("oppermann");
  });

  test("filters exactly to either published collection", async () => {
    const formalResponse = await GET(new NextRequest(`https://problems.science/api/search?root=${root}&search_root=${searchRoot}&collection=formal-conjectures&q=oppermann`));
    expect((await formalResponse.json()).records).toEqual([formal]);
    const erdosResponse = await GET(new NextRequest(`https://problems.science/api/search?root=${root}&search_root=${searchRoot}&collection=erdos-problems&q=321`));
    expect((await erdosResponse.json()).records).toEqual(database.records);
    expect(mocks.search).toHaveBeenLastCalledWith(expect.objectContaining({ kind: "problem" }));
  });

  test("does not relabel Formal Conjectures as a Repository result", async () => {
    const response = await GET(new NextRequest(`https://problems.science/api/search?root=${root}&search_root=${searchRoot}&repository=math&q=oppermann`));
    expect((await response.json()).records).toEqual(database.records);
    expect(mocks.formal).not.toHaveBeenCalled();
  });

  test("pages the supplemental collection before continuing the database cursor", async () => {
    const secondFormal = { ...formal, id: `${formal.id}.part`, href: `${formal.href}-part` };
    mocks.formal.mockReturnValue([formal, secondFormal]);
    mocks.search.mockResolvedValue({ ...database, total: 42, next_cursor: "math:problem:erdos:321" });

    const first = await GET(new NextRequest(`https://problems.science/api/search?root=${root}&search_root=${searchRoot}&limit=1`));
    const firstBody = await first.json();
    expect(firstBody.records).toEqual([formal]);
    expect(firstBody.total).toBe(44);
    expect(firstBody.next_cursor).toBe("fc:1");

    const second = await GET(new NextRequest(`https://problems.science/api/search?root=${root}&search_root=${searchRoot}&limit=2&cursor=fc:1`));
    const secondBody = await second.json();
    expect(secondBody.records.map(({ href }: { href: string }) => href)).toEqual([secondFormal.href, database.records[0]!.href]);
    expect(secondBody.next_cursor).toBe("math:problem:erdos:321");
  });

  test("does not leak non-Problem records through a collection filter", async () => {
    mocks.search.mockResolvedValue({ ...database, records: [{ ...database.records[0], kind: "claim", href: "/repositories/math/claims/vcl_1" }] });
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
