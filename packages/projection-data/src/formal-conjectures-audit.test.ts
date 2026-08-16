import { describe, expect, it } from "bun:test";
import {
  formalConjecturesAuditProjection,
  formalConjecturesAuditProjectionRoot,
  formalConjecturesAuditRecordsForProblem,
  parseFormalConjecturesAuditProjection,
} from "./formal-conjectures-audit";

describe("Formal Conjectures source-audit read projection", () => {
  it("keeps all five source records while joining only exact reviewed Erdős numbers", () => {
    expect(formalConjecturesAuditProjectionRoot).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(formalConjecturesAuditProjection.records).toHaveLength(5);
    expect(formalConjecturesAuditRecordsForProblem({ resolution_namespace: "erdos-problems", problem_number: 887 }))
      .toMatchObject([{ fixture_id: "fidelity-erdos-887-1237", advisory_disposition: "needs_revision" }]);
    expect(formalConjecturesAuditRecordsForProblem({ resolution_namespace: "erdos-problems", problem_number: "80" }))
      .toMatchObject([{ fixture_id: "vacuity-erdos-80-4830", advisory_disposition: "needs_revision" }]);
    expect(formalConjecturesAuditRecordsForProblem({ resolution_namespace: "formal-conjectures", problem_number: 887 })).toEqual([]);
    expect(formalConjecturesAuditRecordsForProblem({ resolution_namespace: "erdos-problems", problem_number: 4878 })).toEqual([]);
    expect(formalConjecturesAuditProjection.records).toEqual(expect.arrayContaining([
      expect.objectContaining({
        fixture_id: "clean-source-faithful-min-modulus-4829",
        advisory_disposition: "clean",
        authority_effect: "none",
        standing_effect: "none",
        automatic_verification: false,
      }),
    ]));
  });

  it("preserves contradictory source axes instead of collapsing them", () => {
    const fidelity = formalConjecturesAuditProjection.records.find(({ fixture_id }) => fixture_id === "fidelity-erdos-887-1237")!;
    expect(fidelity.observed_pull_request_state).toMatchObject({ state: "MERGED", review_decision: "APPROVED" });
    expect(fidelity.checks.map(({ kind, outcome }) => `${kind}:${outcome}`)).toEqual(["semantic:fail", "mechanical:pass"]);
    expect(fidelity.authority_effect).toBe("none");
    expect(fidelity.standing_effect).toBe("none");
    expect(fidelity.automatic_verification).toBe(false);
    expect(formalConjecturesAuditProjection.conformance.authority_effect).toBe("none");
    expect(new Set(formalConjecturesAuditProjection.conformance.requirement_ids).size).toBe(9);
    const unavailable = formalConjecturesAuditProjection.records.find(({ fixture_id }) => fixture_id === "unavailable-rupert-3959")!;
    expect(unavailable.checks).toEqual(expect.arrayContaining([expect.objectContaining({
      property: "comparator-tool-availability",
      outcome: "unavailable",
      automatic_protocol_conversion: false,
    })]));
  });

  it("fails closed on authority, typed roots, inventory, protocol conversion, and locator drift", () => {
    const mutations: Array<(value: any) => void> = [
      (value) => { value.authority_effect = "standing"; },
      (value) => { value.records.pop(); },
      (value) => { value.records[0].root = `sha256:${"0".repeat(64)}`; value.records[1].root = value.records[0].root; },
      (value) => { value.records[0].pull_request.url = "https://github.com/google-deepmind/formal-conjectures/pull/1"; },
      (value) => { value.records[0].checks[0].automatic_protocol_conversion = true; },
      (value) => { value.records[2].checks[0].severity = "none"; },
      (value) => { value.records[0].changed_paths = ["../secret"]; },
      (value) => { value.conformance.authority_effect = "standing"; },
      (value) => { value.conformance.requirement_ids[1] = value.conformance.requirement_ids[0]; },
      (value) => { value.does_not_establish = ["Nothing further.", "One", "Two", "Three", "Four"]; },
    ];
    for (const mutate of mutations) {
      const value = structuredClone(formalConjecturesAuditProjection);
      mutate(value);
      expect(() => parseFormalConjecturesAuditProjection(value)).toThrow();
    }
  });
});
