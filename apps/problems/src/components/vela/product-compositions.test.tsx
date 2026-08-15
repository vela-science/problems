import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProblemDiscovery } from "@/lib/scientific-state";
import { HubMembershipMap } from "./hub-membership-map";
import { ProblemDiscoveryFacts, ProblemFacts } from "./problem-facts";
import { ScientificChangeFeed, type ScientificChange } from "./scientific-change-feed";

vi.mock("server-only", () => ({}));

afterEach(cleanup);

const problem = {
  repository: "math",
  problem: "321",
  field: null,
  topics: [{ key: "number theory", name: "Number Theory" }],
  collection: { key: "vela-mathematics", name: "Vela Mathematics" },
  domain: { key: "mathematics", name: "Mathematics" },
  hubs: [{ key: "erdos-problems", name: "Erdős Problems" }],
  theme: "Iterated logarithms",
  canonicalPath: "/problems/erdos-problems/321",
  record: {
    problem: "321",
    declared_status: "solved",
    local_standing: "accepted",
    formalized: true,
    source_count: 1,
    tags: ["number theory"],
    statement: "An exact statement",
  },
} as unknown as ProblemDiscovery;

describe("product compositions", () => {
  it("keeps Source status, Local Standing, and the contribution path on separate axes", () => {
    render(<ProblemDiscoveryFacts problem={problem} />);
    expect(screen.getByText("Source status")).toBeVisible();
    expect(screen.getByText("solved")).toBeVisible();
    expect(screen.getByText("Local Standing")).toBeVisible();
    expect(screen.getByText("Claim accepted locally").closest("[data-axis]")).toHaveAttribute("data-axis", "standing");
    expect(screen.getByText("Contribution path")).toBeVisible();
    expect(screen.getByText("Direct Submission")).toBeVisible();
  });

  it("labels State changes separately from ordinary Repository commits", () => {
    const changes = [
      { repository: { slug: "math", name: "Math" }, commit: { sha: "a".repeat(40), subject: "Accept bounded result", committed_at: "2026-08-11T20:00:00Z", author_name: "A", machine: false, transition: { accepted_added: ["one"], accepted_removed: [], pending_added: [] } } },
      { repository: { slug: "math", name: "Math" }, commit: { sha: "b".repeat(40), subject: "Clarify documentation", committed_at: "2026-08-11T19:00:00Z", author_name: "B", machine: true, transition: null } },
    ] as unknown as ScientificChange[];
    const { container } = render(<ScientificChangeFeed changes={changes} />);
    expect(container).toHaveTextContent("State change");
    expect(screen.getByText("Repository commit")).toBeVisible();
    expect(screen.getByText("machine-authored")).toBeVisible();
  });

  /* Erdős 321 shipped "Accepted locally" over a Claim that denies proving the
     Problem, and Erdős 94's accepted Claim is narrower still — a bounded
     counting identity whose own Decision reason says it "accepts only the
     bounded sum_multiplicity identity, not the cubic Erdős 94 theorem". The
     badge has to carry its subject and the scope has to be on screen, or
     binding a Claim to a Problem publishes a solved conjecture. */
  it("scopes an accepted Claim to the occurrences it covers", () => {
    const scoped = {
      problem: { declared_status: "solved" },
      claims: [{
        standing: "accepted",
        source_bindings: [
          { binding_id: "a", relation_kind: "formal_statement_reference" },
          { binding_id: "b", relation_kind: "formal_statement_reference" },
        ],
      }],
    } as unknown as Parameters<typeof ProblemFacts>[0]["state"];
    render(<ProblemFacts state={scoped} />);
    expect(screen.getByText("Claim accepted locally")).toBeVisible();
    expect(screen.getByText("Scoped to 2 formal statement references, not to this Problem's own statement.")).toBeVisible();
    expect(screen.queryByText("Accepted locally")).toBeNull();
  });

  it("states no scope when no Claim names the Problem", () => {
    const unbound = {
      problem: { declared_status: "open" },
      claims: [],
    } as unknown as Parameters<typeof ProblemFacts>[0]["state"];
    const { container } = render(<ProblemFacts state={unbound} />);
    expect(screen.getByText("Not assessed locally")).toBeVisible();
    expect(container).not.toHaveTextContent("Scoped to");
  });

  it("keeps mixed local Standing neutral rather than implying acceptance", () => {
    const mixed = {
      problem: { declared_status: "open" },
      claims: [{ standing: "accepted" }, { standing: "pending" }],
    } as unknown as Parameters<typeof ProblemFacts>[0]["state"];
    const { container } = render(<ProblemFacts state={mixed} />);
    const facts = screen.getByText("Mixed local Standing").closest("dl");
    expect(screen.getByText("Mixed local Standing")).toBeVisible();
    expect(screen.getByText("Mixed local Standing").closest("[data-axis]"))
      .toHaveAttribute("data-state", "unassessed");
    expect(facts).toHaveClass("border-y");
    expect(facts).not.toHaveClass("rounded-lg", "bg-border");
    expect(container.querySelector("[data-state='accepted']")).toBeNull();
  });

  it("does not paint a removal-only State transition as progress", () => {
    const removal = [{
      repository: { slug: "math", name: "Math" },
      commit: {
        sha: "c".repeat(40), subject: "Withdraw unsupported assertion",
        committed_at: "2026-08-11T18:00:00Z", author_name: "C", machine: false,
        transition: { accepted_added: [], accepted_removed: ["one"], pending_added: [] },
      },
    }] as unknown as ScientificChange[];
    const { container } = render(<ScientificChangeFeed changes={removal} />);
    expect(container).toHaveTextContent("State change");
    expect(container.querySelector(".bg-status-progress")).toBeNull();
  });

  it("uses the radial map only for real Hub membership and keeps a linear mobile list", () => {
    render(<HubMembershipMap name="Erdős Problems" problems={[problem]} />);
    const links = screen.getAllByRole("link", { name: /321/u });
    expect(links).toHaveLength(2);
    for (const link of links) expect(link).toHaveAttribute("href", "/problems/erdos-problems/321");
    expect(screen.getByText("coordination only")).toBeVisible();
  });

});
