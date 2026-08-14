import { describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalJson, sha256 } from "../src/canonical";

/*
  config/canonical-hashing.v2.json is a byte copy of
  ~/personal/vela/conformance/canonical-hashing.json, vendored because CI
  cannot reach that repository.

  The pin below is one-directional, and reading it as two is how it would fail
  quietly. The first test hashes the vendored bytes and compares them to
  `vendoredDigest`, so an edit to the copy in this repository is caught. An edit
  upstream is not: CI cannot reach that repository, which is the reason for
  vendoring and also the reason nothing here can notice upstream moving. This
  comment used to say the test "fails if either copy drifts", which named a
  guard in the one direction it does not have.

  Both copies hash to the value below as of 2026-08-07, recomputed from the
  sibling checkout. Closing the other direction needs a check that runs where
  both trees exist, not another assertion here.
*/
const vendoredDigest = "c829cb02bec6948ed530f01329826c76d7dc180f0c03c1f24b061ded9609237e";
const vectorPath = resolve(import.meta.dirname, "../config/canonical-hashing.v2.json");
const vectorBytes = readFileSync(vectorPath);
const vectorFile = JSON.parse(vectorBytes.toString("utf8")) as {
  schema: string;
  format_id: string;
  vectors: Array<{ name: string; input: unknown; canonical: string; sha256: string }>;
};

describe("canonical hashing conforms to the protocol vectors", () => {
  it("carries the vendored vector file unmodified", () => {
    expect(createHash("sha256").update(vectorBytes).digest("hex")).toBe(vendoredDigest);
    expect(vectorFile.schema).toBe("vela.canonical-hashing.v2");
    expect(vectorFile.format_id).toBe("RFC8785");
    expect(vectorFile.vectors.length).toBeGreaterThan(0);
  });

  /* Both the bytes and the digest, as conformance/verify_canonical_hashing.py
     does. A digest-only assertion would let a byte-level divergence hide. */
  for (const vector of vectorFile.vectors) {
    it(`reproduces exact bytes and root: ${vector.name}`, () => {
      const canonical = canonicalJson(vector.input);
      expect(canonical).toBe(vector.canonical);
      expect(sha256(canonical)).toBe(`sha256:${vector.sha256}`);
    });
  }
});

describe("canonicalJson fails closed where JSON.stringify rewrites", () => {
  it("rejects non-finite numbers rather than encoding null", () => {
    expect(() => canonicalJson({ a: Number.NaN })).toThrow(/not a finite number/u);
    expect(() => canonicalJson({ a: Number.POSITIVE_INFINITY })).toThrow(/not a finite number/u);
    expect(() => canonicalJson([Number.NEGATIVE_INFINITY])).toThrow(/not a finite number/u);
  });

  it("rejects integers outside the interoperable range rather than rounding", () => {
    expect(() => canonicalJson({ n: 9007199254740993 })).toThrow(/interoperable integer range/u);
    expect(canonicalJson({ n: Number.MAX_SAFE_INTEGER })).toBe(`{"n":${Number.MAX_SAFE_INTEGER}}`);
  });

  it("rejects undefined rather than dropping the key from the preimage", () => {
    expect(() => canonicalJson({ a: undefined, b: 1 })).toThrow(/undefined has no JSON encoding/u);
    expect(() => canonicalJson([undefined])).toThrow(/undefined has no JSON encoding/u);
  });

  it("names the protocol rule for values JSON cannot carry", () => {
    expect(() => canonicalJson({ n: 1n })).toThrow(/bigint has no JSON encoding/u);
    expect(() => canonicalJson({ f: () => 1 })).toThrow(/function has no JSON encoding/u);
    expect(() => canonicalJson({ s: Symbol("s") })).toThrow(/symbol has no JSON encoding/u);
  });

  it("still accepts the shapes the projection actually mints over", () => {
    expect(canonicalJson({ b: null, a: [], c: {} })).toBe('{"a":[],"b":null,"c":{}}');
    expect(canonicalJson({ ratio: 1.5, score: 1.0 })).toBe('{"ratio":1.5,"score":1}');
  });
});
