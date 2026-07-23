import { describe, expect, test } from "bun:test";
import { linuxReleaseAssetUrl, loadVelaReleaseRecord } from "./install-recorded-vela.mjs";

describe("recorded Vela installer", () => {
  test("derives the Linux asset and both integrity checks from one release record", () => {
    const release = loadVelaReleaseRecord();
    expect(release.version).toBe("0.914.0");
    expect(release.tag).toBe("v0.914.0");
    expect(release.linux_archive_sha256).toBe("sha256:c04338e952aae0fe52727be0dc4207854a4094e51147f6f86e9c3865aedb1556");
    expect(release.generator_binary_sha256).toBe("sha256:29a351f0840d36beaa10156167a42de9ca1652d2a3c8953f1145725f3ada3470");
    expect(linuxReleaseAssetUrl(release)).toBe("https://github.com/vela-science/vela/releases/download/v0.914.0/vela-linux-x86_64.tar.gz");
  });
});
