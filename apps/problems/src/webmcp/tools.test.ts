import { describe, expect, it, vi } from "vitest";
import type { MutationActions } from "./tools";
import type { WebMcpProblemContext } from "./context";
import {
  attachEvidence,
  inspectCandidate,
  inspectClaim,
  inspectHistory,
  inspectProblem,
  openApproach,
  prepareSubmission,
  type ProblemActivitySnapshot,
  type ToolEnvironment,
} from "./tools";
import type { ToolResult } from "./results";

const CLAIM = `vcl_${"b".repeat(64)}`;
const ROOT = `sha256:${"a".repeat(64)}`;

function context(overrides: Partial<WebMcpProblemContext> = {}): WebMcpProblemContext {
  return {
    schema: "vela.webmcp-problem-context.v1",
    route: "/problems/erdos-problems/321",
    repository: "math",
    problem: "321",
    collection: "Erdős problems",
    label: "Erdős problem 321",
    question: "How large can such a set be?",
    statement_kind: "prose",
    declared_status: "open",
    formalized: true,
    tags: ["combinatorics"],
    release_root: ROOT,
    anchor_root: `sha256:${"d".repeat(64)}`,
    problem_record_root: `sha256:${"e".repeat(64)}`,
    repository_root: `sha256:${"f".repeat(64)}`,
    source_commit: "0".repeat(40),
    current_claim_id: CLAIM,
    claims: [{
      id: CLAIM,
      root: `sha256:${"1".repeat(64)}`,
      standing: "accepted",
      assertion: "A two-sided asymptotic bound holds at the retained revision.",
      assertion_type: "computational",
      conditions: ["At Formal Conjectures commit 59f30aa."],
      evidence_count: 1,
      contested: false,
      retracted: false,
      is_current: true,
      lineages: [{
        submission_id: "vsb_a72e375d5b327714",
        proposal_id: "vpr_2c3fe5888b00366a",
        proposal_status: "accepted",
        verifications: [{
          id: "vvr_bcfb5c7a0812619d",
          outcome: "pass",
          property: "claim_chain_fidelity",
          does_not_establish: ["A proof, resolution, acceptance, or Standing."],
          verifier: "verifier:codex-submission-v3-migration-review",
          completed_at: "2026-08-17T18:33:34.000Z",
        }],
        decision: {
          provenance: "signed_record",
          decided_by: "agent:submission-v3-migration",
          performer_class: "agent",
          decided_at: "2026-08-17T18:33:47.000Z",
          reason: "Accept the exact current assertion after a scoped fidelity check.",
          event_id: "vev_15632b53fb7fd674",
          applied_event_id: "vev_b1a3213862d0bd53",
        },
      }],
      corrections: [{ kind: "corrects", target_claim_id: `vcl_${"c".repeat(64)}` }],
    }],
    sources: [],
    search: { search_root: `sha256:${"2".repeat(64)}`, collection_root: `sha256:${"3".repeat(64)}` },
    ...overrides,
  };
}

const EMPTY_ACTIVITY: ProblemActivitySnapshot = { approaches: [], attempts: [], artifacts: [], drafts: [] };

function environment(overrides: Partial<ToolEnvironment> = {}): ToolEnvironment {
  return {
    problem: context(),
    work: { accountsEnabled: true, signedIn: true, workspaceId: "ws_1" },
    actions: spyActions(),
    readActivity: async () => EMPTY_ACTIVITY,
    idempotencyKey: () => "idem-fixed",
    ...overrides,
  };
}

/* One typed set of spies, so `mock.calls[0][0]` is a FormData rather than
   `never` and the assertions below read the form the action actually received. */
function spyActions(overrides: Partial<MutationActions> = {}): MutationActions {
  return {
    createApproach: vi.fn<(form: FormData) => Promise<void>>(async () => {}),
    createAttempt: vi.fn<(form: FormData) => Promise<void>>(async () => {}),
    attachArtifact: vi.fn<(form: FormData) => Promise<void>>(async () => {}),
    addDiscussion: vi.fn<(form: FormData) => Promise<void>>(async () => {}),
    saveSubmissionDraft: vi.fn<(form: FormData) => Promise<void>>(async () => {}),
    ...overrides,
  };
}

