import { describe, expect, test } from "bun:test";
import { velaRelease, velaReleaseSchema } from "../src/release";

/* The record is the only pin for the Vela CI installs, the docs vendoring
   reads, and the version the site advertises. Parsing it is not enough — the
   fields have to agree with each other, and nothing else asserts that now that
   the bespoke installer which used to is gone. */
describe("Vela release record", () => {
  test("names one release in all three places", () => {
    expect(velaRelease.tag).toBe(`v${velaRelease.version}`);
    expect(velaRelease.release_url).toEndWith(`/releases/tag/${velaRelease.tag}`);
  });

  test("rejects a tag that disagrees with the version", () => {
    const result = velaReleaseSchema.safeParse({ ...velaRelease, tag: "v0.0.1" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("tag must be the version with a leading v");
  });

  test("rejects a release URL pointing at another tag", () => {
    const result = velaReleaseSchema.safeParse({
      ...velaRelease,
      release_url: "https://github.com/vela-science/vela/releases/tag/v0.0.1",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "release_url must point at the tag this record names",
    );
  });
});
