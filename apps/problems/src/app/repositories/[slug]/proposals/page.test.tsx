import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

/* Fixtures shaped after the retained rows: an accepted sweep window, the
   rejected duplicate of another window, and a withdrawal with no evidence. */
function review(overrides: Record<string, unknown>) {
  return {
    proposal_id: "vpr_fixture",
    status: "accepted",
    kind: "claim.add",
    target: "vcl_fixture",
    claim: "A bounded assertion.",
    content_root: `sha256:${"a".repeat(64)}`,
    receipt_root: null,
    created_at: "2026-07-30T14:50:53Z",
    reviewed_at: "2026-08-04T13:17:38Z",
    reviewed_by: "local:device-sha256:67fbb8e56377e6868e9f941524e0bf39cfb4fd2a4bfdd25c2edb93fc82f86213|uid:501",
    decision_event_id: "vev_fixture",
    decision_plan_root: null,
    decision_provenance: "signed_record",
    applied_event_id: "vev_applied",
    decision_reason: "Accept the exact bounded negative result.",
    producer_package: { producer_actor: "agent:codex", submitted_at: null, verification_requirements: [], artifacts: [], caveats: [], replayability: "exact", requested_change_kind: "add_claim" },
    verification_records: [],
    ...overrides,
  };
}

function sweep(lo: number, hi: number, primes: number, p: number, residue: number) {
  return `An exhaustive bounded search of the ${primes} primes in the inclusive range ${lo}..${hi} found no k=15 witness; the maximum multiplicity observed was 11 at p=${p}, residue ${residue}.`;
}

function passing(id: string, extra: Record<string, unknown> = {}) {
  return {
    verification_record_id: id,
    verification_root: `sha256:${"f".repeat(64)}`,
    outcome: "pass",
    verifier_actor: "verifier:replay",
    completed_at: "2026-07-30T15:05:50Z",
    started_at: "2026-07-30T15:00:00Z",
    property: "Replay the retained artifact byte for byte.",
    does_not_establish: ["Universal nonexistence.", "Scientific acceptance."],
    verifier_profile: "erdos1056-bounded-search-replay-v1",
    independent_of: ["agent:codex"],
    ...extra,
  };
}

const ERDOS = [
  review({ proposal_id: "vpr_w1", claim: sweep(10429601, 10429800, 13, 10429717, 2060465), reviewed_at: "2026-08-04T13:17:38Z", verification_records: [passing("vvr_1"), passing("vvr_2", { independent_of: [] })] }),
  review({ proposal_id: "vpr_w2", claim: sweep(10429801, 10430000, 12, 10429973, 7723031), reviewed_at: "2026-08-04T13:18:59Z", verification_records: [passing("vvr_3")] }),
  review({ proposal_id: "vpr_w3", claim: sweep(10430001, 10430200, 11, 10430171, 4302968), reviewed_at: "2026-08-04T13:38:45Z", verification_records: [passing("vvr_4")] }),
  review({
    proposal_id: "vpr_dup",
    status: "rejected",
    claim: "Computed the bounded Erdős 1056 k=15 search over primes in 10430001..10430200 and produced a complete negative-range candidate artifact: 11 primes tested, maximum multiplicity 11 at p=10430171 with residue 4302968.",
    reviewed_at: "2026-08-04T13:16:06Z",
    verification_records: [passing("vvr_5")],
  }),
  review({
    proposal_id: "vpr_gone",
    status: "withdrawn",
    claim: "A byte-equivalent retry of an already committed Submission.",
    decision_provenance: "producer_withdrawal",
    reviewed_by: "agent:codex",
    applied_event_id: null,
    decision_event_id: null,
    reviewed_at: "2026-08-03T13:26:47Z",
    verification_records: [],
  }),
];

const REPOSITORIES: Record<string, unknown> = {
  erdos: {
    slug: "erdos",
    status: { repository: { name: "Erdős" }, counts: { accepted_claims: 2782, pending_review: 0 } },
    reviews: ERDOS,
  },
  "quantum-codes": {
    slug: "quantum-codes",
    status: { repository: { name: "Quantum codes" }, counts: { accepted_claims: 5, pending_review: 0 } },
    reviews: [review({ proposal_id: "vpr_qc", claim: "An explicit [[10,1,4]] stabilizer code exists.", verification_records: [passing("vvr_q1"), passing("vvr_q2")] })],
  },
  "sidon-sets": {
    slug: "sidon-sets",
    status: { repository: { name: "Sidon sets" }, counts: { accepted_claims: 40, pending_review: 0 } },
    reviews: [],
  },
};

const permanentRedirect = vi.fn((href: string) => { throw new Error(`REDIRECT ${href}`); });

vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NOT_FOUND"); },
  permanentRedirect: (href: string) => permanentRedirect(href),
}));

/* Only the readers are replaced. `verificationCore` is a pure derivation over
   the fixture's own records, so the page under test runs the real one. */
