import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RepositoryCommit, SiteRepository } from "@vela/projection-data";

vi.mock("@/components/vela/clone-menu", () => ({
  CloneMenu: () => <button type="button">Clone exact source</button>,
}));

import { RepositoryContext, standingChangeSummary } from "@/components/vela/repository-context";

const repository = {
  slug: "math",
  source: {
    remote: "https://github.com/vela-science/math.git",
    commit: "f".repeat(40),
    tree: "e".repeat(40),
    committed_at: "2026-08-10T04:32:00.000Z",
  },
  published_snapshot_at: "2026-08-10T04:32:00.000Z",
  status: {
    repository: { id: "123e4567-e89b-42d3-a456-426614174000", name: "Vela Mathematics" },
    roots: { repository: `sha256:${"a".repeat(64)}`, origin: `sha256:${"b".repeat(64)}` },
    integrity: { replay: "verified", strict: "pass", blocker_count: 0 },
    counts: {
      claims: 1,
      accepted_claims: 1,
      pending_claims: 0,
      pending_review: 0,
      accepted_review: 1,
      rejected_review: 1,
      withdrawn_review: 0,
      submissions: 3,
      verifications: 7,
      artifacts: 4,
    },
    actions: {
      review: null,
      work: { mode: "direct_submission", command: "vela submit --repo . --help", note: "Submit bounded evidence directly." },
    },
  },
  graph: null,
  reviews: [],
  claims: [],
  reproduce: { clone: "git clone", checkout: "git checkout", command: "vela replay" },
} as unknown as SiteRepository;

afterEach(cleanup);

describe("RepositoryContext", () => {
  it("keeps Standing, integrity, activity, and human authority on separate visible axes", () => {
    render(<RepositoryContext repository={repository} latestCommit={null} />);

    /* Three axes in the strip, not four. The `Standing` tile rendered the same
       number and unit phrase as the "What currently Stands" section 150px
       below, both visible in one viewport, so the section keeps it and the
       tile is gone. */
    for (const label of ["Integrity", "Activity", "Human authority"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.queryByText("Standing")).not.toBeInTheDocument();
    expect(screen.queryByText("accepted Repository-local Claim")).not.toBeInTheDocument();
    expect(screen.getByText("7").closest("dd")).toHaveTextContent("Checks");
    expect(screen.getByText("replay verified").closest("[data-axis]")).toHaveAttribute("data-axis", "integrity");
  });

  it("makes Standing the primary read while Clone remains a secondary integrity action", () => {
    render(<RepositoryContext repository={repository} latestCommit={null} />);

    expect(screen.getByRole("link", { name: /Inspect current Standing/u })).toHaveAttribute("href", "/repositories/math/claims");
    expect(screen.getByRole("button", { name: "Clone exact source" })).toBeInTheDocument();
  });

  it("never describes direct submission as zero work, and does not restate the note", () => {
    render(<RepositoryContext repository={repository} latestCommit={null} />);

    /* The hero carried a "Source-owned work" box repeating `work.note`, and the
       page's own "Contribution path" section states it one screen below with
       the command beside it. AGENTS.md:98 calls a fact restated next to itself
       a defect, so the section keeps it and the hero does not. */
    expect(screen.queryByText("Submit bounded evidence directly.")).toBeNull();
    expect(screen.queryByText(/0 work/u)).toBeNull();
  });
});

describe("standingChangeSummary", () => {
  const commit = {
    transition: {
      accepted_added: [],
      accepted_removed: [],
    },
  } as unknown as RepositoryCommit;

  it("states explicitly when the latest Git commit changed no Standing", () => {
    expect(standingChangeSummary(commit)).toBe("The latest Git commit changed no scientific Standing.");
  });

  it("reports accepted Claim movement without reducing it to a net count", () => {
    expect(standingChangeSummary({
      ...commit,
      transition: { accepted_added: ["vcl_a"], accepted_removed: ["vcl_b"] },
    } as RepositoryCommit)).toBe("1 accepted Claim entered; 1 accepted Claim left.");
  });
});