/* Tool results are JSON by contract, and these assertions walk into them
   several levels deep. Typing the walk would restate `results.ts` inside the
   suite, so a shape change would fail as a type error rather than as the
   assertion that names what actually broke. This is the one place that is
   worth it. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function payload(result: ToolResult): any {
  expect(result.content).toHaveLength(1);
  expect(result.content[0]!.type).toBe("text");
  return JSON.parse(result.content[0]!.text);
}

describe("reads answer from exact projection state", () => {
  it("reports Standing and says what can change it", () => {
    const body = payload(inspectProblem(environment()));
    expect(body.ok).toBe(true);
    expect(body.current_result.claim_id).toBe(CLAIM);
    expect(body.current_result.standing).toBe("accepted");
    expect(body.standing_note).toContain("authorised, attributed Decision");
    expect(body.exact_roots.projection_release).toBe(ROOT);
  });

  it("distinguishes an absent Result from an unruled one", () => {
    const body = payload(inspectProblem(environment({
      problem: context({ claims: [], current_claim_id: null }),
    })));
    expect(body.current_result).toBeNull();
    expect(body.standing_note).toContain("nothing for an authority to have ruled on");
  });

  it("carries each Verification's does_not_establish rather than a verdict", () => {
    const body = payload(inspectClaim(environment(), {}));
    const [lineage] = body.lineages;
    expect(lineage.verifications).toHaveLength(1);
    expect(lineage.verifications[0].does_not_establish[0]).toContain("Standing");
    expect(body).not.toHaveProperty("verdict");
    expect(body).not.toHaveProperty("score");
    expect(body.reading_note).toContain("not summed into a verdict");
  });

  it("keeps source-reported flags out of the Standing field", () => {
    const body = payload(inspectClaim(environment({
      problem: context({ claims: [{ ...context().claims[0]!, contested: true }] }),
    }), {}));
    expect(body.claim.standing).toBe("accepted");
    expect(body.claim.source_flags.contested).toBe(true);
  });

  it("refuses an unknown Claim with a usable remedy", () => {
    const body = payload(inspectClaim(environment(), { claim_id: `vcl_${"9".repeat(64)}` }));
    expect(body.ok).toBe(false);
    expect(body.error).toBe("claim_not_found");
    expect(body.remedy).toContain("inspect_problem");
  });

  it("answers why a Standing holds with its decision and corrections", () => {
    const body = payload(inspectHistory(environment()));
    expect(body.chronology[0].decision.event_id).toBe("vev_15632b53fb7fd674");
    expect(body.chronology[0].decision.performer_class).toBe("agent");
    expect(body.corrections[0]).toMatchObject({ kind: "corrects", successor_claim_id: CLAIM });
  });
});

describe("writes require an attributed account", () => {
  const cases = [
    ["accounts_unavailable", { accountsEnabled: false, signedIn: false, workspaceId: null }],
    ["not_signed_in", { accountsEnabled: true, signedIn: false, workspaceId: null }],
    ["no_workspace", { accountsEnabled: true, signedIn: true, workspaceId: null }],
  ] as const;

  for (const [error, work] of cases) {
    it(`refuses open_approach with ${error}`, async () => {
      const body = payload(await openApproach(environment({ work }), {
        title: "t", summary: "s", attempt_title: "a",
      }));
      expect(body.ok).toBe(false);
      expect(body.error).toBe(error);
      expect(body.remedy.length).toBeGreaterThan(0);
    });
  }
});

describe("writes reach the same Server Actions the human forms post to", () => {
  it("sends the anchor root and an idempotency key with every approach", async () => {
    const actions = spyActions();
    await openApproach(environment({
      actions,
      readActivity: async () => ({
        ...EMPTY_ACTIVITY,
        approaches: [{ id: "app_1", title: "Bound the extremal size", version: 1 }],
        attempts: [{ id: "att_1", approachId: "app_1", title: "Replay the Lean build", state: "planned" }],
      }),
    }), { title: "Bound the extremal size", summary: "s", attempt_title: "Replay the Lean build" });

    const form = vi.mocked(actions.createApproach).mock.calls[0]![0];
    expect(form.get("expectedAnchorRoot")).toBe(`sha256:${"d".repeat(64)}`);
    expect(form.get("idempotencyKey")).toBe("idem-fixed");
    expect(form.get("repository")).toBe("math");
    expect(form.get("problem")).toBe("321");
    expect(form.get("workspaceId")).toBe("ws_1");
  });

  it("records the rationale beside the artifact, not only the root", async () => {
    const actions = spyActions();
    const body = payload(await attachEvidence(environment({ actions }), {
      attempt_id: "att_1",
      kind: "lean-declaration",
      path: "Erdos321.lean",
      content_root: `sha256:${"7".repeat(64)}`,
      rationale: "This declaration typechecks at the retained revision.",
    }));
    expect(actions.attachArtifact).toHaveBeenCalledTimes(1);
    const note = vi.mocked(actions.addDiscussion).mock.calls[0]![0];
    expect(note.get("body")).toContain("typechecks");
    expect(body.standing_changed).toBe(false);
    expect(body.authority_effect).toBe("none");
  });
});

describe("a prepared Submission is a candidate, never a Decision", () => {
  it("returns unsigned, with Standing unchanged and the handoff spelled out", async () => {
    const body = payload(await prepareSubmission(environment({
      readActivity: async () => ({
        ...EMPTY_ACTIVITY,
        drafts: [{ id: "draft_1", payloadRoot: `sha256:${"8".repeat(64)}`, version: 1, createdAt: "2026-08-26T00:00:00Z" }],
      }),
    }), {
      actor_id: "agent:demo", public_key_hex: "0".repeat(64),
      requested_change: "correct_claim", assertion: "x", claim_type: "computational",
      caveat: "c", replayability: "exact", check_method: "lake build",
      check_outcome: "pass", verification_requirement: "v", evidence_artifact_id: "art_1",
    }));
    expect(body.ok).toBe(true);
    expect(body.signing_state).toBe("unsigned");
    expect(body.server_held_key).toBe(false);
    expect(body.standing_changed).toBe(false);
    expect(body.standing_after_this_call).toBe("accepted");
    expect(body.target_claim.standing_before).toBe("accepted");
    expect(body.what_happens_next.join(" ")).toContain("sign it locally");
  });

  it("refuses to target a Claim that does not exist", async () => {
    const body = payload(await prepareSubmission(environment({
      problem: context({ claims: [], current_claim_id: null }),
    }), {
      actor_id: "agent:demo", public_key_hex: "0".repeat(64),
      requested_change: "retract_claim", assertion: "x", claim_type: "computational",
      caveat: "c", replayability: "exact", check_method: "m",
      check_outcome: "pass", verification_requirement: "v", evidence_artifact_id: "art_1",
    }));
    expect(body.ok).toBe(false);
    expect(body.error).toBe("no_target_claim");
  });

  it("turns a refused mutation into a remedy rather than a thrown error", async () => {
    const body = payload(await prepareSubmission(environment({
      actions: spyActions({
        saveSubmissionDraft: vi.fn<(form: FormData) => Promise<void>>(async () => {
          throw new Error("NEXT_REDIRECT;replace;/x");
        }),
      }),
    }), {
      actor_id: "agent:demo", public_key_hex: "0".repeat(64),
      requested_change: "add_claim", assertion: "x", claim_type: "computational",
      caveat: "c", replayability: "exact", check_method: "m",
      check_outcome: "pass", verification_requirement: "v", evidence_artifact_id: "art_1",
    }));
    expect(body.ok).toBe(false);
    expect(body.detail).toContain("exact Problem state moved");
    expect(body.remedy).toContain("attach_evidence");
  });

  it("reports candidates as pending against unchanged Standing", async () => {
    const body = payload(await inspectCandidate(environment({
      readActivity: async () => ({
        ...EMPTY_ACTIVITY,
        drafts: [{ id: "draft_1", payloadRoot: `sha256:${"8".repeat(64)}`, version: 1, createdAt: "2026-08-26T00:00:00Z" }],
      }),
    }), {}));
    expect(body.candidates[0].signing_state).toBe("unsigned");
    expect(body.candidates[0].export_href).toContain("/drafts/draft_1/export");
    expect(body.current_standing.standing).toBe("accepted");
    expect(body.boundary_note).toContain("candidates, not Decisions");
  });
});
