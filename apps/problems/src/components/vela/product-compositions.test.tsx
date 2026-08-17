import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProblemDiscovery } from "@/lib/scientific-state";
import { HubMembershipMap } from "./hub-membership-map";
import { ProblemDiscoveryFacts } from "./problem-facts";
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
  it("keeps Source status and Local Standing on separate axes", () => {
    render(<ProblemDiscoveryFacts problem={problem} />);
    expect(screen.getByText("Source status")).toBeVisible();
    expect(screen.getByText("solved")).toBeVisible();
    expect(screen.getByText("Local Standing")).toBeVisible();
    expect(screen.getByText("Claim accepted locally").closest("[data-axis]")).toHaveAttribute("data-axis", "standing");
    /* The contribution-path cell was a hard-coded literal that never varied
       between rows; the path a contribution takes is the Repository's fact
       and renders where the Repository states it. */
    expect(screen.queryByText("Direct Submission")).not.toBeInTheDocument();
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

  it("translates update labels for newcomer-facing surfaces without changing the exact feed", () => {
    const changes = [
      { repository: { slug: "math", name: "Math" }, commit: { sha: "a".repeat(40), subject: "vela: review review_accept", committed_at: "2026-08-11T20:00:00Z", author_name: "A", machine: true, transition: { accepted_added: ["one"], accepted_removed: [], pending_added: [] } } },
      { repository: { slug: "math", name: "Math" }, commit: { sha: "b".repeat(40), subject: "Clarify documentation", committed_at: "2026-08-11T19:00:00Z", author_name: "B", machine: false, transition: null } },
    ] as unknown as ScientificChange[];
    const { container } = render(<ScientificChangeFeed changes={changes} compact plainLanguage />);

    expect(screen.getByText("Evidence update")).toBeVisible();
    expect(screen.getByText("Source update")).toBeVisible();
    expect(screen.getByText("Automated update")).toBeVisible();
    expect(screen.getByRole("link", { name: "Reviewed evidence was updated" })).toBeVisible();
    expect(container).toHaveTextContent("1 accepted item added");
    expect(container).not.toHaveTextContent("0 removed");
    expect(container).not.toHaveTextContent(/State change|Repository commit|machine-authored|assertions/iu);
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
