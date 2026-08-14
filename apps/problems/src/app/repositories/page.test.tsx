import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vitest";

/* This page said "Four exact Git checkouts" for as long as there were four, and
 * kept saying it after the four subject repositories were consolidated into one
 * authority — a header claiming four above a page listing one. Its "Explore
 * graph" button named `erdos` in the same way, and outlived that repository
 * being archived as a link a reader could not open.
 *
 * Both are the same defect: a fact about the projection written into prose,
 * where nothing re-reads it when the projection changes. So these tests assert
 * the page agrees with the repositories it was handed, at more than one
 * cardinality, rather than asserting any particular sentence. */

const repository = (slug: string, nodes: number) => ({
  slug,
  source: {
    remote: `https://github.com/vela-science/${slug}.git`,
    commit: "f".repeat(40),
    tree: "e".repeat(40),
    committed_at: "2026-08-14T00:00:00.000Z",
  },
  published_snapshot_at: "2026-08-14T00:00:00.000Z",
  status: {
    repository: { id: "123e4567-e89b-42d3-a456-426614174000", name: slug },
    counts: {
      claims: 1,
      accepted_claims: 1,
      pending_claims: 0,
      pending_review: 0,
      accepted_review: 1,
      rejected_review: 0,
      withdrawn_review: 0,
      submissions: 1,
      verifications: 1,
      artifacts: 1,
    },
    integrity: { replay: "verified", strict: "pass", blocker_count: 0 },
    actions: {
      review: null,
      work: { mode: "direct_submission", command: "vela submit --repo . --help", note: "Submit bounded evidence directly." },
    },
  },
  graph: { node_count: nodes, edge_count: 0, problem_count: 0, claim_count: 0 },
  reviews: [],
  claims: [],
  reproduce: { clone: "git clone", checkout: "git checkout", command: "vela replay" },
});

async function render(repositories: ReturnType<typeof repository>[]) {
  vi.resetModules();
  /* Spread the real module and override only the read. Listing each export by
     hand made this test a second, silently-drifting copy of the package's
     surface — exactly the duplicate-definition problem the page itself had. */
  vi.doMock("@vela/projection-data", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@vela/projection-data")>()),
    allRepositories: async () => repositories,
  }));
  const { default: Page } = await import("./page");
  return renderToStaticMarkup(await Page());
}

/* `doMock` plus `resetModules` is module-global; without this the mocked
   package leaks into whichever file vitest loads next. */
afterEach(() => {
  vi.doUnmock("@vela/projection-data");
  vi.resetModules();
});

describe("the Repositories page orients the reader from projected facts", () => {
  test("uses one concise product description instead of restating a changing count", async () => {
    const html = await render([repository("math", 12)]);
    expect(html).toContain("Exact Git repositories and their current scientific Standing.");
    expect(html).not.toContain("Four exact Git");
  });

  test("derives Repository, Standing, and integrity signals from the rows", async () => {
    const html = await render([repository("math", 4), repository("physics", 2), repository("chem", 1)]);
    expect(html).toContain("exact Git custody boundaries");
    expect(html).toContain("accepted Repository-local Claims");
    expect(html).toContain("3/3");
  });

  test("does not render direct-submission mode as zero centralized work", async () => {
    const html = await render([repository("math", 12)]);
    expect(html).toContain("Submit bounded evidence directly.");
    expect(html).toContain("direct Submission");
    expect(html).not.toContain("0 Obligations");
  });

  test("makes current Repository state the row's primary action", async () => {
    const html = await render([repository("math", 12)]);
    expect(html).toContain("Open current state");
  });
});

describe("secondary graph access stays out of the primary heading", () => {
  test("it is absent when nothing has a graph", async () => {
    const html = await render([repository("math", 0)]);
    expect(html).not.toContain("Explore graph");
  });
});
