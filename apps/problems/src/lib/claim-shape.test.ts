import { describe, expect, test } from "vitest";
import { parseCodeParameters, parseSweepWindow, sweepFamily } from "./claim-shape";

/* The retained assertions, verbatim from the projection at release 0.966.2.
 *
 * They are pinned here rather than sampled, because the sentence is the only
 * place these integers exist and the wording belongs to the Vela producer
 * rather than to this repository. If a future release rewords a clause, this
 * file fails and names the row, instead of ProposalSweep silently ceasing to
 * render on the one Repository that has structure to show. */
const ERDOS_1056 = [
  {
    proposal_id: "vpr_eca7e122d1ce6e52",
    status: "accepted",
    claim: "An exhaustive bounded search of the 15 primes in the inclusive range 10430201..10430400 found no k=15 witness; the maximum multiplicity observed was 11 at p=10430281, residue 1529895.",
    expected: { lo: 10430201, hi: 10430400, primes: 15, multiplicity: 11, argmax: 10430281, residue: 1529895 },
  },
  {
    proposal_id: "vpr_96578d006119b322",
    status: "accepted",
    claim: "An exhaustive bounded search of the 11 primes in the inclusive range 10430001..10430200 found no k=15 witness; the maximum multiplicity observed was 11 at p=10430171, residue 4302968.",
    expected: { lo: 10430001, hi: 10430200, primes: 11, multiplicity: 11, argmax: 10430171, residue: 4302968 },
  },
  {
    proposal_id: "vpr_148c88da4d5579a9",
    status: "accepted",
    claim: "An exhaustive bounded search of the 12 primes in the inclusive range 10429801..10430000 found no k=15 witness; the maximum multiplicity observed was 11 at p=10429973, residue 7723031.",
    expected: { lo: 10429801, hi: 10430000, primes: 12, multiplicity: 11, argmax: 10429973, residue: 7723031 },
  },
  {
    proposal_id: "vpr_27bce8983810f3bd",
    status: "accepted",
    claim: "An exhaustive bounded search of the 13 primes in the inclusive range 10429601..10429800 found no k=15 witness; the maximum multiplicity observed was 11 at p=10429717, residue 2060465.",
    expected: { lo: 10429601, hi: 10429800, primes: 13, multiplicity: 11, argmax: 10429717, residue: 2060465 },
  },
  {
    /* The rejected duplicate of vpr_96578d006119b322. It states the same
       window in different words, and it is the only row on any Repository that
       makes the figure show one window proposed twice. */
    proposal_id: "vpr_b4a4b9ea9c00d6e9",
    status: "rejected",
    claim: "Computed the bounded Erdős 1056 k=15 search over primes in 10430001..10430200 and produced a complete negative-range candidate artifact: 11 primes tested, maximum multiplicity 11 at p=10430171 with residue 4302968.",
    expected: { lo: 10430001, hi: 10430200, primes: 11, multiplicity: 11, argmax: 10430171, residue: 4302968 },
  },
  {
    proposal_id: "vpr_4fa1a06ca64e36e4",
    status: "accepted",
    claim: "An exhaustive bounded search of the 15 primes in the inclusive range 10430601..10430800 found no k=15 witness; the maximum multiplicity observed was 11 at p=10430729, residue 5661996.",
    expected: { lo: 10430601, hi: 10430800, primes: 15, multiplicity: 11, argmax: 10430729, residue: 5661996 },
  },
  {
    proposal_id: "vpr_635f1e6c1811f48c",
    status: "accepted",
    claim: "An exhaustive bounded search of the 13 primes in the inclusive range 10430401..10430600 found no k=15 witness; the maximum multiplicity observed was 11 at p=10430491, residue 4382886.",
    expected: { lo: 10430401, hi: 10430600, primes: 13, multiplicity: 11, argmax: 10430491, residue: 4382886 },
  },
];

