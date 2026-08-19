import { describe, expect, it, vi } from "vitest";
import type { ProblemDiscovery, ScientificProblemState } from "./scientific-state";
import { publicPerformerActivityForProblem } from "./performer-activity";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (value: unknown) => value }));

describe("public performer activity", () => {
  it("keeps Result, Decision, and advisory-check attribution distinct", () => {
    const discovery = {
      canonicalPath: "/problems/erdos-problems/321",
      collection: { key: "erdos-problems", name: "Erdős Problems" },
    } as unknown as ProblemDiscovery;
    const state = {
      repositorySlug: "math",
      problem: {
        label: "Erdős problem 321",
        source_id: "source:erdos-problems",
        statement_kind: "prose",
        statement: "How large can the reciprocal-sum-free set be?",
      },
      source: { title: "Erdős Problems" },
      locator: "https://example.test/321",
      sources: { occurrences: [] },
      claims: [{ id: "claim-1", assertion: "A bounded candidate Result." }],
      reviews: [{
        proposal_id: "proposal-1",
        target: "claim-1",
        status: "accepted",
        created_at: "2026-08-17T10:00:00Z",
        reviewed_at: "2026-08-17T11:00:00Z",
        reviewed_by: "human:decider",
        decision_actor_class: "human",
        decision_reason: "Accepted within its stated scope.",
        producer_package: {
          producer_actor: "tool:producer",
          submitted_at: "2026-08-17T10:00:00Z",
          caveats: ["This does not prove the full Problem."],
        },
        verification_records: [{
          verification_record_id: "check-1",
          verifier_actor: "agent:checker",
          reviewer_kind: "ai_model",
          reviewer_display_name: "Checking model",
          completed_at: "2026-08-17T10:30:00Z",
          outcome: "pass",
          property: "claim chain fidelity",
          does_not_establish: ["Mathematical truth."],
        }],
      }],
    } as unknown as NonNullable<ScientificProblemState>;

    const rows = publicPerformerActivityForProblem(discovery, state);
    expect(rows.map(({ role, performerId, performerKind }) => ({ role, performerId, performerKind }))).toEqual([
      { role: "Result performer", performerId: "tool:producer", performerKind: "agent" },
      { role: "Decision performer", performerId: "human:decider", performerKind: "human" },
      { role: "Advisory check", performerId: "agent:checker", performerKind: "agent" },
    ]);
    expect(rows[0]?.limitation).toBe("This does not prove the full Problem.");
    expect(rows[2]?.limitation).toBe("Mathematical truth.");
  });

  it("keeps a retained Decision performer readable when actor class is absent", () => {
    const discovery = {
      canonicalPath: "/problems/erdos-problems/321",
      collection: { key: "erdos-problems", name: "Erdős Problems" },
    } as unknown as ProblemDiscovery;
    const state = {
      repositorySlug: "math",
      problem: { label: "Erdős problem 321", source_id: "source:erdos-problems", statement_kind: "prose", statement: "A question." },
      source: { title: "Erdős Problems" },
      locator: "https://example.test/321",
      sources: { occurrences: [] },
      claims: [{ id: "claim-1", assertion: "A Result." }],
      reviews: [{
        proposal_id: "proposal-1",
        target: "claim-1",
        status: "accepted",
        reviewed_at: "2026-08-17T11:00:00Z",
        reviewed_by: "actor:class-not-retained",
        decision_actor_class: null,
        producer_package: null,
        verification_records: [],
      }],
    } as unknown as NonNullable<ScientificProblemState>;

    expect(publicPerformerActivityForProblem(discovery, state)).toEqual([
      expect.objectContaining({
        role: "Decision performer",
        performerId: "actor:class-not-retained",
        performerKind: "unknown",
      }),
    ]);
  });
});
