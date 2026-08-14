import { describe, expect, test } from "bun:test";
import { compactEditorialSummary, type CompactStatus } from "../src";
import { editorialSummarySchema } from "../src/editorial-schema";
import { editorialSummary } from "../src/editorial";

/*
  The editorial summary is the only projection data apps/www serves, and it is
  a committed file. That combination has one specific failure mode, and it
  already happened once: the protocol moved `status.roots.event_log` and the
  work counts out from under `compactEditorialSummary`, the generator started
  throwing, and nobody noticed for three days because the site kept rendering
  the last snapshot it had — 646 open targets on Erdős against a real 1.

  These tests are that failure mode, caught without a database. The generator
  runs against a status shaped like the one the current emitter publishes, and
  its output has to satisfy the schema. If a future release moves a field
  again, this fails in CI instead of silently freezing the public numbers.
*/

const root = (digit: string) => `sha256:${digit.repeat(64)}`;

/* Exactly what `vela status --json` emits today: no event_log root. See the emitter in the Vela workspace at
   crates/vela-cli/src/current_repository.rs. */
function currentStatus(): CompactStatus {
  return {
    schema: "vela.status.v4",
    ok: true,
    command: "status",
    repository: { id: "123e4567-e89b-42d3-a456-426614174000", name: "Test repository" },
    git: { role: "repository_head", commit: "1".repeat(40), tree: "2".repeat(40) },
    roots: {
      origin: root("a"),
      repository: root("b"),
      authority_keyset: root("c"),
      authority_policy: root("d"),
    },
    integrity: { replay: "verified", strict: "pass", blocker_count: 0, blockers_by_code: {} },
    counts: {
      claims: 40,
      accepted_claims: 40,
      pending_claims: 0,
      pending_review: 0,
      accepted_review: 0,
      rejected_review: 0,
      withdrawn_review: 0,
      submissions: 0,
      verifications: 0,
      artifacts: 27,
    },
    decision_inbox: {
      pending_count: 0,
      protocol_ready_count: 0,
      protocol_blocked_count: 0,
      projection_root: root("e"),
      first_entry_root: null,
    },
    actions: {
      review: null,
      work: { mode: "direct_submission", command: "vela submit --repo . --help", note: "Submit bounded evidence directly." },
    },
  } as CompactStatus;
}

function bundle() {
  return {
    schema: "site.problems-release.v1",
    generated_at: "2026-07-28T02:26:52-04:00",
    generator: { vela_version: "vela 0.940.5" },
    repositories: [
      {
        slug: "sidon-sets",
        source: { remote: "https://github.com/vela-science/sidon-frontier", commit: "3".repeat(40) },
        status: currentStatus(),
        reviews: [],
      },
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("editorial summary generation", () => {
  test("produces schema-valid output from the status the emitter publishes today", () => {
    const summary = compactEditorialSummary(bundle());
    expect(() => editorialSummarySchema.parse(summary)).not.toThrow();
  });

  test("carries the canonical root and names it", () => {
    const [repository] = compactEditorialSummary(bundle()).repositories;
    /* The repository root is what `canonical_root()` returns in the emitter,
       and it is the first root statusStateRoot resolves for this shape. */
    expect(repository.canonical_root).toBe(root("b"));
    expect(repository.canonical_root_label).toBe("Repository root");
    expect(repository.epoch_root).toBeUndefined();
  });

  test("publishes no retired work inventory", () => {
    const [repository] = compactEditorialSummary(bundle()).repositories;
    expect(repository).not.toHaveProperty("work_state");
    expect(repository.counts).not.toHaveProperty("open_work");
    expect(repository.counts).not.toHaveProperty("available_work");
  });
});

describe("the committed snapshot", () => {
  test("parses against the current schema", () => {
    expect(() => editorialSummarySchema.parse(editorialSummary)).not.toThrow();
  });

  test("is regenerable in shape: every repository carries a canonical root", () => {
    for (const repository of editorialSummary.repositories) {
      expect(repository.canonical_root).toMatch(/^sha256:[0-9a-f]{64}$/u);
      expect(repository.canonical_root_label.length).toBeGreaterThan(0);
    }
  });

  test("contains only current Repository counts", () => {
    for (const repository of editorialSummary.repositories) {
      expect(Object.keys(repository.counts).sort()).toEqual(["claims", "pending_review"]);
    }
  });
});