const QUANTUM_CLAIM = "The nine Pauli generators in witness sha256:f23ac24e932de13538ac842bc2a467648aa82628577cffff6c71411e59a06a3c define a ten-qubit stabilizer with rank 9 and exact logical distance 4 under exhaustive binary-symplectic centralizer reconstruction; therefore an explicit [[10,1,4]] stabilizer code exists.";

/* Assertions on the same Repositories that state mathematics of another shape.
   None of them may enter the family. */
const OUT_OF_FAMILY = [
  "The pinned 307-tile chordal certificate family cannot cover Z^2.",
  "At Formal Conjectures commit e6d6b867dc85eec2f88bc47496b4314c623f9f92, the retained Lean artifact completes Erdos264.erdos_264.parts.i with its exact source signature unchanged, establishing not IsIrrationalitySequence (2 ^ ·) under that commit’s corrected integer-valued perturbation definition.",
  QUANTUM_CLAIM,
];

describe("sweep window", () => {
  test.each(ERDOS_1056)("$proposal_id parses to its stated integers", ({ claim, expected }) => {
    expect(parseSweepWindow(claim)).toMatchObject(expected);
  });

  test("carries the sentence it read", () => {
    const window = parseSweepWindow(ERDOS_1056[0]!.claim);
    expect(window?.source).toBe(ERDOS_1056[0]!.claim);
  });

  test.each(OUT_OF_FAMILY)("an assertion of another shape does not parse", (claim) => {
    expect(parseSweepWindow(claim)).toBeNull();
  });

  test("a missing group discards the whole row", () => {
    /* The residue clause dropped. Five of six values are still present and a
       tolerant parser would happily draw this rect; a partial parse is no
       parse, so nothing is returned. */
    const malformed = "An exhaustive bounded search of the 13 primes in the inclusive range 10429601..10429800 found no k=15 witness; the maximum multiplicity observed was 11 at p=10429717.";
    expect(parseSweepWindow(malformed)).toBeNull();
  });

  test("an interval that does not run forward is not a window", () => {
    const reversed = "An exhaustive bounded search of the 13 primes in the inclusive range 10429800..10429601 found no k=15 witness; the maximum multiplicity observed was 11 at p=10429717, residue 2060465.";
    expect(parseSweepWindow(reversed)).toBeNull();
  });
});

describe("sweep family", () => {
  const reviews = [
    ...ERDOS_1056.map(({ proposal_id, status, claim }) => ({ proposal_id, status, claim })),
    ...OUT_OF_FAMILY.map((claim, index) => ({ proposal_id: `vpr_other_${index}`, status: "accepted", claim })),
  ];

  test("holds only the rows whose shape was read", () => {
    const family = sweepFamily(reviews);
    expect(family.windows).toHaveLength(7);
    expect(family.partial).toBe(0);
  });

  test("orders by the interval swept", () => {
    const family = sweepFamily(reviews);
    expect(family.windows.map((window) => window.lo)).toEqual([
      10429601, 10429801, 10430001, 10430001, 10430201, 10430401, 10430601,
    ]);
  });

  test("keeps both Proposals over the window proposed twice", () => {
    const family = sweepFamily(reviews);
    const twice = family.windows.filter((window) => window.lo === 10430001);
    expect(twice.map((window) => window.status).sort()).toEqual(["accepted", "rejected"]);
  });

  test("counts a row that states a scan it could not be read from", () => {
    const family = sweepFamily([
      ...reviews,
      {
        proposal_id: "vpr_reworded",
        status: "accepted",
        claim: "An exhaustive bounded search of the 13 primes in the inclusive range [10430801, 10431000] found no k=15 witness; the maximum multiplicity observed was 11 at p=10430873, residue 90210.",
      },
    ]);
    expect(family.windows).toHaveLength(7);
    expect(family.partial).toBe(1);
  });
});

describe("code parameters", () => {
  test("reads the stabilizer code's own notation", () => {
    expect(parseCodeParameters(QUANTUM_CLAIM)).toMatchObject({ n: 10, k: 1, d: 4 });
  });

  test("an assertion without the notation yields nothing", () => {
    expect(parseCodeParameters(ERDOS_1056[0]!.claim)).toBeNull();
  });
});