vi.mock("@vela/projection-data", async (importOriginal) => ({
  ...await importOriginal<typeof import("@vela/projection-data")>(),
  allRepositories: async () => Object.values(REPOSITORIES),
  repositoryBySlug: async (slug: string) => REPOSITORIES[slug],
}));

import ProposalsPage from "./page";

async function render(slug: string, searchParams: Record<string, string> = {}) {
  return renderToStaticMarkup(await ProposalsPage({
    params: Promise.resolve({ slug }),
    searchParams: Promise.resolve(searchParams),
  } as never));
}

describe("proposal ledger", () => {
  test("the toolbar counts the rows it sits beside", async () => {
    const html = await render("erdos");
    expect(html).toContain("5 proposed changes · 5 Checks · none pending");
  });

  test("every row is in server HTML with its evidence and its timings", async () => {
    const html = await render("erdos");
    for (const entry of ERDOS) expect(html).toContain(entry.proposal_id);
    /* One verifier on vpr_w1 declared no independence; reporting only the
       union of declared actors would erase it. */
    expect(html).toContain("declared independent of agent:codex on 1 of 2 records");
    expect(html).toContain("4 stated limits");
    expect(html).toContain("first pass reported in");
    expect(html).toContain("Decision recorded in");
  });

  test("a withdrawal says it carries no Verification Record", async () => {
    const html = await render("erdos");
    expect(html).toContain("No Verification Record is retained.");
    const withdrawn = html.slice(html.indexOf("Producer withdrawal"));
    expect(withdrawn).not.toContain("Human Decision");
    expect(withdrawn).not.toContain("Decision recorded in");
  });

  test("keeps the assertion as the only record-link name", async () => {
    const html = await render("erdos");
    const anchors = [...html.matchAll(/<a[^>]+href="\/repositories\/erdos\/proposals\/vpr_w1"[^>]*>(.*?)<\/a>/gu)]
      .map((match) => match[1] ?? "");
    const assertionLink = anchors.find((anchor) => anchor.includes("An exhaustive bounded search")) ?? "";
    expect(assertionLink).not.toBe("");
    expect(assertionLink).not.toContain("Verification");
    expect(assertionLink).not.toContain("Decision");
  });

  test("rows link to the record route rather than to a query", async () => {
    const html = await render("erdos");
    expect(html).toContain("/repositories/erdos/proposals/vpr_w1");
    expect(html).not.toContain("?proposal=");
  });

  test("the status filter offers only statuses that have rows", async () => {
    const html = await render("erdos");
    expect(html).toContain("status=accepted");
    expect(html).toContain("status=rejected");
    expect(html).toContain("status=withdrawn");
    expect(html).not.toContain("status=pending_review");
  });

  test("a status narrows the ledger and not the figure", async () => {
    const html = await render("erdos", { status: "rejected" });
    expect(html).toContain("vpr_dup");
    /* Only the withdrawal has no evidence, so its absence is the ledger's. The
       sweep still carries every window, because the family is a fact about the
       Repository rather than about the current filter. */
    expect(html).not.toContain("No Verification Record is retained.");
    expect(html).toContain("10429601..10429800");
  });

  test("one status renders no filter at all", async () => {
    const html = await render("quantum-codes");
    expect(html).toContain("1 proposed change · 2 Checks · none pending");
    expect(html).not.toContain("status=accepted");
  });

});

describe("the sweep", () => {
  test("renders where three or more Proposals parse into one family", async () => {
    const html = await render("erdos");
    expect(html).toContain("10429601..10429800");
    expect(html).toContain("Max multiplicity");
    /* The rect's extent decodes to the integers swept, so the axis carries the
       endpoints of the family and nothing between them. */
    expect(html).toContain(">10429601<");
    expect(html).toContain(">10430200<");
  });

  test("does not render where the repository has no family", async () => {
    const html = await render("quantum-codes");
    expect(html).not.toContain("Max multiplicity");
    expect(html).not.toContain("<figure");
  });
});

describe("the zero state", () => {
  test("is one Empty naming what does stand, and two routes out", async () => {
    const html = await render("sidon-sets");
    expect(html).toContain("No proposed change has been recorded on this repository.");
    expect(html).toContain("40 assertions have Local Standing in this Repository.");
    expect(html).toContain("/repositories/sidon-sets/claims");
    expect(html).toContain("/repositories/sidon-sets/reproduce");
    expect(html).not.toContain("Proposal ledger");
  });
});

/* `?proposal=` selected a Sheet and `?standing=` filtered the ledger, both
   before a Proposal had its own route and before `?status=` named this axis.
   Neither redirects any more; an unread key renders the ledger. */
describe("the retired selection queries", () => {
  test("no longer redirect", async () => {
    await expect(render("erdos", { proposal: "vpr_w1" })).resolves.toBeDefined();
    await expect(render("erdos", { standing: "rejected" })).resolves.toBeDefined();
  });
});
