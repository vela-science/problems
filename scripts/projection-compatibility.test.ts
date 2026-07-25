import { describe, expect, test } from "bun:test";
import {
  assertProjectionCompatibility,
  inspectProjectionCompatibility,
} from "./projection-compatibility.mjs";

describe("projection compatibility", () => {
  test("accepts a projection at the expected release", () => {
    expect(inspectProjectionCompatibility("vela 0.930.0", "0.930.0").compatible).toBe(true);
  });

  test("accepts a projection between the floor and the expected release", () => {
    const report = inspectProjectionCompatibility("vela 0.915.1", "0.930.0");
    expect(report.compatible).toBe(true);
    expect(report.belowFloor).toBe(false);
  });

  test("accepts the floor itself", () => {
    expect(inspectProjectionCompatibility("vela 0.914.0", "0.930.0").compatible).toBe(true);
  });

  test("rejects a projection below the declared floor", () => {
    const report = inspectProjectionCompatibility("vela 0.913.9", "0.930.0");
    expect(report.compatible).toBe(false);
    expect(report.belowFloor).toBe(true);
  });

  test("rejects a projection ahead of the release the site is built from", () => {
    const report = inspectProjectionCompatibility("vela 0.931.0", "0.930.0");
    expect(report.compatible).toBe(false);
    expect(report.aheadOfRelease).toBe(true);
  });

  test("treats a prerelease as earlier than its release", () => {
    // 0.930.0-rc.6 precedes 0.930.0, so a 0.930.0 projection is ahead of it.
    expect(inspectProjectionCompatibility("vela 0.930.0", "0.930.0-rc.6").aheadOfRelease).toBe(true);
    expect(inspectProjectionCompatibility("vela 0.930.0-rc.6", "0.930.0").compatible).toBe(true);
  });

  test("tolerates a missing vela prefix", () => {
    expect(inspectProjectionCompatibility("0.915.1", "0.930.0").compatible).toBe(true);
  });

  test("assert names the reason it failed", () => {
    expect(() => assertProjectionCompatibility("vela 0.900.0", "0.930.0")).toThrow(/predates the minimum/u);
    expect(() => assertProjectionCompatibility("vela 0.999.0", "0.930.0")).toThrow(/ahead of the expected/u);
  });
});
