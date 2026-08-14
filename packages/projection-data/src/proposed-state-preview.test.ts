import { describe, expect, test } from "bun:test";
import {
  classifyRetainedProposedStatePreview,
  currentProposedStatePreview,
  terminalProposedStatePreview,
  unavailableTerminalProposedStatePreview,
  verifyProposedStatePreview,
} from "./proposed-state-preview";

const hash = (digit: string) => `sha256:${digit.repeat(64)}`;
const revision = (git: string, root: string, row = hash("9")) => ({
  git_commit: git.repeat(40),
  repository_root: root,
  row_root: row,
});
const entry = () => ({
  proposal_id: "vpr_exact",
  entry_root: hash("1"),
  inputs: {
    repository_root: hash("2"),
    proposal_root: hash("3"),
    claim_root: hash("4"),
    submission_root: hash("5"),
    verification_set_root: hash("6"),
  },
  authority_heads: {
    policy_bundle_root: hash("7"),
    authority_keyset_root: hash("8"),
    authority_record_root: hash("a"),
    authority_event_log_root: hash("b"),
  },
  standing_delta: {
    before: { repository_root: hash("2") },
    if_accept: { repository_root: hash("c") },
    if_reject: { repository_root: hash("d") },
  },
  staleness: { state: "current" },
});

describe("proposed-state preview boundary", () => {
  test("roots one current authority-none preview", () => {
    const preview = currentProposedStatePreview({
      entry: entry(),
      projectionRoot: hash("e"),
      revision: revision("1", hash("2")),
    });
    expect(verifyProposedStatePreview(preview)).toMatchObject({
      state: "current",
      authority_effect: "none",
      entry_root: hash("1"),
      predictions: { if_accept_repository_root: hash("c") },
      terminal: null,
    });
    expect(preview.nonclaims.join(" ")).toContain("does not make a Decision");
  });

  test("refuses base and predicted-root drift", () => {
    expect(() => currentProposedStatePreview({
      entry: entry(),
      projectionRoot: hash("e"),
      revision: revision("1", hash("f")),
    })).toThrow("base Repository root drift");
    const drift = entry();
    drift.standing_delta.before.repository_root = hash("f");
    expect(() => currentProposedStatePreview({
      entry: drift,
      projectionRoot: hash("e"),
      revision: revision("1", hash("2")),
    })).toThrow("before root drift");
  });

  test("proves an exact terminal outcome only when the predicted root matches", () => {
    const preview = terminalProposedStatePreview({
      entry: entry(),
      projectionRoot: hash("e"),
      proposalStatus: "accepted",
      base: revision("1", hash("2")),
      terminal: revision("2", hash("c"), hash("8")),
    });
    expect(preview).toMatchObject({
      state: "terminal_historical",
      terminal: { proposal_status: "accepted", applied_exactly_as_reviewed: true },
    });
    expect(() => terminalProposedStatePreview({
      entry: entry(),
      projectionRoot: hash("e"),
      proposalStatus: "rejected",
      base: revision("1", hash("2")),
      terminal: revision("2", hash("c"), hash("8")),
    })).toThrow("differs from reviewed preview");
  });

  test("retains an exact unavailable terminal basis instead of recomputing", () => {
    const preview = unavailableTerminalProposedStatePreview({
      proposalId: "vpr_exact",
      proposalStatus: "rejected",
      base: revision("1", hash("2")),
      terminal: revision("2", hash("d"), hash("8")),
      blocker: {
        code: "repository_predecessor_layout",
        detail: "Current Core refuses a historical Decision Inbox.",
      },
    });
    expect(verifyProposedStatePreview(preview)).toMatchObject({
      state: "unavailable",
      entry_root: null,
      terminal: { applied_exactly_as_reviewed: null },
    });
  });

  test("classifies retained current, stale-recomputable, and invalidated packets", () => {
    const preview = currentProposedStatePreview({
      entry: entry(),
      projectionRoot: hash("e"),
      revision: revision("1", hash("2")),
    });
    expect(classifyRetainedProposedStatePreview({
      retained: preview,
      currentEntryRoot: hash("1"),
      currentProposalRoot: hash("3"),
    })).toBe("current");
    expect(classifyRetainedProposedStatePreview({
      retained: preview,
      currentEntryRoot: hash("f"),
      currentProposalRoot: hash("3"),
    })).toBe("stale_recomputable");
    expect(classifyRetainedProposedStatePreview({
      retained: preview,
      currentEntryRoot: hash("f"),
      currentProposalRoot: hash("0"),
    })).toBe("invalidated");
  });

  test("refuses rooted content mutation", () => {
    const preview = currentProposedStatePreview({
      entry: entry(),
      projectionRoot: hash("e"),
      revision: revision("1", hash("2")),
    });
    const drift = structuredClone(preview);
    drift.predictions!.if_accept_repository_root = hash("f");
    expect(() => verifyProposedStatePreview(drift)).toThrow("preview root drift");
  });
});
