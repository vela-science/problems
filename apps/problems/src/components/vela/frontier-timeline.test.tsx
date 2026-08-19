import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { FrontierTimeline, type FrontierState } from "@/components/vela/frontier-timeline";

function state(overrides: Partial<FrontierState> & { id: string; label: string }): FrontierState {
  return {
    at: "2026-08-01T12:00:00.000Z",
    accepted: [],
    removed: [],
    evidence: [],
    anchors: null,
    ...overrides,
  };
}

const accepted = state({
  id: "vev_accept",
  label: "Result accepted",
  accepted: [{ title: "A unitary perfect number theorem", href: "/results/one" }],
  evidence: [
    { stage: "submission", label: "Submission received", basis: "source-asserted" },
    { stage: "check", label: "Check passed", basis: "checked" },
    { stage: "repository decision", label: "Repository decision: accepted", basis: "repository decision" },
    { stage: "result standing", label: "Result standing: accepted", basis: "derived from records" },
  ],
  anchors: {
    repository_root_before: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    repository_root_after: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    semantic_delta_root: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    event_ids: ["vev_0000000000000001"],
  },
});

const corrected = state({
  id: "vev_correct",
  label: "Result corrected",
  at: "2026-08-05T12:00:00.000Z",
  accepted: [{ title: "The corrected statement" }],
  removed: [{ title: "A unitary perfect number theorem" }],
  evidence: [
    { stage: "repository decision", label: "Repository decision: corrected", basis: "repository decision" },
  ],
});

/* The suite runs without vitest globals, so Testing Library's automatic
   teardown is never registered on its own. */
afterEach(cleanup);

describe("FrontierTimeline", () => {
  test("renders nothing when there are no states and no gaps", () => {
    const { container } = render(<FrontierTimeline states={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  test("renders every state in the order given", () => {
    render(<FrontierTimeline states={[accepted, corrected]} />);
    const timeline = screen.getAllByRole("list")[0]!;
    const articles = within(timeline).getAllByRole("article");
    expect(articles).toHaveLength(2);
    expect(articles[0]).toHaveTextContent("Result accepted");
    expect(articles[1]).toHaveTextContent("Result corrected");
    expect(articles[1]).toHaveTextContent("Removed");
    expect(articles[1]).toHaveTextContent("The corrected statement");
  });

  test("labels every basis chip accessibly, prefixed as a basis", () => {
    render(<FrontierTimeline states={[accepted]} />);
    const article = screen.getByRole("article");
    for (const basis of ["source-asserted", "checked", "repository decision", "derived from records"]) {
      const chip = within(article).getByText(basis, { exact: true });
      expect(chip.parentElement).toHaveTextContent(`basis: ${basis}`);
    }
  });

  test("keeps technical anchors behind a closed disclosure", () => {
    render(<FrontierTimeline states={[accepted]} />);
    const disclosure = screen.getByText("Technical details").closest("details");
    expect(disclosure).not.toBeNull();
    expect(disclosure).not.toHaveAttribute("open");
    expect(within(disclosure as HTMLElement).getByText("Repository root before")).toBeInTheDocument();
    expect(within(disclosure as HTMLElement).getByText(
      "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    )).toBeInTheDocument();
    /* The exact roots exist nowhere outside the disclosure. */
    const article = screen.getByRole("article");
    const outside = article.cloneNode(true) as HTMLElement;
    outside.querySelector("details")?.remove();
    expect(outside.textContent).not.toContain("sha256:");
    expect(outside.textContent).not.toContain("vev_0000000000000001");
  });

  test("renders a state with no retained instant honestly", () => {
    render(<FrontierTimeline states={[state({ id: "vev_untimed", label: "Result accepted", at: null })]} />);
    expect(screen.getByText("not recorded")).toBeInTheDocument();
    expect(screen.getByRole("article").querySelector("time")).not.toHaveAttribute("datetime");
  });

  test("renders gaps as plain sentences, with or without states", () => {
    render(
      <FrontierTimeline
        states={[]}
        gaps={[{ id: "gap-1", sentence: "4 formalizations; equivalence not established.", basis: "source-asserted" }]}
      />,
    );
    expect(screen.getByRole("heading", { name: "Still unresolved" })).toBeInTheDocument();
    expect(screen.getByText("4 formalizations; equivalence not established.")).toBeInTheDocument();
  });

  test("keeps a gap's exact identifier behind a closed disclosure", () => {
    render(
      <FrontierTimeline
        states={[]}
        gaps={[{
          id: "gap-ref",
          sentence: "This check does not establish: Standing.",
          basis: "checked",
          ref: "vvr_ac3996330910c9fb",
        }]}
      />,
    );
    const disclosure = screen.getByText("Exact identity").closest("details");
    expect(disclosure).not.toBeNull();
    expect(disclosure).not.toHaveAttribute("open");
    expect(within(disclosure as HTMLElement).getByText("vvr_ac3996330910c9fb")).toBeInTheDocument();
    /* The identifier exists nowhere outside the disclosure. */
    const item = screen.getByRole("listitem");
    const outside = item.cloneNode(true) as HTMLElement;
    outside.querySelector("details")?.remove();
    expect(outside.textContent).not.toContain("vvr_");
  });

  test("authors no animation, so reduced motion has nothing to remove", () => {
    /* Shared @vela/ui primitives carry their own colour transitions, which
       the global reduced-motion rule in foundation.css already collapses;
       every primitive marks itself with data-slot. This component itself must
       add nothing animated on top of them. */
    const { container } = render(<FrontierTimeline states={[accepted, corrected]} />);
    expect(container.querySelector("[class*='animate-']")).toBeNull();
    for (const element of container.querySelectorAll("[class*='transition']")) {
      expect(element.hasAttribute("data-slot")).toBe(true);
    }
  });
});
