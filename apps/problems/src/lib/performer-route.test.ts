import { describe, expect, it } from "vitest";
import { performerIdFromSegment, performerProfileSegment } from "./performer-route";

describe("public performer routes", () => {
  it("round-trips exact human, agent, organization, and Unicode identities", () => {
    for (const identity of [
      "human:ada-lovelace",
      "agent:canopus-local",
      "organization:Institut des hautes études scientifiques",
      "did:key:z6Mkw/example",
    ]) {
      const segment = performerProfileSegment(identity);
      expect(segment).toMatch(/^p-[A-Za-z0-9_-]+$/u);
      expect(performerIdFromSegment(segment)).toBe(identity);
    }
  });

  it("fails closed on malformed, empty, and oversized performer routes", () => {
    for (const segment of ["", "p-", "p-not+url-safe", `p-${"a".repeat(801)}`, "regular-handle"]) {
      expect(performerIdFromSegment(segment)).toBeNull();
    }
  });
});
