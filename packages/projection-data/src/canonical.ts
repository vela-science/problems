import { createHash } from "node:crypto";

export type HashRoot = `sha256:${string}`;

/*
  vela's Rust canonicalizer (vela_protocol::canonical) is the definition; this
  is a conforming implementation, kept because the projection derives roots
  in-process. tests/canonical.test.ts pins it to the protocol's own vectors,
  vendored at config/canonical-hashing.v2.json. Edit neither without the other.
*/

/*
  JSON.stringify silently rewrites four inputs the doctrine requires to fail
  before hashing: NaN and Infinity become null, an unsafe integer is rounded to
  its nearest double, an undefined property vanishes from the preimage
  entirely, and an undefined array element becomes null. Each would mint a root
  over bytes nobody wrote, so canonicalize refuses them here rather than
  letting the two other implementations disagree with this one downstream.
*/
class CanonicalJsonError extends Error {
  constructor(message: string) {
    super(`RFC 8785 canonicalization: ${message}`);
    this.name = "CanonicalJsonError";
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    const input = value as Record<string, unknown>;
    return Object.keys(input).sort().reduce<Record<string, unknown>>((output, key) => {
      output[key] = canonicalize(input[key]);
      return output;
    }, {});
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new CanonicalJsonError(`${value} is not a finite number`);
    }
    if (Number.isInteger(value) && !Number.isSafeInteger(value)) {
      throw new CanonicalJsonError(
        `${value} is outside the I-JSON interoperable integer range`,
      );
    }
    return value;
  }
  if (value === undefined) {
    throw new CanonicalJsonError("undefined has no JSON encoding");
  }
  if (typeof value === "bigint" || typeof value === "symbol" || typeof value === "function") {
    throw new CanonicalJsonError(`${typeof value} has no JSON encoding`);
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value: string | Uint8Array): HashRoot {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}
