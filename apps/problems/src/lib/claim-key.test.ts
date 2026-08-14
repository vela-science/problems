import { describe, expect, test } from "vitest";
import { claimKey } from "./claim-key";

/* Every fixture below is a retained assertion from the current release, quoted
   rather than paraphrased, because the contract this file asserts is that the
   key is a substring of the record and not a rendering of it. */

describe("claimKey", () => {
  test("leads a quantum-codes Claim with its stabilizer parameters", () => {
    const assertion =
      "The Steane code [[7,1,3]] (CSS from the [7,4,3] Hamming code) encodes 1 logical qubit in 7 physical qubits with distance 3, verified from its six stabilizer generators.";
    expect(claimKey({ assertion })).toEqual({ value: "[[7,1,3]]", kind: "stabilizer" });
  });

  test("agrees with the n, k and d the conditions record separately", () => {
    /* The assertion writes the triple and the conditions write the same three
       numbers as fields. If the recogniser ever starts reading the classical
       base code, or a qubit count out of the prose, these two disagree. */
    const assertion =
      "The [[4,2,2]] code with stabilizers XXXX, ZZZZ encodes 2 logical qubits in 4 physical qubits with distance 2, verified by exact recomputation of k and d.";
    const conditions = ["family:detection_code; n:4; k:2; d:2; verifier:frozen_pauli_enumeration"];
    const key = claimKey({ assertion, conditions });
    const fields = Object.fromEntries(
      conditions[0]!.split(";").map((entry) => entry.trim().split(":") as [string, string]),
    );
    expect(key?.value).toBe(`[[${fields.n},${fields.k},${fields.d}]]`);
  });

  test("leads a sidon-sets Claim with the bound, not the sequence term alone", () => {
    const assertion =
      "OEIS A309370 a(24) >= 7179: a Sidon set of 7179 distinct binary vectors in {0,1}^24 under componentwise integer addition, with all pairwise sums distinct.";
    expect(claimKey({ assertion })).toEqual({ value: "a(24) >= 7179", kind: "sequence-bound" });
  });

  test("leads an erdos Claim with its problem number", () => {
    const assertion = "Erdős Problem #1125: declared status 'proved'. Formalized: no. Prize: no. Tags: analysis.";
    expect(claimKey({ assertion })).toEqual({ value: "#1125", kind: "erdos-problem" });
  });

  test("does not read a pull-request number as a problem number", () => {
    const assertion =
      "At Formal Conjectures PR #4578 commit a3b9c2fef2e5c6dbe1652642c7429abdfbd21c5b, the exact Erdős 521 declaration is statement-equivalent to the Claim at lean-proofs commit 4f915a3.";
    expect(claimKey({ assertion })?.kind).not.toBe("erdos-problem");
  });

  test("leads a formal-conjectures Claim with the Lean declaration", () => {
    const assertion =
      "At Formal Conjectures commit 85f863718beeec7b58a3a1926ee92e3472bc2020, the exact Erdos835.property_iff_chromaticNumber declaration admits the retained sorry-free Lean proof term sha256:5653096.";
    expect(claimKey({ assertion })).toEqual({
      value: "Erdos835.property_iff_chromaticNumber",
      kind: "lean-declaration",
    });
  });

  test("prefers the backticked declaration over anything else dotted in the sentence", () => {
    const assertion =
      "The Lean 4 theorem `Erdos257.erdos_257.variants.tsum_top_eq` is proven and kernel-verified under Lean 4.27.0, mathlib a3a10db0.";
    expect(claimKey({ assertion })?.value).toBe("Erdos257.erdos_257.variants.tsum_top_eq");
  });

  test("does not read a hostname or a source filename as a declaration", () => {
    const assertion =
      "Hosted Lean proof: jayyhk proof of 502 (state complete) https://github.com/Jayyhk/erdos-lean/blob/main/problems/502/Erdos502.lean.";
    expect(claimKey({ assertion })).toBeNull();
  });

  test("returns every key verbatim from the text it was read out of", () => {
    const cases = [
      "The perfect five-qubit code [[5,1,3]] (cyclic stabilizers XZZXI and rotations) encodes 1 logical qubit in 5 physical qubits with distance 3, and is optimal at its length.",
      "OEIS A309370 a(16) >= 505: a Sidon set of 505 distinct binary vectors in {0,1}^16.",
      "Erdős #12: the good example (Erdos12.isGood_example). Kernel-clean Lean proof.",
    ];
    for (const assertion of cases) {
      const key = claimKey({ assertion });
      expect(assertion).toContain(key?.value);
    }
  });

  test("recovers nothing rather than something when the notation is absent", () => {
    expect(claimKey({
      assertion: "Ruzsa covering lemma: if |A+B| <= K|A|, then B is contained in the sumset A - A translated by at most K elements.",
    })).toBeNull();
  });
});
