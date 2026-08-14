import { describe, expect, test } from "bun:test";
import { localNeonFetchEndpoint } from "../src/neon-client";

describe("local Neon HTTP qualification endpoint", () => {
  test("is absent by default and accepts only explicit loopback /sql endpoints", () => {
    expect(localNeonFetchEndpoint({})).toBeUndefined();
    expect(localNeonFetchEndpoint({
      VELA_NEON_FETCH_ENDPOINT: "http://127.0.0.1:55440/sql",
    })).toBe("http://127.0.0.1:55440/sql");
    expect(localNeonFetchEndpoint({
      VELA_NEON_FETCH_ENDPOINT: "http://localhost:55440/sql",
    })).toBe("http://localhost:55440/sql");
  });

  test("rejects production, remote, credentialed, and widened endpoints", () => {
    expect(() => localNeonFetchEndpoint({
      VERCEL_ENV: "production",
      VELA_NEON_FETCH_ENDPOINT: "http://127.0.0.1:55440/sql",
    })).toThrow("forbidden in production");
    for (const value of [
      "https://example.test/sql",
      "http://user:secret@127.0.0.1:55440/sql",
      "http://127.0.0.1:55440/",
      "http://127.0.0.1:55440/sql?mode=test",
    ]) {
      expect(() => localNeonFetchEndpoint({ VELA_NEON_FETCH_ENDPOINT: value }))
        .toThrow("loopback HTTP /sql endpoint");
    }
  });
});
