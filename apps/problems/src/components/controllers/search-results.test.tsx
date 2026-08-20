import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { SearchResults as ActualSearchResults } from "@/components/controllers/search-results";
import { loadSearchIndex } from "@/lib/search-index";

const problemCollections = [
  { namespace: "erdos-problems", name: "Erdős Problems", identifierKind: "number" as const },
  { namespace: "formal-conjectures", name: "Formal Conjectures", identifierKind: "slug" as const, recordLabels: { "wikipedia-oppermann-conjecture": "Oppermann's Conjecture" } },
];

const navigation = vi.hoisted(() => ({ params: new URLSearchParams(), push: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/search",
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () => navigation.params,
}));

vi.mock("@/lib/search-index", () => ({ loadSearchIndex: vi.fn() }));

function SearchResults(props: Omit<React.ComponentProps<typeof ActualSearchResults>, "collectionRoot">) {
  return <ActualSearchResults collectionRoot="sha256:collection" {...props} />;
}

function record(overrides: Record<string, unknown>) {
  return {
    kind: "claim", repository: "erdos", id: "claim:1", assertion: "An assertion",
    source_title: null, standing: "accepted", href: "/repositories/erdos/claims/claim:1",
    ...overrides,
  };
}

describe("SearchResults", () => {
  beforeEach(() => {
    navigation.params = new URLSearchParams();
    window.history.replaceState(null, "", "/search");
    vi.mocked(loadSearchIndex).mockReset();
    navigation.push.mockReset();
  });

  test("waits for explicit search intent instead of dumping the corpus", () => {
    const view = render(<SearchResults projectionRoot="sha256:test" searchRoot="sha256:search" repositories={["erdos"]} problemCollections={problemCollections} />);

    expect(screen.getByText("Find a scientific Problem or Result")).toBeVisible();
    expect(screen.getByText("Ready for a query")).toBeVisible();
    expect(loadSearchIndex).not.toHaveBeenCalled();
    view.unmount();
  });

  test("names the axis each result's state belongs to", async () => {
    navigation.params = new URLSearchParams("q=a");
    vi.mocked(loadSearchIndex).mockResolvedValue({
      records: [
        record({}),
        record({ kind: "proposal", id: "proposal:1", standing: "withdrawn" }),
        record({ kind: "repository", id: "erdos", standing: "strict_pass" }),
        record({ kind: "verifier_attachment", id: "verifier:1", standing: "verified" }),
      ],
    } as never);

    const view = render(<SearchResults projectionRoot="sha256:test" searchRoot="sha256:search" repositories={["erdos"]} problemCollections={problemCollections} />);
    await waitFor(() => expect(screen.getByText("standing · accepted")).toBeVisible());
    expect(screen.getByText("proposal · withdrawn")).toBeVisible();
    expect(screen.getByText("integrity · strict pass")).toBeVisible();
    expect(screen.getByText("verification · verified")).toBeVisible();
    expect(screen.getByText("standing · accepted").closest("[data-axis]")).toHaveAttribute("data-axis", "standing");
    view.unmount();
  });

  test("identifies a Problem by collection and collection-local number", async () => {
    navigation.params = new URLSearchParams("q=321");
    vi.mocked(loadSearchIndex).mockResolvedValue({ records: [record({
      kind: "problem",
      repository: "math",
      id: "erdos:321",
      assertion: "A question about arithmetic progressions",
      href: "/problems/erdos-problems/321",
      standing: "unassessed",
      source_status: "solved",
      result_standing: null,
    })] } as never);

    const view = render(<SearchResults projectionRoot="sha256:test" searchRoot="sha256:search" repositories={["math"]} problemCollections={problemCollections} />);
    expect(await screen.findByText("Erdős Problems · #321")).toBeVisible();
    expect(screen.getByText("Source · solved")).toBeVisible();
    expect(screen.getByText("No reviewed Result")).toBeVisible();
    view.unmount();
  });

  test("identifies a formalized occurrence by collection-qualified human label", async () => {
    navigation.params = new URLSearchParams("q=oppermann");
    vi.mocked(loadSearchIndex).mockResolvedValue({ records: [record({
      kind: "problem",
      repository: "source:formal-conjectures",
      id: "formal-conjectures:Oppermann.oppermann_conjecture",
      assertion: "Oppermann's Conjecture",
      source_title: "Formal Conjectures",
      href: "/problems/formal-conjectures/wikipedia-oppermann-conjecture",
      standing: "source_open",
      source_status: "open",
      result_standing: null,
    })] } as never);

    const view = render(<SearchResults projectionRoot="sha256:test" searchRoot="sha256:search" repositories={["math"]} problemCollections={problemCollections} />);
    expect(await screen.findByText("Formal Conjectures · Oppermann's Conjecture")).toBeVisible();
    expect(screen.getByText("Source · open")).toBeVisible();
    expect(screen.getByText("No reviewed Result")).toBeVisible();
    view.unmount();
  });

  test("takes contribution searches straight to the chosen Problem's Work view", async () => {
    navigation.params = new URLSearchParams("q=321&kind=claim&repository=erdos&standing=accepted&intent=contribute");
    vi.mocked(loadSearchIndex).mockResolvedValue({ records: [record({
      kind: "problem",
      repository: "math",
      id: "erdos:321",
      assertion: "A question about arithmetic progressions",
      href: "/problems/erdos-problems/321",
      standing: "unassessed",
      source_status: "open",
      result_standing: null,
    })] } as never);

    const view = render(<SearchResults projectionRoot="sha256:test" searchRoot="sha256:search" repositories={["math"]} problemCollections={problemCollections} />);
    const result = await screen.findByRole("option", { name: /A question about arithmetic progressions/iu });
    expect(screen.getByText("Choose a Problem")).toBeVisible();
    expect(screen.queryByText("Repository")).toBeNull();
    expect(screen.queryByText("Kind")).toBeNull();
    expect(screen.queryByText("State")).toBeNull();
    expect(loadSearchIndex).toHaveBeenCalledWith("sha256:test", "sha256:search", "sha256:collection", expect.objectContaining({ kind: "problem", repository: undefined, standing: undefined }));
    await userEvent.click(result);
    expect(navigation.push).toHaveBeenCalledWith("/problems/erdos-problems/321/work");
    view.unmount();
  });

  test("reports a bounded page without claiming it is the full catalogue", async () => {
    navigation.params = new URLSearchParams("collection=erdos-problems");
    vi.mocked(loadSearchIndex).mockResolvedValue({ records: [record({ kind: "problem", id: "erdos:1", href: "/problems/erdos-problems/1", source_status: "open", result_standing: null })], total: 1_217 } as never);

    const view = render(<SearchResults projectionRoot="sha256:test" searchRoot="sha256:search" repositories={["math"]} problemCollections={problemCollections} />);
    expect(await screen.findByText("Showing 1 of 1,217 results")).toBeVisible();
    view.unmount();
  });

  test("keeps protocol identity behind the selected Result destination", async () => {
    navigation.params = new URLSearchParams("q=readable");
    vi.mocked(loadSearchIndex).mockResolvedValue({ records: [record({
      id: "vcl_1234567890abcdef",
      assertion: "A readable scientific result",
    })] } as never);

    const view = render(<SearchResults projectionRoot="sha256:test" searchRoot="sha256:search" repositories={["erdos"]} problemCollections={problemCollections} />);
    expect(await screen.findByText("A readable scientific result")).toBeVisible();
    expect(screen.getByText("Result")).toBeVisible();
    expect(screen.queryByText(/vcl_1234567890abcdef/u)).toBeNull();
    view.unmount();
  });

  test("does not offer one filter named for a single axis", async () => {
    const view = render(<SearchResults projectionRoot="sha256:test" searchRoot="sha256:search" repositories={["erdos"]} problemCollections={problemCollections} />);

    /* Named "State", not "Standing" — and now labelled on screen rather than
       only in an aria-label, because three unlabelled triggers all reading
       "all" said nothing about what any of them filtered. */
    expect(screen.queryByRole("combobox", { name: "Standing" })).toBeNull();
    expect(screen.getByText("Repository")).toBeVisible();
    expect(screen.getByText("Collection")).toBeVisible();
    expect(screen.getByText("Kind")).toBeVisible();
    await userEvent.click(screen.getByRole("combobox", { name: "State" }));

    /* Words from four vocabularies: the options say which each came from
       so selecting one cannot read as narrowing Claim standing. */
    expect(await screen.findByRole("group", { name: "Repository integrity" })).toBeVisible();
    for (const axis of ["Local Standing", "Check outcome", "Proposed change status", "Outside the state axes"]) {
      expect(screen.getByRole("group", { name: axis })).toBeVisible();
    }
    expect(within(screen.getByRole("group", { name: "Proposed change status" })).getByRole("option", { name: "withdrawn" })).toBeVisible();
    view.unmount();
  });
});
