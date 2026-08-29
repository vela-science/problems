import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ reviewed: vi.fn(), view: vi.fn(), notFound: vi.fn(), state: vi.fn() }));

vi.mock("@vela/projection-data", () => ({
  canonicalProblemPath: (repository: string, problem: string) => (
    repository === "math" && /^[1-9][0-9]*$/u.test(problem) ? `/problems/erdos-problems/${problem}` : null
  ),
  repositoryForCanonicalProblemNamespace: (namespace: string) => (
    namespace === "erdos-problems" ? "math" : undefined
  ),
  problemPublicRouteForCanonicalPath: mocks.reviewed,
  problemResolutionConfig: { entities: [{
    entity_id: "problem:erdos:321",
    canonical_occurrence: { source_id: "source:erdos-problems", native_id: "erdos:321", native_kind: "problem", content_root: "sha256:source" },
  }] },
  formalConjectureOccurrence: (slug: string) => slug === "wikipedia-oppermann-conjecture" ? {
    route_slug: slug,
    title: "Oppermann's Conjecture",
  } : null,
}));
/* `generateMetadata` asks the projection whether the release retains the
   Problem, because the address alone cannot say. Server-only in the real
   module, so it is mocked here like the other reads. */
vi.mock("@/lib/scientific-state", () => ({ scientificProblemState: mocks.state }));
vi.mock("@/components/vela/problem-page", () => ({
  ProblemPageView: (props: Record<string, unknown>) => { mocks.view(props); return <div>Problem</div>; },
}));
vi.mock("@/components/vela/formal-conjecture-page", () => ({
  FormalConjecturePage: ({ item, current }: { item: { title: string }; current: string }) => <div>{item.title} · {current}</div>,
}));
vi.mock("@/lib/published-problem-collections", () => ({
  publishedProblemCollections: [{ namespace: "erdos-problems", name: "Erdős Problems" }, { namespace: "formal-conjectures", name: "Formal Conjectures", identifierKind: "slug" }],
}));
vi.mock("next/navigation", () => ({ notFound: () => { mocks.notFound(); throw new Error("NOT_FOUND"); } }));

import ProblemPage, { generateMetadata } from "./page";

const open = (namespace: string, problem: string, query: Record<string, string> = {}) =>
  ProblemPage({ params: Promise.resolve({ namespace, problem }), searchParams: Promise.resolve(query as never) });

