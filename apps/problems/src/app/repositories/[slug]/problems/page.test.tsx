import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

/* The page's composition is a function of what the projection retains, and the
 * three cardinalities it has to answer for are a repository with no problems, a
 * single match, and the whole 1,217-row corpus. Each control is asserted by the
 * thing a reader uses it for, not by its markup. */

const statement = "If $A\\subseteq \\{1,\\ldots,N\\}$ then $N \\gg 2^{n}$.";

const problem = (number: number) => ({
  problem: String(number),
  node_id: `erdos:${number}`,
  claim_id: `vcl_${number}`,
  statement,
  declared_status: "open",
  formalized: true,
  lean_url: "https://github.com/google-deepmind/formal-conjectures/blob/main/FormalConjectures/ErdosProblems/1.lean",
  prize: "$500",
  tags: ["number theory"],
  oeis: ["A276661"],
  source_ids: ["source:erdos-problems"],
  source_count: 1,
});

const status = [
  { value: "open", count: 622, parts: [{ label: "formalized", count: 299 }, { label: "not formalized", count: 323 }] },
  { value: "proved", count: 324, parts: [{ label: "formalized", count: 66 }, { label: "not formalized", count: 258 }] },
];

let repository: unknown = null;
let ledger: unknown = null;

vi.mock("@vela/projection-data", () => ({
  repositoryBySlug: async () => repository,
}));
/* Server-only. The ledger read moved behind a release-root cache — the query
   aggregates the whole retained corpus and took 4.6s on every request. */
vi.mock("@/lib/scientific-state", () => ({
  repositoryProblems: async () => ledger,
}));

const { default: ProblemsPage } = await import("./page");

const render = async (query: Record<string, string> = {}) =>
  renderToStaticMarkup(
    await ProblemsPage({
      params: Promise.resolve({ slug: "erdos" }),
      searchParams: Promise.resolve(query),
    } as never),
  );

const empty = { status: [], formalization: [], tag: [], source: [] };

describe("problem ledger composition", () => {
  /* The page used to short-circuit on `graph.problem_count` and print "No
     problems recorded" before running the query at all. That counter counts
     problem-kind graph nodes, which exist only where a Claim does, so a
     repository holding a thousand open questions and no accepted assertion
     rendered as empty. The ledger is now the only thing that decides, and its
     own zero is the one this asserts. */
  test("a repository with no problems says so from the ledger, not from the graph", async () => {
    repository = {
      slug: "quantum-codes",
      status: { repository: { name: "Quantum codes" } },
      /* Nine graph nodes and no problem node. The page must reach the ledger
         past this rather than reading a verdict off it. */
      graph: { node_count: 9, problem_count: 0 },
    };
    ledger = { items: [], total: 0, facets: empty };
    const html = await render();

    expect(html).toContain("Problem ledger");
    expect(html).toContain("0 problems");
    /* Retaining none and matching none are different facts, and only the first
       is true here. */
    expect(html).toContain("retains no source-native problem");
    expect(html).not.toContain("matches this filter");
    /* Nothing to search, narrow, sort or page through. */
    expect(html).not.toContain('name="q"');
    expect(html).not.toContain("Narrow the ledger");
    expect(html).not.toContain("Problem pages");
  });

  test("a single match carries no control that would narrow it further", async () => {
    repository = {
      slug: "erdos",
      status: { repository: { name: "Erdős" } },
      graph: { node_count: 4063, problem_count: 1217 },
    };
    ledger = {
      items: [problem(1056)],
      total: 1,
      facets: { status: [{ value: "open", count: 1 }], formalization: [{ value: "formalized", count: 1 }], tag: [{ value: "number theory", count: 1 }], source: [{ value: "source:erdos-problems", count: 1 }] },
    };
    const html = await render({ q: "1056" });

    expect(html).toContain("erdos:1056");
    expect(html).toContain("1 problem<");
    expect(html).not.toContain("Narrow the ledger");
    expect(html).not.toContain(">Sources<");
    expect(html).not.toContain("Problem pages");
  });

  test("the whole corpus carries the rail, the figure, the sort, and the pages", async () => {
    repository = {
      slug: "erdos",
      status: { repository: { name: "Erdős" } },
      graph: { node_count: 4063, problem_count: 1217 },
    };
    ledger = {
      items: Array.from({ length: 50 }, (_, index) => problem(index + 1)),
      total: 1217,
      facets: {
        status,
        formalization: [{ value: "not formalized", count: 781 }, { value: "formalized", count: 436 }],
        tag: [{ value: "number theory", count: 576 }, { value: "graph theory", count: 275 }],
        source: [{ value: "source:erdos-problems", count: 1217 }, { value: "source:gpt-erdos", count: 57 }],
      },
    };
    const html = await render();

    expect(html).toContain("Narrow the ledger");
    expect(html).toContain("1,217 problems · 1/25");
    expect(html).toContain(">Sources<");
    expect(html).toContain("Problem pages");
    /* The figure is the status group: every number it draws is printed beside
       the bar, and the bar itself is not part of the accessible name. */
    expect(html).toContain("299 / 622");
    expect(html).toContain('aria-label="open, 299 of 622 formalized"');
    /* Source-native problems, not Claims — every sibling surface reports 0
       Claims, and this facet note called the same 1,217 rows claims. */
    expect(html).toContain("These 1,217 are source-native problems, not Claims");
    /* The source's word for a problem's state is never a Vela standing. */
    expect(html).toContain("declared open");
  });

  test("a page link carries the narrowing already in the URL", async () => {
    const html = await render({ sort: "sources", page: "2" });

    expect(html).toContain('href="/repositories/erdos/problems?sort=sources&amp;page=1"');
    expect(html).toContain('href="/repositories/erdos/problems?sort=sources&amp;page=3"');
  });

  /* Most Problems retain no statement, and the row is one stretched link whose
     only content is that statement — so the row rendered visually blank and a
     screen reader announced the URL. Forty-six of fifty rows shipped that way.
     The number is the fallback, never the replacement. */
  test("a Problem with no retained statement still names its row", async () => {
    repository = {
      slug: "erdos",
      status: { repository: { name: "Erdős" } },
      graph: { node_count: 4063, problem_count: 1217 },
    };
    ledger = {
      items: [{ ...problem(1056), statement: "" }, problem(1057)],
      total: 2,
      facets: empty,
    };
    const html = await render();

    expect(html).toContain(">Problem 1056<");
    /* The row that does retain one is unaffected. */
    expect(html).toContain("\\subseteq");
    expect(html).not.toContain(">Problem 1057<");
    /* No link is left with nothing inside it. */
    expect(html).not.toMatch(/<a[^>]*after:absolute[^>]*>(?:<span[^>]*>)?\s*(?:<\/span>)?<\/a>/u);
  });
});
