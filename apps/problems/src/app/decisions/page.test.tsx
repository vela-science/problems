import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

/* Three rows off the same Repository: an accepted Proposal a named authority
   signed, a rejected one, and a Proposal its own producer took back. */
function review(overrides: Record<string, unknown>) {
  return {
    proposal_id: "vpr_accepted",
    status: "accepted",
    kind: "claim.add",
    target: "vcl_fixture",
    claim: "A bounded assertion.",
    created_at: "2026-07-30T14:50:53Z",
    reviewed_at: "2026-08-04T13:17:38Z",
    reviewed_by: "Ada Lovelace",
    decision_actor_class: "human",
    decision_session_ref: null,
    decision_authority_principal_id: "local:repository-authority",
    decision_event_id: "vev_fixture",
    decision_reason: "Accept the exact bounded negative result.",
    decision_provenance: "signed_record",
    verification_records: [],
    ...overrides,
  };
}

const REVIEWS = [
  review({}),
  review({
    proposal_id: "vpr_rejected",
    status: "rejected",
    claim: "A duplicate of an already committed window.",
    decision_reason: "Already committed under another Proposal.",
    reviewed_by: "agent:gpt-5.6-sol",
    decision_actor_class: "agent",
    decision_session_ref: "entire:checkpoint:01KZSESSION",
  }),
  review({
    proposal_id: "vpr_gone",
    status: "withdrawn",
    claim: "A byte-equivalent retry of an already committed Submission.",
    decision_provenance: "producer_withdrawal",
    decision_event_id: null,
    decision_reason: null,
    reviewed_by: "agent:codex",
    decision_actor_class: null,
    decision_authority_principal_id: null,
  }),
  review({ proposal_id: "vpr_open", status: "pending_review", decision_provenance: "pending", decision_event_id: null, decision_reason: null, reviewed_at: null, reviewed_by: null, decision_actor_class: null, decision_authority_principal_id: null }),
];

vi.mock("@vela/projection-data", async (importOriginal) => ({
  ...await importOriginal<typeof import("@vela/projection-data")>(),
  allRepositories: async () => [{
    slug: "erdos",
    status: { repository: { name: "Erdős" } },
    reviews: REVIEWS,
  }],
}));

import DecisionsPage from "./page";

/* The page reads searchParams now, so the tests supply them the way Next
   does — a promise of the resolved object. */
const html = async (query: Record<string, string> = {}) =>
  renderToStaticMarkup(await DecisionsPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve(query),
  } as never));

describe("the Decision stream", () => {
  test("carries only Proposals an authority ruled on", async () => {
    const markup = await html();
    expect(markup).toContain("vpr_accepted");
    expect(markup).toContain("vpr_rejected");
    expect(markup).not.toContain("vpr_open");
  });

  test("shows performer kind and session separately from Repository authority", async () => {
    const markup = await html();
    expect(markup).toContain("Human performer");
    expect(markup).toContain("Agent performer");
    expect(markup).toContain("entire:checkpoint:01KZSESSION");
    expect(markup).toContain("Repository authority local:repository-authority");
  });

  /* A withdrawal is the producer taking its own Proposal back. Listed on the
     authority rail it put the producer in the deciding actor's slot and said
     "No reason is retained with this Decision" under a Decision nobody made. */
  test("keeps a producer withdrawal off the authority rail and says who withdrew it", async () => {
    const markup = await html();
    expect(markup).toContain("Withdrawn by the producer. No repository authority ruled on it.");
    expect(markup.indexOf("vpr_gone")).toBeGreaterThan(markup.indexOf("vpr_rejected"));
    expect(markup).not.toContain("No reason is retained with this Decision");
  });

  /* The counts moved into the filter chips, where each is also the control that
     narrows to it. The summary keeps the two totals a reader wants without
     opening anything: how many rulings, and how many of them accepted. */
  test("counts the two dispositions an authority can record", async () => {
    const markup = await html();
    expect(markup).toContain("2 recorded");
    expect(markup).toContain("1 accepted");
    expect(markup).toMatch(/rejected <span[^>]*>1</u);
    expect(markup).toContain("1 withdrawn");
  });
});

describe("the Decision stream's controls", () => {
  /* The page had none over sixteen rows and 15,617 characters, so finding the
     one rejected ruling meant reading all of them. */
  test("offers a counted chip per status and per Repository", async () => {
    const markup = await html();
    expect(markup).toContain("/decisions?status=accepted");
    expect(markup).toContain("/decisions?repository=erdos");
  });

  test("narrows to the asked-for status and says it narrowed", async () => {
    const all = await html();
    const rejected = await html({ status: "rejected" });
    expect(all).toContain("vpr_accepted");
    expect(rejected).not.toContain("vpr_accepted");
    expect(rejected).toContain("of");
  });

  /* A value nothing carries must not become a filter that empties the page. */
  test("ignores a status no Decision carries", async () => {
    const markup = await html({ status: "not-a-status" });
    expect(markup).toContain("vpr_accepted");
  });
});
