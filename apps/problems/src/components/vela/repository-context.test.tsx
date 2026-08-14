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

    for (const label of ["Standing", "Integrity", "Activity", "Human authority"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText("accepted Repository-local Claim")).toBeInTheDocument();
    expect(screen.getByText("7").closest("dd")).toHaveTextContent("Checks");
    expect(screen.getByText("replay verified").closest("[data-axis]")).toHaveAttribute("data-axis", "integrity");
  });

  it("makes Standing the primary read while Clone remains a secondary integrity action", () => {
    render(<RepositoryContext repository={repository} latestCommit={null} />);

    expect(screen.getByRole("button", { name: /Inspect current Standing/u })).toHaveAttribute("href", "/repositories/math/claims");
    expect(screen.getByRole("button", { name: "Clone exact source" })).toBeInTheDocument();
  });

  it("describes direct submission as source-owned work, never zero work", () => {
    render(<RepositoryContext repository={repository} latestCommit={null} />);

    expect(screen.getByText("Submit bounded evidence directly.")).toBeInTheDocument();
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