describe("the canonical Problem address", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.state.mockResolvedValue({ problem: "94" }); });

  /* A 404 that names a Problem is the product inventing a record.
     `/problems/erdos-problems/888888` served a correct 404 whose tab, history
     entry and bookmark all read "Erdős problem 888888", because the address
     resolves on pattern alone. Metadata now asks what the release retains. */
  it("does not title a Problem the release does not retain", async () => {
    mocks.state.mockResolvedValue(null);
    const metadata = await generateMetadata({ params: Promise.resolve({ namespace: "erdos-problems", problem: "888888" }) } as never);
    expect(metadata.title).toBe("Not found");
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates).toBeUndefined();
  });

  it("titles a Problem the release does retain", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ namespace: "erdos-problems", problem: "94" }) } as never);
    expect(metadata.title).toBe("Erdős problem 94");
    expect(metadata.alternates).toEqual({ canonical: "/problems/erdos-problems/94" });
  });

  /* A refusal is the page's to surface through its error boundary; metadata
     must not turn one into a claim that nothing is published here. */
  it("does not report a projection refusal as an absent Problem", async () => {
    mocks.state.mockRejectedValue(new Error("projection unavailable"));
    const metadata = await generateMetadata({ params: Promise.resolve({ namespace: "erdos-problems", problem: "94" }) } as never);
    expect(metadata.title).toBeUndefined();
    expect(metadata.robots).toBeUndefined();
  });

  /* A reviewed Problem keeps the stronger guarantee: the record on screen is
     checked against the exact occurrence a reviewer pinned. */
  it("hands a reviewed Problem the occurrence its entity declares", async () => {
    mocks.reviewed.mockReturnValue({ entity_id: "problem:erdos:321" });
    render(await open("erdos-problems", "321", { mode: "work" }));
    expect(screen.getByText("Problem")).toBeInTheDocument();
    expect(mocks.view).toHaveBeenCalledWith(expect.objectContaining({
      repository: "math",
      problem: "321",
      collectionName: "Erdős Problems",
      route: "/problems/erdos-problems/321",
      expectedSource: { sourceId: "source:erdos-problems", nativeId: "erdos:321", nativeKind: "problem", contentRoot: "sha256:source" },
    }));
  });

  /* And the 1,211 that were never reviewed into an entity resolve too. They
     had no canonical address at all before, which is why the Repository-shaped
     path could not retire. Identity without review means no expectedSource:
     there is no pinned root to check against, and inventing one would assert a
     review nobody performed. */
  it("resolves a Problem with no reviewed entity, and pins nothing", async () => {
    mocks.reviewed.mockReturnValue(null);
    render(await open("erdos-problems", "999"));
    expect(mocks.view).toHaveBeenCalledWith(expect.objectContaining({
      repository: "math",
      problem: "999",
      route: "/problems/erdos-problems/999",
      expectedSource: undefined,
    }));
  });

  it("refuses a malformed or unknown address", async () => {
    await expect(open("Erdos", "321")).rejects.toThrow("NOT_FOUND");
    await expect(open("not-a-namespace", "321")).rejects.toThrow("NOT_FOUND");
    await expect(open("erdos-problems", "0")).rejects.toThrow("NOT_FOUND");
  });

  it("declares its own canonical address", async () => {
    mocks.reviewed.mockReturnValue(null);
    expect(await generateMetadata({ params: Promise.resolve({ namespace: "erdos-problems", problem: "999" }), searchParams: Promise.resolve({}) }))
      .toMatchObject({ title: "Erdős problem 999", alternates: { canonical: "/problems/erdos-problems/999" } });
  });

  it("resolves an exact Formal Conjectures occurrence without inventing Repository state", async () => {
    render(await open("formal-conjectures", "wikipedia-oppermann-conjecture", { view: "sources" }));
    expect(screen.getByText("Oppermann's Conjecture · sources")).toBeInTheDocument();
    expect(mocks.view).not.toHaveBeenCalled();
    expect(await generateMetadata({ params: Promise.resolve({ namespace: "formal-conjectures", problem: "wikipedia-oppermann-conjecture" }), searchParams: Promise.resolve({}) }))
      .toMatchObject({ title: "Oppermann's Conjecture", alternates: { canonical: "/problems/formal-conjectures/wikipedia-oppermann-conjecture" } });
  });

  /* One section, one address.
   *
   * Every unknown segment used to resolve: `/problems/erdos-problems/94/bogus`
   * answered 200, rendered Overview, and title-cased the segment into the
   * breadcrumb — so the breadcrumb announced "Bogus" as the current page while
   * the section row announced "Overview", two `aria-current` marks disagreeing
   * about where the reader was, on a `robots: index, follow` URL. Case did the
   * same: `/WORK` rendered Overview instead of reaching Work. */
  const openSection = (segments: string[]) => ProblemPage({
    params: Promise.resolve({ namespace: "erdos-problems", problem: "321", view: segments }),
    searchParams: Promise.resolve({} as never),
  } as never);

  it.each(["work", "results", "sources", "history"])("resolves the %s section", async (section) => {
    mocks.reviewed.mockReturnValue({ entity_id: "problem:erdos:321" });
    render(await openSection([section]));
    expect(mocks.notFound).not.toHaveBeenCalled();
    expect(mocks.view).toHaveBeenCalledWith(expect.objectContaining({
      query: expect.objectContaining({ view: section }),
    }));
  });

  it.each(["bogus", "WORK", "Overview"])("refuses %s as a section", async (segment) => {
    mocks.reviewed.mockReturnValue({ entity_id: "problem:erdos:321" });
    await expect(openSection([segment])).rejects.toThrow("NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalled();
  });

  it("refuses a segment below a section", async () => {
    mocks.reviewed.mockReturnValue({ entity_id: "problem:erdos:321" });
    await expect(openSection(["work", "extra"])).rejects.toThrow("NOT_FOUND");
  });
});
